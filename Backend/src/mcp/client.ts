import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

/** The subset of MCP client behaviour the question service needs. */
export interface VacationMcpClient {
  listTools(): Promise<Tool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

type TransportFactory = () => Transport | Promise<Transport>;

let transportFactory: TransportFactory = () => new StreamableHTTPClientTransport(new URL(env.MCP_SERVER_URL));
let clientPromise: Promise<Client> | null = null;

/** Test hook: connect over a different transport (e.g. InMemoryTransport). */
export function setMcpTransportFactory(factory: TransportFactory): void {
  transportFactory = factory;
  void resetMcpClient();
}

export async function resetMcpClient(): Promise<void> {
  const pending = clientPromise;
  clientPromise = null;
  if (pending) await pending.then((client) => client.close()).catch(() => undefined);
}

async function connect(): Promise<Client> {
  const client = new Client({ name: "voyage-backend", version: "1.0.0" });
  await client.connect(await transportFactory());
  return client;
}

async function getClient(): Promise<Client> {
  clientPromise ??= connect().catch((error: unknown) => {
    clientPromise = null;
    throw error;
  });
  return clientPromise;
}

function parseToolResult(result: CallToolResult): unknown {
  const text = result.content
    .filter((item): item is { type: "text"; text: string } => item.type === "text")
    .map((item) => item.text)
    .join("\n");
  if (result.isError) throw new Error(text || "MCP tool failed");
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function withClient<T>(run: (client: Client) => Promise<T>): Promise<T> {
  try {
    return await run(await getClient());
  } catch (firstError) {
    // A restarted MCP server invalidates the connection; reconnect once before giving up.
    await resetMcpClient();
    try {
      return await run(await getClient());
    } catch (error) {
      console.error("MCP call failed", firstError, error);
      throw new AppError(503, "The vacation knowledge service (MCP) is unavailable. Please try again shortly.");
    }
  }
}

export const mcpClient: VacationMcpClient = {
  listTools: () => withClient(async (client) => (await client.listTools()).tools),
  callTool: (name, args) =>
    withClient(async (client) => parseToolResult((await client.callTool({ name, arguments: args })) as CallToolResult)),
};
