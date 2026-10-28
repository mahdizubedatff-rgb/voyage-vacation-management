import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { env } from "../config/env";
import { connectDatabase } from "../config/db";
import { createVacationMcpServer } from "./server";

/**
 * Standalone MCP server over Streamable HTTP (stateless mode: a fresh server/transport per request).
 * Runs as its own process / Docker service; the backend connects to it as an MCP client.
 */
export function createMcpHttpApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "voyage-mcp" });
  });

  app.post("/mcp", async (req, res) => {
    const server = createVacationMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      void transport.close();
      void server.close();
    });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP request failed", error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });

  // Stateless mode has no server-initiated streams or sessions.
  const methodNotAllowed: express.RequestHandler = (_req, res) => {
    res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
  };
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  return app;
}

if (require.main === module) {
  connectDatabase()
    .then(() => {
      createMcpHttpApp().listen(env.MCP_PORT, () => {
        console.log(`Voyage MCP server listening on http://localhost:${env.MCP_PORT}/mcp`);
      });
    })
    .catch((error: unknown) => {
      console.error("MCP server failed to start", error);
      process.exit(1);
    });
}
