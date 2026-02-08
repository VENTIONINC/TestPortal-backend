import { Router, Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import {
  McpServer,
  RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  authenticateMcpToken,
  type RequestWithMcpUser,
} from "@/mcp/middleware/auth";
import { statusCheck } from "@/mcp/tools/status-check";
import {
  getIssues,
  getIssuesWithStats,
  getIssueById,
  createIssue,
  updateIssue,
  deleteIssue,
} from "@/mcp/tools/issues";
import {
  getResults,
  getResultById,
  getResultsStats,
  updateResultAnalysis,
  updateResultAnalysisFeedback,
  deleteResult,
} from "@/mcp/tools/results";
import {
  createAssumption,
  updateAssumption,
  getAssumptionById,
  deleteAssumption,
} from "@/mcp/tools/assumptions";
import { getExecutionById, deleteExecution } from "@/mcp/tools/executions";
import {
  assignIssue,
  reviewError,
  bulkReview,
  getResultErrorById,
  analyzeResultErrors,
} from "@/mcp/tools/result-errors";
import { getSpecById, deleteSpec } from "@/mcp/tools/specs";
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectDashboard,
} from "@/mcp/tools/projects";
import { currentTime } from "@/mcp/tools/current-time";
import * as testPortalAssistant from "@/mcp/prompts/test-portal-assistant/v1.0.0";
import * as issueAnalysisAssistant from "@/mcp/prompts/issue-analysis-assistant/v1.0.0";
import * as environmentPerformanceAssistant from "@/mcp/prompts/environment-performance-assistant/v1.0.0";
import * as developerCodeAssistant from "@/mcp/prompts/developer-code-assistant/v1.0.0";
import * as documentationArchitect from "@/mcp/prompts/documentation-architect/v1.0.0";
import type { MCPToolContext, MCPToolHandler, MCPToolSchema } from "@/types";

const router = Router();

// Type for transport storage
interface TransportEntry {
  transport: StreamableHTTPServerTransport;
  lastActive: number;
}

interface TransportStorage {
  [sessionId: string]: TransportEntry;
}

// Extended MCP server interface to handle tool registration
interface McpServerWithTools extends McpServer {
  tool: (...args: unknown[]) => RegisteredTool;
  connect: (transport: unknown) => Promise<void>;
}

type ToolTuple<TInput = unknown> = [
  string,
  string,
  MCPToolSchema,
  MCPToolHandler<TInput, MCPToolContext>,
];

const registerToolWithContext = <TInput>(
  server: McpServerWithTools,
  tool: ToolTuple<TInput>,
  context: MCPToolContext,
): void => {
  const [name, description, schema, handler] = tool;
  server.tool(name, description, schema, (params: TInput) =>
    handler(params, context),
  );
};

const transports: TransportStorage = {};
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

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
      const mcpUserId = req.mcpUserId;

      if (!mcpUserId) {
        res.status(401).json({
          jsonrpc: "2.0",
          error: {
            code: -32002,
            message: "Invalid or expired MCP token",
          },
          id: null,
        });
        return;
      }

      const sessionId = req.headers["mcp-session-id"] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        const entry = transports[sessionId];
        entry.lastActive = Date.now();
        transport = entry.transport;
        await transport.handleRequest(req, res, req.body);
        return;
      }

      if (!sessionId && isInitializeRequest(req.body)) {
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId: string) => {
            transports[sessionId] = {
              transport,
              lastActive: Date.now(),
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

        const context: MCPToolContext = { mcpUserId };

        // Register all tools
        registerToolWithContext(server, statusCheck, context);
        registerToolWithContext(server, currentTime, context);

        // Issue tools
        registerToolWithContext(server, getIssues, context);
        registerToolWithContext(server, getIssuesWithStats, context);
        registerToolWithContext(server, getIssueById, context);
        registerToolWithContext(server, createIssue, context);
        registerToolWithContext(server, updateIssue, context);
        registerToolWithContext(server, deleteIssue, context);

        // Result tools
        registerToolWithContext(server, getResults, context);
        registerToolWithContext(server, getResultById, context);
        registerToolWithContext(server, getResultsStats, context);
        registerToolWithContext(server, updateResultAnalysis, context);
        registerToolWithContext(server, updateResultAnalysisFeedback, context);
        registerToolWithContext(server, deleteResult, context);

        // Assumption tools
        registerToolWithContext(server, createAssumption, context);
        registerToolWithContext(server, updateAssumption, context);
        registerToolWithContext(server, getAssumptionById, context);
        registerToolWithContext(server, deleteAssumption, context);

        // Execution tools
        registerToolWithContext(server, getExecutionById, context);
        registerToolWithContext(server, deleteExecution, context);

        // Result Error tools
        registerToolWithContext(server, assignIssue, context);
        registerToolWithContext(server, reviewError, context);
        registerToolWithContext(server, bulkReview, context);
        registerToolWithContext(server, getResultErrorById, context);
        registerToolWithContext(server, analyzeResultErrors, context);

        // Spec tools
        registerToolWithContext(server, getSpecById, context);
        registerToolWithContext(server, deleteSpec, context);

        // Project tools
        registerToolWithContext(server, getProjects, context);
        registerToolWithContext(server, getProjectById, context);
        registerToolWithContext(server, createProject, context);
        registerToolWithContext(server, updateProject, context);
        registerToolWithContext(server, deleteProject, context);
        registerToolWithContext(server, getProjectDashboard, context);

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
  req: Request,
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
    entry.lastActive = Date.now();
    const transport = entry.transport;
    await transport.handleRequest(req, res);
  } catch (error) {
    next(error);
  }
};

router.get("/v2/mcp", authenticateMcpToken, handleSessionRequest);
router.delete("/v2/mcp", authenticateMcpToken, handleSessionRequest);

export default router;
