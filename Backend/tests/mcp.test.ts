import type { AddressInfo } from "net";
import type { Server } from "http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ApiError, type Content, type GenerateContentResponse } from "@google/genai";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createMcpHttpApp } from "../src/mcp/httpServer";
import { createVacationMcpServer } from "../src/mcp/server";
import { resetMcpClient, setMcpTransportFactory } from "../src/mcp/client";
import { parseRegion, regionOf } from "../src/mcp/regions";
import { setGeminiClient } from "../src/services/ai/gemini";
import { setQuestionServiceDeps } from "../src/services/mcpQuestionService";
import { Like } from "../src/models/Like";
import { api, createUser, createVacation, startDatabase, stopDatabase } from "./helpers";

let httpServer: Server;
let mcpUrl: URL;

beforeAll(async () => {
  await startDatabase();
  const paris = await createVacation({ destination: "Paris, France", startOffset: -30, nights: 4, price: 2400 });
  await createVacation({ destination: "Kyoto, Japan", startOffset: -1, nights: 6, price: 3600 });
  await createVacation({ destination: "Rome, Italy", startOffset: 20, nights: 5, price: 1800 });
  await createVacation({ destination: "Maldives", startOffset: 40, nights: 7, price: 6900 });
  const user = await createUser();
  await Like.create({ userId: user.id, vacationId: paris._id });

  // Real Streamable HTTP MCP server on an ephemeral port; the backend's MCP client talks to it.
  httpServer = createMcpHttpApp().listen(0);
  await new Promise((resolve) => httpServer.once("listening", resolve));
  mcpUrl = new URL(`http://127.0.0.1:${(httpServer.address() as AddressInfo).port}/mcp`);
  setMcpTransportFactory(() => new StreamableHTTPClientTransport(mcpUrl));
});

afterAll(async () => {
  await resetMcpClient();
  await new Promise((resolve) => httpServer.close(resolve));
  await stopDatabase();
});

async function connectedClient() {
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(mcpUrl));
  return client;
}

const parse = (result: unknown) => JSON.parse(((result as CallToolResult).content[0] as { text: string }).text);

describe("MCP server tools", () => {
  it("connects over Streamable HTTP and lists all tools", async () => {
    const client = await connectedClient();
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name).sort()).toEqual([
      "get_vacation_details",
      "get_vacation_price",
      "get_vacation_statistics",
      "get_vacations_by_destination",
      "get_vacations_by_region",
      "list_vacations",
    ]);
    await client.close();
  });

  it("also works over an in-memory transport", async () => {
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const server = createVacationMcpServer();
    await server.connect(serverTransport);
    const client = new Client({ name: "test", version: "1.0.0" });
    await client.connect(clientTransport);
    const result = parse(await client.callTool({ name: "list_vacations", arguments: {} }));
    expect(result.count).toBe(4);
    await client.close();
  });

  it("returns real data from MongoDB", async () => {
    const client = await connectedClient();
    const stats = parse(await client.callTool({ name: "get_vacation_statistics", arguments: {} }));
    expect(stats).toMatchObject({
      totalVacations: 4,
      averagePrice: 3675,
      byStatus: { upcoming: 2, active: 1, past: 1 },
      cheapest: { destination: "Rome, Italy", price: 1800 },
      mostExpensive: { destination: "Maldives", price: 6900 },
      mostLiked: { destination: "Paris, France", likes: 1 },
    });

    const europe = parse(await client.callTool({ name: "get_vacations_by_region", arguments: { region: "europe" } }));
    expect(europe.vacations.map((v: { destination: string }) => v.destination)).toEqual(["Paris, France", "Rome, Italy"]);

    const price = parse(await client.callTool({ name: "get_vacation_price", arguments: { destination: "kyoto" } }));
    expect(price.prices).toEqual([expect.objectContaining({ destination: "Kyoto, Japan", price: 3600, currency: "USD" })]);

    const details = parse(await client.callTool({ name: "get_vacation_details", arguments: { destination: "Rome" } }));
    expect(details.vacations[0]).toMatchObject({ destination: "Rome, Italy", status: "upcoming", nights: 5 });

    const upcoming = parse(await client.callTool({ name: "list_vacations", arguments: { status: "upcoming", sortBy: "price" } }));
    expect(upcoming.vacations.map((v: { price: number }) => v.price)).toEqual([1800, 6900]);
    await client.close();
  });

  it("handles unknown regions and destinations safely", async () => {
    const client = await connectedClient();
    expect(parse(await client.callTool({ name: "get_vacations_by_region", arguments: { region: "Atlantis" } })).found).toBe(false);
    expect(parse(await client.callTool({ name: "get_vacation_price", arguments: { destination: "Narnia" } })).found).toBe(false);
    expect(parse(await client.callTool({ name: "get_vacation_details", arguments: { vacationId: "nope" } })).found).toBe(false);
    await client.close();
  });
});

describe("POST /api/mcp/ask (rules mode, real MCP calls over HTTP)", () => {
  async function ask(question: string) {
    const { token } = await createUser();
    return api().post("/api/mcp/ask").set("Authorization", `Bearer ${token}`).send({ question });
  }

  it.each([
    ["How many vacations are available?", "get_vacation_statistics", /There are 4 vacations/],
    ["What is the average vacation price?", "get_vacation_statistics", /\$3,675/],
    ["Which vacations are in Europe?", "get_vacations_by_region", /Paris, France[\s\S]*Rome, Italy/],
    ["Which vacation is cheapest?", "get_vacation_statistics", /Rome, Italy/],
    ["How much does the Kyoto trip cost?", "get_vacation_price", /\$3,600/],
    ["How many upcoming vacations are there?", "list_vacations", /2 upcoming/],
  ])("answers %s", async (question, tool, expected) => {
    const res = await ask(question);
    expect(res.status).toBe(200);
    expect(res.body.data.mode).toBe("rules");
    expect(res.body.data.toolCalls.map((call: { tool: string }) => call.tool)).toContain(tool);
    expect(res.body.data.answer).toMatch(expected);
  });

  it("responds helpfully to an unrelated question", async () => {
    const res = await ask("What is the meaning of life?");
    expect(res.status).toBe(200);
    expect(res.body.data.answer).toMatch(/not sure/i);
  });

  it("validates the question and requires the USER role", async () => {
    expect((await ask("")).status).toBe(400);
    const admin = await createUser("ADMIN");
    expect((await api().post("/api/mcp/ask").set("Authorization", `Bearer ${admin.token}`).send({ question: "How many?" })).status).toBe(403);
  });

  it("returns 503 when the MCP server is unreachable", async () => {
    setMcpTransportFactory(() => new StreamableHTTPClientTransport(new URL("http://127.0.0.1:1/mcp")));
    const res = await ask("How many vacations are available?");
    expect(res.status).toBe(503);
    setMcpTransportFactory(() => new StreamableHTTPClientTransport(mcpUrl));
  });
});

describe("POST /api/mcp/ask (AI mode: mocked Gemini picks tools, real MCP executes them)", () => {
  afterEach(() => {
    setQuestionServiceDeps({});
    setGeminiClient(undefined);
  });

  async function ask(question: string) {
    const { token } = await createUser();
    return api().post("/api/mcp/ask").set("Authorization", `Bearer ${token}`).send({ question });
  }

  it("executes the function calls Gemini requests through MCP and feeds real data back", async () => {
    setQuestionServiceDeps({ aiEnabled: true });
    const seen: Content[][] = [];
    const functionCall = { id: "call-1", name: "get_vacations_by_region", args: { region: "Europe" } };
    setGeminiClient({
      models: {
        generateContent: async (params) => {
          const contents = params.contents as Content[];
          seen.push(structuredClone(contents));
          if (seen.length === 1) {
            return {
              functionCalls: [functionCall],
              candidates: [{ content: { role: "model", parts: [{ functionCall, thoughtSignature: "sig" }] } }],
            } as unknown as GenerateContentResponse;
          }
          return { text: "Paris and Rome are our European trips.", candidates: [{ finishReason: "STOP" }] } as unknown as GenerateContentResponse;
        },
      },
    });

    const res = await ask("Which vacations are in Europe?");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      mode: "ai",
      model: "gemini-3.8-flash",
      answer: "Paris and Rome are our European trips.",
      toolCalls: [{ tool: "get_vacations_by_region", arguments: { region: "Europe" } }],
    });

    // The first request declared the MCP tools; the second carried the model turn verbatim plus the real MCP result.
    const second = seen[1] as Content[];
    expect(second[1]?.parts?.[0]?.thoughtSignature).toBe("sig");
    const functionResponse = second[2]?.parts?.[0]?.functionResponse;
    expect(functionResponse).toMatchObject({ id: "call-1", name: "get_vacations_by_region" });
    const output = (functionResponse?.response as { output: { vacations: Array<{ destination: string }> } }).output;
    expect(output.vacations.map((v) => v.destination)).toEqual(["Paris, France", "Rome, Italy"]);
  });

  it("declares every MCP tool to Gemini as a function", async () => {
    setQuestionServiceDeps({ aiEnabled: true });
    let declared: string[] = [];
    setGeminiClient({
      models: {
        generateContent: async (params) => {
          const tools = params.config?.tools as Array<{ functionDeclarations: Array<{ name: string; parametersJsonSchema: object }> }>;
          declared = tools[0]?.functionDeclarations.map((f) => f.name) ?? [];
          expect(JSON.stringify(tools)).not.toContain("$schema");
          return { text: "Hello!", candidates: [{ finishReason: "STOP" }] } as unknown as GenerateContentResponse;
        },
      },
    });
    await ask("Hi there");
    expect(declared).toHaveLength(6);
    expect(declared).toContain("get_vacation_statistics");
  });

  it("maps Gemini rate limits to HTTP 429", async () => {
    setQuestionServiceDeps({ aiEnabled: true });
    setGeminiClient({
      models: {
        generateContent: async () => {
          throw new ApiError({ message: "Resource exhausted", status: 429 });
        },
      },
    });
    expect((await ask("How many vacations are there?")).status).toBe(429);
  });
});

describe("region inference", () => {
  it("maps destinations and wording to regions", () => {
    expect(regionOf("Cape Town, South Africa")).toBe("Africa");
    expect(regionOf("Dubai, United Arab Emirates")).toBe("Middle East");
    expect(regionOf("New York City, United States")).toBe("North America");
    expect(regionOf("Maldives")).toBe("Asia");
    expect(parseRegion("Any european trips?")).toBe("Europe");
    expect(parseRegion("south america please")).toBe("South America");
    expect(parseRegion("hello")).toBeNull();
  });
});
