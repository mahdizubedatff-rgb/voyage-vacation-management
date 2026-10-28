import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { connectDatabase } from "../config/db";
import { createVacationMcpServer } from "./server";

/** stdio entry point, for MCP Inspector or desktop MCP clients. Logs go to stderr; stdout carries the protocol. */
async function main(): Promise<void> {
  await connectDatabase();
  await createVacationMcpServer().connect(new StdioServerTransport());
  console.error("Voyage MCP server running on stdio");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
