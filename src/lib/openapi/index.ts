import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";

import { registerCommonSchemas } from "./common";
import { registerSecuritySchemes } from "./security";
import { registerSystemRoutes } from "./system";
import { registerIssueRoutes } from "./issues";
import { registerResultRoutes } from "./results";
import { registerSpecRoutes } from "./specs";
import { registerAssumptionRoutes } from "./assumptions";
import { registerResultErrorRoutes } from "./resultErrors";
import { registerExecutionRoutes } from "./executions";
import { registerReportRoutes } from "./reports";
import { registerUserRoutes } from "./users";
import { registerAuthRoutes } from "./auth";
import { registerErrorFormatterRoutes } from "./errorFormatter";
import { registerPromptRoutes } from "./prompts";
import { registerProjectRoutes } from "./projects";
import { registerCtrfRoutes } from "./ctrf";
import { registerUploadApiKeyRoutes } from "./uploadApiKey";
import { registerAnalysisExportRoutes } from "./analysisExport";
import { registerPdfExportRoutes } from "./pdfExport";
import "./zod";

export function generateOpenAPISpec() {
  const registry = new OpenAPIRegistry();

  registerCommonSchemas(registry);
  registerSecuritySchemes(registry);
  registerSystemRoutes(registry);
  registerIssueRoutes(registry);
  registerResultRoutes(registry);
  registerSpecRoutes(registry);
  registerAssumptionRoutes(registry);
  registerResultErrorRoutes(registry);
  registerExecutionRoutes(registry);
  registerReportRoutes(registry);
  registerUserRoutes(registry);
  registerAuthRoutes(registry);
  registerErrorFormatterRoutes(registry);
  registerPromptRoutes(registry);
  registerProjectRoutes(registry);
  registerCtrfRoutes(registry);
  registerUploadApiKeyRoutes(registry);
  registerAnalysisExportRoutes(registry);
  registerPdfExportRoutes(registry);

  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      version: "1.0.0",
      title: "Test Portal API",
      description:
        "API documentation for the Test Portal Backend - handles test execution results, issues, and reporting",
      contact: {
        name: "Test Portal API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:3001",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "System",
        description: "System endpoints like status and welcome",
      },
      {
        name: "Issues",
        description: "Issue management endpoints",
      },
      {
        name: "Results",
        description: "Test result endpoints",
      },
      {
        name: "Specs",
        description: "Test specification endpoints",
      },
      {
        name: "Assumptions",
        description: "Assumption management endpoints",
      },
      {
        name: "Result Errors",
        description: "Result error management endpoints",
      },
      {
        name: "Executions",
        description: "Test execution endpoints",
      },
      {
        name: "Reports",
        description: "Report processing endpoints",
      },
      {
        name: "Authentication",
        description: "User authentication endpoints (signup, login)",
      },
      {
        name: "Users",
        description: "User management endpoints (protected)",
      },
      {
        name: "Test Analysis",
        description: "AI-powered test result analysis endpoints",
      },
      {
        name: "MCP",
        description: "Model Context Protocol token management endpoints",
      },
      {
        name: "Error Formatter",
        description: "AI-powered error formatting endpoints",
      },
      {
        name: "Prompts",
        description: "Prompt template management and generation endpoints",
      },
      {
        name: "Projects",
        description:
          "Project management endpoints for organizing test executions and results",
      },
      {
        name: "CTRF",
        description:
          "CTRF (Common Test Result Format) endpoints for processing standardized test results",
      },
      {
        name: "Upload API Keys",
        description:
          "Upload API key management endpoints for generating and managing API keys for project uploads",
      },
      {
        name: "Upload",
        description:
          "File upload endpoints for test reports and results with API key authentication",
      },
      {
        name: "Exports",
        description:
          "Export endpoints for offline analysis of AI results and feedback",
      },
    ],
  });
}
