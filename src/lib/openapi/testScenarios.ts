// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "./common";
import { z } from "./zod";

const TestScenarioSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    createdById: z.string().uuid(),
    title: z.string(),
    contentMd: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("TestScenario");

const CreateTestScenarioRequestSchema = z
  .object({
    projectId: z.string().uuid(),
    title: z.string().min(1),
    contentMd: z.string().min(1),
  })
  .openapi("CreateTestScenarioRequest");

const TestScenarioIdParamsSchema = z
  .object({
    scenarioId: z.string().uuid(),
  })
  .openapi("TestScenarioIdParams");

const TestScenarioProjectQuerySchema = z
  .object({
    projectId: z.string().uuid(),
  })
  .openapi("TestScenarioProjectQuery");

const TestScenarioListQuerySchema = z
  .object({
    projectId: z.string().uuid(),
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(30).optional(),
  })
  .openapi("TestScenarioListQuery");

const TestScenarioListResponseSchema = z
  .object({
    scenarios: z.array(TestScenarioSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("TestScenarioListResponse");

export function registerTestScenarioRoutes(registry: OpenAPIRegistry): void {
  registry.register("TestScenario", TestScenarioSchema);
  registry.register(
    "CreateTestScenarioRequest",
    CreateTestScenarioRequestSchema,
  );
  registry.register("TestScenarioIdParams", TestScenarioIdParamsSchema);
  registry.register(
    "TestScenarioProjectQuery",
    TestScenarioProjectQuerySchema,
  );
  registry.register("TestScenarioListQuery", TestScenarioListQuerySchema);
  registry.register(
    "TestScenarioListResponse",
    TestScenarioListResponseSchema,
  );

  registry.registerPath({
    method: "post",
    path: "/api/v2/test-scenarios",
    description: "Creates a project-scoped Markdown test scenario.",
    request: {
      body: {
        required: true,
        content: {
          "application/json": {
            schema: CreateTestScenarioRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Test scenario created",
        content: {
          "application/json": { schema: TestScenarioSchema },
        },
      },
      400: {
        description: "Invalid test scenario input",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/test-scenarios",
    description: "Lists project-scoped Markdown test scenarios.",
    request: {
      query: TestScenarioListQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated test scenarios",
        content: {
          "application/json": { schema: TestScenarioListResponseSchema },
        },
      },
      400: {
        description: "Invalid project or pagination query",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/test-scenarios/{scenarioId}",
    description: "Retrieves a test scenario within a project context.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioProjectQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Test scenario details",
        content: {
          "application/json": { schema: TestScenarioSchema },
        },
      },
      400: {
        description: "Invalid scenario or project identifier",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      404: {
        description: "Test scenario not found in the requested project",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/test-scenarios/{scenarioId}",
    description: "Deletes a test scenario within a project context.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioProjectQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      204: {
        description: "Test scenario deleted",
      },
      400: {
        description: "Invalid scenario or project identifier",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      404: {
        description: "Test scenario not found in the requested project",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": { schema: ErrorResponseSchema },
        },
      },
    },
    tags: ["Test Scenarios"],
  });
}

export {
  CreateTestScenarioRequestSchema,
  TestScenarioIdParamsSchema,
  TestScenarioListQuerySchema,
  TestScenarioListResponseSchema,
  TestScenarioProjectQuerySchema,
  TestScenarioSchema,
};
