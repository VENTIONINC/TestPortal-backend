import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import * as Schemas from "../schemas";

export function registerTestAnalysisPaths(registry: OpenAPIRegistry): void {
  // Test Analysis routes
  registry.registerPath({
    method: "post",
    path: "/api/v1/test-analysis",
    description: "Analyzes test results",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Schemas.TestAnalysisRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Analysis completed",
        content: {
          "application/json": {
            schema: Schemas.TestAnalysisResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: Schemas.ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Test Analysis"],
  });

}
