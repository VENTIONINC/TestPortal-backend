import { Router } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { statusCheck } from "./tools/status-check.js";
import {
  getIssues,
  getIssueById,
  createIssue,
  getMockIssues,
} from "./tools/issues.js";
import { getResults, getResultById } from "./tools/results.js";

const router = Router();

const transports = {};

router.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] || undefined;
  let transport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
    await transport.handleRequest(req, res, req.body);
    return;
  }

  if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports[sessionId] = transport;
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };

    const server = new McpServer({
      name: "test-portal-server",
      version: "0.0.1",
    });

    // Register all tools
    server.tool(...statusCheck);

    // Issue tools
    server.tool(...getIssues);
    server.tool(...getIssueById);
    server.tool(...createIssue);
    server.tool(...getMockIssues);

    // Result tools
    server.tool(...getResults);
    server.tool(...getResultById);

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    return;
  }

  res.status(400).json({
    jsonrpc: "2.0",
    error: {
      code: -32000,
      message: "Bad Request: No valid session ID provided",
    },
    id: null,
  });
});

const handleSessionRequest = async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] || undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

router.get("/mcp", handleSessionRequest);
router.delete("/mcp", handleSessionRequest);

export default router;
