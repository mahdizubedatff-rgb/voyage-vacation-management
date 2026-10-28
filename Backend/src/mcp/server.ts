import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { REGIONS, parseRegion } from "./regions";
import * as data from "./vacationData";

const json = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});

const notFound = (message: string): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify({ found: false, message }) }],
});

/** Builds the Voyage MCP server. Tools read live data from MongoDB through ./vacationData. */
export function createVacationMcpServer(): McpServer {
  const server = new McpServer(
    { name: "voyage-vacations", version: "1.0.0" },
    {
      instructions:
        "Read-only tools over the Voyage vacation catalogue. Prices are in USD per person. " +
        "Status is relative to today: upcoming (not started), active (in progress) or past.",
    },
  );

  server.registerTool(
    "list_vacations",
    {
      title: "List vacations",
      description:
        "List vacations in the catalogue with destination, dates, price, status, region and like count. " +
        "Use for counting vacations or browsing the catalogue.",
      inputSchema: {
        status: z.enum(["all", "upcoming", "active", "past"]).default("all").describe("Filter by status"),
        sortBy: z.enum(["startDate", "price"]).default("startDate").describe("Sort order"),
        limit: z.number().int().min(1).max(100).optional().describe("Maximum number of results"),
      },
    },
    async ({ status, sortBy, limit }) => {
      const vacations = await data.listVacations({ status, sortBy, limit });
      return json({ count: vacations.length, vacations });
    },
  );

  server.registerTool(
    "get_vacation_details",
    {
      title: "Get vacation details",
      description: "Full details (including description) of a vacation, looked up by id or by destination name.",
      inputSchema: {
        vacationId: z.string().optional().describe("Vacation id"),
        destination: z.string().optional().describe("Destination name or part of it, e.g. 'Kyoto'"),
      },
    },
    async ({ vacationId, destination }) => {
      if (!vacationId && !destination) return notFound("Provide either vacationId or destination");
      const matches = await data.getDetails({ vacationId, destination });
      return matches.length ? json({ found: true, vacations: matches }) : notFound("No matching vacation");
    },
  );

  server.registerTool(
    "get_vacation_price",
    {
      title: "Get vacation price",
      description: "Price (USD) and dates of the vacation(s) matching a destination name.",
      inputSchema: { destination: z.string().min(1).describe("Destination name or part of it") },
    },
    async ({ destination }) => {
      const matches = await data.findByDestination(destination);
      if (!matches.length) return notFound(`No vacation found for "${destination}"`);
      return json({
        found: true,
        prices: matches.map((v) => ({ destination: v.destination, price: v.price, currency: "USD", startDate: v.startDate, endDate: v.endDate })),
      });
    },
  );

  server.registerTool(
    "get_vacations_by_destination",
    {
      title: "Search vacations by destination",
      description: "Search vacations whose destination contains the given city or country text.",
      inputSchema: { query: z.string().min(1).describe("City or country text, e.g. 'Italy'") },
    },
    async ({ query }) => {
      const matches = await data.findByDestination(query);
      return json({ count: matches.length, vacations: matches });
    },
  );

  server.registerTool(
    "get_vacations_by_region",
    {
      title: "Vacations by region",
      description: `List vacations in a world region. Regions: ${REGIONS.join(", ")}.`,
      inputSchema: { region: z.string().min(1).describe(`One of: ${REGIONS.join(", ")}`) },
    },
    async ({ region }) => {
      const canonical = parseRegion(region);
      if (!canonical) return notFound(`Unknown region "${region}". Use one of: ${REGIONS.join(", ")}`);
      const vacations = await data.listByRegion(canonical);
      return json({ region: canonical, count: vacations.length, vacations });
    },
  );

  server.registerTool(
    "get_vacation_statistics",
    {
      title: "Vacation statistics",
      description:
        "Aggregate statistics: total count, count by status, average price, cheapest, most expensive, most liked, vacations per region.",
      inputSchema: {},
    },
    async () => json(await data.getStatistics()),
  );

  return server;
}
