import { Router, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { statusCheck } from "@/mcp/tools/status-check";
import { currentTime } from "@/mcp/tools/current-time";
import {
  getIssues,
  getIssueById,
  createIssue,
  getMockIssues,
} from "@/mcp/tools/issues";
import {
  getResults,
  getResultById,
  getResultsStats,
} from "@/mcp/tools/results";
import {
  createAssumption,
  updateAssumption,
  getAssumptionById,
} from "@/mcp/tools/assumptions";
import { getExecutionById } from "@/mcp/tools/executions";
import {
  assignIssue,
  reviewError,
  bulkReview,
  getResultErrorById,
} from "@/mcp/tools/result-errors";
import { getSpecById } from "@/mcp/tools/specs";

const router = Router();

// Type for transport storage
interface TransportStorage {
  [sessionId: string]: StreamableHTTPServerTransport;
}

// Extended MCP server interface to handle tool registration
interface McpServerWithTools {
  tool: (...args: unknown[]) => void;
  connect: (transport: unknown) => Promise<void>;
}

const transports: TransportStorage = {};

router.post("/v1/mcp", async (req: Request, res: Response): Promise<void> => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    transport = transports[sessionId];
    await transport.handleRequest(req, res, req.body);
    return;
  }

  if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
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
    }) as unknown as McpServerWithTools;

    // Register all tools
    server.tool(...statusCheck);
    server.tool(...currentTime);

    // Issue tools
    server.tool(...getIssues);
    server.tool(...getIssueById);
    server.tool(...createIssue);
    server.tool(...getMockIssues);

    // Result tools
    server.tool(...getResults);
    server.tool(...getResultById);
    server.tool(...getResultsStats);

    // Assumption tools
    server.tool(...createAssumption);
    server.tool(...updateAssumption);
    server.tool(...getAssumptionById);

    // Execution tools
    server.tool(...getExecutionById);

    // Result Error tools
    server.tool(...assignIssue);
    server.tool(...reviewError);
    server.tool(...bulkReview);
    server.tool(...getResultErrorById);

    // Spec tools
    server.tool(...getSpecById);

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

const handleSessionRequest = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

router.get("/v1/mcp", handleSessionRequest);
router.delete("/v1/mcp", handleSessionRequest);

export default router;

