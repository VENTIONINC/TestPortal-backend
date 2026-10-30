// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import {
  McpServer,
  RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  authenticateMcpToken,
  handleMcpSessionRequest,
} from "@/mcp/middleware/auth";
import type { RequestWithMcpUser } from "@/mcp/middleware/auth";
import { createActionCatalog } from "@/mcp/actionCatalog";
import {
  findAction,
  findActionSchema,
  findActionShape,
} from "@/mcp/actionDiscovery";
import { executeAction, executeActionSchema } from "@/mcp/actionExecution";
import * as testPortalAssistant from "@/mcp/prompts/test-portal-assistant/v1.0.0";
import * as issueAnalysisAssistant from "@/mcp/prompts/issue-analysis-assistant/v1.0.0";
import * as environmentPerformanceAssistant from "@/mcp/prompts/environment-performance-assistant/v1.0.0";
import * as developerCodeAssistant from "@/mcp/prompts/developer-code-assistant/v1.0.0";
import * as documentationArchitect from "@/mcp/prompts/documentation-architect/v1.0.0";

const router = Router();

// Type for transport storage
interface TransportEntry {
  transport: StreamableHTTPServerTransport;
  lastActive: number;
  userId: string;
}

interface TransportStorage {
  [sessionId: string]: TransportEntry;
}

// Extended MCP server interface to handle tool registration
interface McpServerWithTools extends McpServer {
  registerTool: (...args: unknown[]) => RegisteredTool;
  connect: (transport: unknown) => Promise<void>;
}

const transports: TransportStorage = {};
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export const registerActionTools = (
  server: McpServer,
  userId: string,
  catalog = createActionCatalog(userId),
): void => {
  const compatibleServer = server as McpServerWithTools;
  compatibleServer.registerTool(
    "testportal-find-action",
    {
      description:
        "Find action contracts by query or exact ID, or browse the available areas.",
      inputSchema: findActionShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
      },
    },
    async (input: unknown) =>
      findAction(catalog, findActionSchema.parse(input)),
  );
  compatibleServer.registerTool(
    "testportal-execute-action",
    {
      description: "Execute one known action with its validated arguments.",
      inputSchema: executeActionSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    async (input: unknown) =>
      executeAction(catalog, executeActionSchema.parse(input)),
  );
};

// Cleanup interval for stale sessions
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, entry] of Object.entries(transports)) {
    if (now - entry.lastActive > SESSION_TIMEOUT) {
      console.log(`Cleaning up stale MCP session: ${sessionId}`);
      delete transports[sessionId];
    }
  }
}, 60 * 1000); // Check every minute

router.post(
  "/v2/mcp",
  authenticateMcpToken,
  async (req: RequestWithMcpUser, res: Response): Promise<void> => {
    try {
      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        const entry = transports[sessionId];
        transport = entry.transport;
        await handleMcpSessionRequest(entry.userId, req, res, async () => {
          entry.lastActive = Date.now();
          await transport.handleRequest(req, res, req.body);
        });
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        const reviewedById = req.mcpUserId;
        if (!reviewedById) {
          res.status(401).json({
            jsonrpc: "2.0",
            error: { code: -32001, message: "MCP user is not authenticated" },
            id: null,
          });
          return;
        }

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId: string) => {
            transports[sessionId] = {
              transport,
              lastActive: Date.now(),
              userId: reviewedById,
            };
          },
        });

        transport.onclose = () => {
          console.error(
            `MCP transport closed for session: ${transport.sessionId}`,
          );
          if (transport.sessionId) {
            delete transports[transport.sessionId];
          }
        };

        const server = new McpServer({
          name: "test-portal-server",
          version: "0.0.1",
        }) as McpServerWithTools;

        registerActionTools(server, reviewedById);

        // Test Portal Assistant
        server.registerPrompt(
          testPortalAssistant.testPortalAssistantName,
          testPortalAssistant.testPortalAssistantParameters,
          ({
            time_period = "today",
            report_type = "summary",
            project_system = "jira",
          }) =>
            testPortalAssistant.testPortalAssistantPrompt({
              time_period,
              report_type,
              project_system,
            }),
        );

        // Issue Analysis Assistant
        server.registerPrompt(
          issueAnalysisAssistant.issueAnalysisAssistantName,
          issueAnalysisAssistant.issueAnalysisAssistantParameters,
          ({
            analysis_scope = "recent executions",
            error_context = "",
            target_system = "",
          }) =>
            issueAnalysisAssistant.issueAnalysisAssistantPrompt({
              analysis_scope,
              error_context,
              target_system,
            }),
        );

        // Environment & Performance Assistant
        server.registerPrompt(
          environmentPerformanceAssistant.environmentPerformanceAssistantName,
          environmentPerformanceAssistant.environmentPerformanceAssistantParameters,
          ({
            environment_scope = "all environments",
            performance_metric = "",
            time_range = "",
          }) =>
            environmentPerformanceAssistant.environmentPerformanceAssistantPrompt(
              {
                environment_scope,
                performance_metric,
                time_range,
              },
            ),
        );

        // Developer Code Assistant
        server.registerPrompt(
          developerCodeAssistant.developerCodeAssistantName,
          developerCodeAssistant.developerCodeAssistantParameters,
          ({ result_id = "", error_id = "", context_scope = "" }) =>
            developerCodeAssistant.developerCodeAssistantPrompt({
              result_id,
              error_id,
              context_scope,
            }),
        );

        // Documentation Architect
        server.registerPrompt(
          documentationArchitect.softwareDocumentationAssistantName,
          documentationArchitect.softwareDocumentationAssistantParameters,
          ({
            file_paths = "",
            documentation_type = "",
            target_audience = "",
            scope = "",
            publish = "",
          }) =>
            documentationArchitect.softwareDocumentationAssistantPrompt({
              file_paths,
              documentation_type,
              target_audience,
              scope,
              publish,
            }),
        );

        try {
          await server.connect(transport);
          await transport.handleRequest(req, res, req.body);
        } catch (error) {
          console.error("MCP server connection error:", error);
          throw error;
        }
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
    } catch (error) {
      console.error("MCP server handler error:", error);
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal error",
        },
        id: null,
      });
    }
  },
);

const handleSessionRequest = async (
  req: RequestWithMcpUser,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    const entry = transports[sessionId];
    const transport = entry.transport;
    await handleMcpSessionRequest(entry.userId, req, res, async () => {
      entry.lastActive = Date.now();
      await transport.handleRequest(req, res);
    });
  } catch (error) {
    next(error);
  }
};

router.get("/v2/mcp", authenticateMcpToken, handleSessionRequest);
router.delete("/v2/mcp", authenticateMcpToken, handleSessionRequest);

export default router;
