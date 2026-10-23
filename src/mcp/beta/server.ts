// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Router, type Request, type Response } from "express";
import {
  McpServer,
  createMcpHandler,
  type CallToolResult,
  type McpHttpHandler,
} from "@modelcontextprotocol/server";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { z } from "zod/v3";
import { authenticateMcpToken } from "@/mcp/middleware/auth";
import type { RequestWithMcpUser } from "@/mcp/middleware/auth";
import type { MCPToolSchema } from "@/types";
import { statusCheck } from "@/mcp/tools/status-check";
import { currentTime } from "@/mcp/tools/current-time";
import { getAvailableProjects } from "@/mcp/tools/projects";
import { getIssues, getIssueById, createIssue } from "@/mcp/tools/issues";
import {
  getResults,
  getResultById,
  getResultsStats,
} from "@/mcp/tools/results";
import {
  createAssumption,
  createUpdateAssumptionTool,
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
import {
  deleteTestScenario,
  getTestScenario,
  listTestScenarios,
  updateTestScenario,
} from "@/mcp/tools/test-scenarios";
import { toStandardSchema } from "@/mcp/beta/schemaAdapter";
import { enforceMcpBetaOrigin } from "@/mcp/beta/originPolicy";
import { createHandlerRegistry } from "@/mcp/beta/handlerRegistry";
import * as testPortalAssistant from "@/mcp/prompts/test-portal-assistant/v1.0.0";
import * as issueAnalysisAssistant from "@/mcp/prompts/issue-analysis-assistant/v1.0.0";
import * as environmentPerformanceAssistant from "@/mcp/prompts/environment-performance-assistant/v1.0.0";
import * as developerCodeAssistant from "@/mcp/prompts/developer-code-assistant/v1.0.0";
import * as documentationArchitect from "@/mcp/prompts/documentation-architect/v1.0.0";

const router = Router();
const BODY_LIMIT_BYTES = 4 * 1024 * 1024;
const handlerRegistry = createHandlerRegistry<McpHttpHandler>();

export const closeMcpBetaHandlers = (): Promise<void> =>
  handlerRegistry.closeAll();

router.use("/v2/mcp-beta", enforceMcpBetaOrigin);

type LegacyToolDefinition = readonly [
  string,
  string,
  MCPToolSchema,
  (input: never) => Promise<unknown>,
];

const registerBetaTool = (
  server: McpServer,
  [name, description, schema, handler]: LegacyToolDefinition,
): void => {
  server.registerTool(
    name,
    { description, inputSchema: toStandardSchema(schema) },
    async (input) => (await handler(input as never)) as CallToolResult,
  );
};

const createBetaServer = (userId: string): McpServer => {
  const server = new McpServer(
    { name: "test-portal-server", version: "0.0.1-beta" },
    { supportedProtocolVersions: ["2026-07-28"] },
  );

  const tools = [
    statusCheck,
    currentTime,
    getAvailableProjects,
    getIssues,
    getIssueById,
    createIssue,
    getResults,
    getResultById,
    getResultsStats,
    createAssumption,
    createUpdateAssumptionTool(userId),
    getAssumptionById,
    getExecutionById,
    assignIssue,
    reviewError,
    bulkReview,
    getResultErrorById,
    getSpecById,
    listTestScenarios,
    getTestScenario,
    updateTestScenario,
    deleteTestScenario,
  ] as const;

  for (const tool of tools) {
    registerBetaTool(server, tool);
  }

  const promptConfig = testPortalAssistant.testPortalAssistantParameters;
  const promptArgs = z.object(promptConfig.argsSchema);
  server.registerPrompt(
    testPortalAssistant.testPortalAssistantName,
    {
      title: promptConfig.title,
      description: promptConfig.description,
      argsSchema: toStandardSchema(promptArgs),
    },
    (args) =>
      testPortalAssistant.testPortalAssistantPrompt({
        time_period: args.time_period ?? "today",
        report_type: args.report_type ?? "summary",
        project_system: args.project_system ?? "jira",
      }),
  );

  const issueAnalysisConfig =
    issueAnalysisAssistant.issueAnalysisAssistantParameters;
  server.registerPrompt(
    issueAnalysisAssistant.issueAnalysisAssistantName,
    {
      title: issueAnalysisConfig.title,
      description: issueAnalysisConfig.description,
      argsSchema: toStandardSchema(z.object(issueAnalysisConfig.argsSchema)),
    },
    (args) =>
      issueAnalysisAssistant.issueAnalysisAssistantPrompt({
        analysis_scope: args.analysis_scope ?? "recent executions",
        error_context: args.error_context ?? "",
        target_system: args.target_system ?? "",
      }),
  );

  const environmentConfig =
    environmentPerformanceAssistant.environmentPerformanceAssistantParameters;
  server.registerPrompt(
    environmentPerformanceAssistant.environmentPerformanceAssistantName,
    {
      title: environmentConfig.title,
      description: environmentConfig.description,
      argsSchema: toStandardSchema(z.object(environmentConfig.argsSchema)),
    },
    (args) =>
      environmentPerformanceAssistant.environmentPerformanceAssistantPrompt({
        environment_scope: args.environment_scope ?? "all environments",
        performance_metric: args.performance_metric ?? "",
        time_range: args.time_range ?? "",
      }),
  );

  const developerConfig = developerCodeAssistant.developerCodeAssistantParameters;
  server.registerPrompt(
    developerCodeAssistant.developerCodeAssistantName,
    {
      title: developerConfig.title,
      description: developerConfig.description,
      argsSchema: toStandardSchema(z.object(developerConfig.argsSchema)),
    },
    (args) =>
      developerCodeAssistant.developerCodeAssistantPrompt({
        result_id: args.result_id ?? "",
        error_id: args.error_id ?? "",
        context_scope: args.context_scope ?? "",
      }),
  );

  const documentationConfig =
    documentationArchitect.softwareDocumentationAssistantParameters;
  server.registerPrompt(
    documentationArchitect.softwareDocumentationAssistantName,
    {
      title: documentationConfig.title,
      description: documentationConfig.description,
      argsSchema: toStandardSchema(z.object(documentationConfig.argsSchema)),
    },
    (args) =>
      documentationArchitect.softwareDocumentationAssistantPrompt({
        file_paths: args.file_paths ?? "",
        documentation_type: args.documentation_type ?? "",
        target_audience: args.target_audience ?? "",
        scope: args.scope ?? "",
        publish: args.publish ?? "",
      }),
  );

  return server;
};

const handleBetaPost = async (
  req: RequestWithMcpUser,
  res: Response,
): Promise<void> => {
  if (!req.mcpUserId) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "MCP user is not authenticated" },
      id: null,
    });
    return;
  }

  const handler = createMcpHandler(
    () => createBetaServer(req.mcpUserId as string),
    { legacy: "reject", maxRequestBodySize: BODY_LIMIT_BYTES },
  );
  const nodeHandler = toNodeHandler(handler, {
    maxRequestBodySize: BODY_LIMIT_BYTES,
  });

  await handlerRegistry.run(handler, () => nodeHandler(req, res));
};

router.post("/v2/mcp-beta", authenticateMcpToken, (req, res, next) => {
  void handleBetaPost(req, res).catch(next);
});

router.all("/v2/mcp-beta", (_req: Request, res: Response): void => {
  res.setHeader("Allow", "POST, OPTIONS");
  res.status(405).send("Method not allowed");
});

export default router;
