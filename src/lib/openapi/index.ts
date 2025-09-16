import { OpenAPIRegistry, OpenApiGeneratorV31 } from "@asteasolutions/zod-to-openapi";
import { registerSchemas } from "./schemas";
import { registerPaths } from "./paths";

export function generateOpenAPISpec() {
  const registry = new OpenAPIRegistry();

  registerSchemas(registry);
  registerPaths(registry);

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
    ],
  });
}

