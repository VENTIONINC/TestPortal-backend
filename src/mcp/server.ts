import { Router, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import {
  McpServer,
  RegisteredTool,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { authenticateMcpToken } from "@/mcp/middleware/auth";
import { statusCheck } from "@/mcp/tools/status-check";
import { currentTime } from "@/mcp/tools/current-time";
import { getIssues, getIssueById, createIssue } from "@/mcp/tools/issues";
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
import * as testPortalAssistant from "@/mcp/prompts/test-portal-assistant";
import * as issueAnalysisAssistant from "@/mcp/prompts/issue-analysis-assistant";
import * as environmentPerformanceAssistant from "@/mcp/prompts/environment-performance-assistant";
import * as developerCodeAssistant from "@/mcp/prompts/developer-code-assistant";
import * as documentationArchitect from "@/mcp/prompts/documentation-architect";

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
  async (req: Request, res: Response): Promise<void> => {
    try {
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

        // Register all tools
        server.tool(...statusCheck);
        server.tool(...currentTime);

        // Issue tools
        server.tool(...getIssues);
        server.tool(...getIssueById);
        server.tool(...createIssue);

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
): Promise<void> => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }

  const entry = transports[sessionId];
  entry.lastActive = Date.now();
  const transport = entry.transport;
  await transport.handleRequest(req, res);
};

router.get("/v2/mcp", authenticateMcpToken, handleSessionRequest);
router.delete("/v2/mcp", authenticateMcpToken, handleSessionRequest);

export default router;
