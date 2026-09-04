// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "./common";
import { ResultSchema } from "./results";
import { z } from "./zod";

const TestScenarioSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    createdById: z.string().uuid(),
    title: z.string(),
    contentMd: z.string(),
    details: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("TestScenario");

const CreateTestScenarioRequestSchema = z
  .object({
    projectId: z.string().uuid(),
    title: z.string().min(1).regex(/\S/),
    contentMd: z.string().min(1),
    details: z.string().min(1).regex(/\S/).optional(),
  })
  .strict()
  .openapi("CreateTestScenarioRequest");

const TestScenarioCreatorSummarySchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    email: z.string(),
  })
  .strict()
  .openapi("TestScenarioCreatorSummary");

const TestScenarioSummarySchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    createdById: z.string().uuid(),
    title: z.string(),
    details: z.string().nullable(),
    createdBy: TestScenarioCreatorSummarySchema,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict()
  .openapi("TestScenarioSummary");

const UpdateTestScenarioDetailsSchema = z
  .string()
  .min(1)
  .regex(/\S/)
  .nullable();

const UpdateTestScenarioRequestSchema = z
  .union([
    z
      .object({
        title: z.string().min(1).regex(/\S/),
        contentMd: z.string().min(1).optional(),
        details: UpdateTestScenarioDetailsSchema.optional(),
      })
      .strict(),
    z
      .object({
        title: z.string().min(1).regex(/\S/).optional(),
        contentMd: z.string().min(1),
        details: UpdateTestScenarioDetailsSchema.optional(),
      })
      .strict(),
    z
      .object({
        title: z.string().min(1).regex(/\S/).optional(),
        contentMd: z.string().min(1).optional(),
        details: UpdateTestScenarioDetailsSchema,
      })
      .strict(),
  ])
  .openapi("UpdateTestScenarioRequest");

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
    scenarios: z.array(TestScenarioSummarySchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("TestScenarioListResponse");

const TestScenarioSpecLinkBodySchema = z
  .object({
    specId: z.string().uuid(),
  })
  .openapi("TestScenarioSpecLinkBody");

const TestScenarioSpecLinkResponseSchema = z
  .object({
    scenarioId: z.string().uuid(),
    specId: z.string().uuid(),
  })
  .openapi("TestScenarioSpecLinkResponse");

const TestScenarioLinkedSpecSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    key: z.string(),
    file: z.string(),
    title: z.string(),
    tags: z.array(z.string()),
    annotations: z.array(z.unknown()),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("TestScenarioLinkedSpec");

const TestScenarioSpecLinkListQuerySchema = z
  .object({
    projectId: z.string().uuid(),
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(30).optional(),
  })
  .openapi("TestScenarioSpecLinkListQuery");

const TestScenarioSpecLinkDeleteParamsSchema = z
  .object({
    scenarioId: z.string().uuid(),
    specId: z.string().uuid(),
  })
  .openapi("TestScenarioSpecLinkDeleteParams");

const TestScenarioEvidenceQuerySchema = z
  .object({
    projectId: z.string().uuid(),
    page: z.number().int().min(1).default(1).optional(),
    limit: z.number().int().min(1).max(100).default(30).optional(),
  })
  .openapi("TestScenarioEvidenceQuery");

const TestScenarioSpecLinkListResponseSchema = z
  .object({
    scenarioId: z.string().uuid(),
    projectId: z.string().uuid(),
    specs: z.array(TestScenarioLinkedSpecSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("TestScenarioSpecLinkListResponse");

const TestScenarioObservedIssueSchema = z
  .object({
    id: z.string().uuid(),
    createdAt: z.string(),
    updatedAt: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string().nullable(),
    portal: z.string().nullable(),
    service: z.string().nullable(),
    ticket: z.string().nullable(),
    createdBy: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
        createdAt: z.string(),
      })
      .nullable(),
    updatedBy: z
      .object({
        id: z.string().uuid(),
        name: z.string(),
        email: z.string(),
        createdAt: z.string(),
      })
      .nullable(),
  })
  .openapi("TestScenarioObservedIssue");

const TestScenarioResultsResponseSchema = z
  .object({
    scenarioId: z.string().uuid(),
    projectId: z.string().uuid(),
    linkedSpecCount: z.number().int().nonnegative(),
    results: z.array(ResultSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("TestScenarioResultsResponse");

const TestScenarioIssuesResponseSchema = z
  .object({
    scenarioId: z.string().uuid(),
    projectId: z.string().uuid(),
    linkedSpecCount: z.number().int().nonnegative(),
    issues: z.array(TestScenarioObservedIssueSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive().max(100),
    totalPages: z.number().int().nonnegative(),
  })
  .openapi("TestScenarioIssuesResponse");

export function registerTestScenarioRoutes(registry: OpenAPIRegistry): void {
  registry.register("TestScenario", TestScenarioSchema);
  registry.register(
    "CreateTestScenarioRequest",
    CreateTestScenarioRequestSchema,
  );
  registry.register(
    "TestScenarioCreatorSummary",
    TestScenarioCreatorSummarySchema,
  );
  registry.register("TestScenarioSummary", TestScenarioSummarySchema);
  registry.register(
    "UpdateTestScenarioRequest",
    UpdateTestScenarioRequestSchema,
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
  registry.register(
    "TestScenarioSpecLinkBody",
    TestScenarioSpecLinkBodySchema,
  );
  registry.register(
    "TestScenarioSpecLinkResponse",
    TestScenarioSpecLinkResponseSchema,
  );
  registry.register(
    "TestScenarioLinkedSpec",
    TestScenarioLinkedSpecSchema,
  );
  registry.register(
    "TestScenarioSpecLinkListQuery",
    TestScenarioSpecLinkListQuerySchema,
  );
  registry.register(
    "TestScenarioSpecLinkDeleteParams",
    TestScenarioSpecLinkDeleteParamsSchema,
  );
  registry.register("TestScenarioEvidenceQuery", TestScenarioEvidenceQuerySchema);
  registry.register(
    "TestScenarioSpecLinkListResponse",
    TestScenarioSpecLinkListResponseSchema,
  );
  registry.register(
    "TestScenarioObservedIssue",
    TestScenarioObservedIssueSchema,
  );
  registry.register(
    "TestScenarioResultsResponse",
    TestScenarioResultsResponseSchema,
  );
  registry.register(
    "TestScenarioIssuesResponse",
    TestScenarioIssuesResponseSchema,
  );

  const errorResponse = (description: string) => ({
    description,
    content: {
      "application/json": { schema: ErrorResponseSchema },
    },
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/test-scenarios/{scenarioId}/spec-links",
    description: "Links a project-local Spec to a test scenario.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioProjectQuerySchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: TestScenarioSpecLinkBodySchema },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Test scenario Spec link created",
        content: {
          "application/json": { schema: TestScenarioSpecLinkResponseSchema },
        },
      },
      400: errorResponse("Invalid scenario, project, or Spec link input"),
      401: errorResponse("Unauthorized"),
      404: errorResponse("Test scenario or Spec not found in the project"),
      409: errorResponse("The scenario/Spec link already exists"),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/test-scenarios/{scenarioId}",
    description:
      "Partially updates a test scenario within a project context. At least one of title, Markdown, or plain-text details is required; omitted fields are preserved and details may be cleared with null.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioProjectQuerySchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: UpdateTestScenarioRequestSchema },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Updated test scenario details",
        content: {
          "application/json": { schema: TestScenarioSchema },
        },
      },
      400: errorResponse("Invalid scenario, project, or update input"),
      401: errorResponse("Unauthorized"),
      404: errorResponse("Test scenario not found in the requested project"),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/test-scenarios/{scenarioId}/spec-links",
    description: "Lists Specs linked to a test scenario.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioSpecLinkListQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated linked Specs",
        content: {
          "application/json": {
            schema: TestScenarioSpecLinkListResponseSchema,
          },
        },
      },
      400: errorResponse("Invalid scenario, project, or pagination query"),
      401: errorResponse("Unauthorized"),
      404: errorResponse("Test scenario not found in the project"),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/test-scenarios/{scenarioId}/spec-links/{specId}",
    description: "Removes a Spec link without deleting either endpoint.",
    request: {
      params: TestScenarioSpecLinkDeleteParamsSchema,
      query: TestScenarioProjectQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      204: { description: "Test scenario Spec link removed" },
      400: errorResponse("Invalid scenario, project, or Spec identifier"),
      401: errorResponse("Unauthorized"),
      404: errorResponse("Test scenario Spec link not found in the project"),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/test-scenarios/{scenarioId}/results",
    description: "Lists paginated execution Results across linked Specs.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioEvidenceQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated scenario Result evidence",
        content: {
          "application/json": { schema: TestScenarioResultsResponseSchema },
        },
      },
      400: errorResponse("Invalid scenario, project, or pagination query"),
      401: errorResponse("Unauthorized"),
      404: errorResponse("Test scenario not found in the project"),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/test-scenarios/{scenarioId}/issues",
    description: "Lists paginated observed Issues across linked Specs.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioEvidenceQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Paginated scenario Issue evidence",
        content: {
          "application/json": { schema: TestScenarioIssuesResponseSchema },
        },
      },
      400: errorResponse("Invalid scenario, project, or pagination query"),
      401: errorResponse("Unauthorized"),
      404: errorResponse("Test scenario not found in the project"),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/test-scenarios",
    description:
      "Creates a project-scoped Markdown test scenario with optional plain-text details.",
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
    description:
      "Lists lightweight project-scoped Test Scenario summaries without Markdown bodies.",
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
    description:
      "Retrieves a complete test scenario, including nullable plain-text details and exact raw Markdown, within a project context.",
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
  TestScenarioCreatorSummarySchema,
  UpdateTestScenarioRequestSchema,
  TestScenarioEvidenceQuerySchema,
  TestScenarioIdParamsSchema,
  TestScenarioIssuesResponseSchema,
  TestScenarioLinkedSpecSchema,
  TestScenarioListQuerySchema,
  TestScenarioListResponseSchema,
  TestScenarioObservedIssueSchema,
  TestScenarioProjectQuerySchema,
  TestScenarioResultsResponseSchema,
  TestScenarioSpecLinkBodySchema,
  TestScenarioSpecLinkDeleteParamsSchema,
  TestScenarioSpecLinkListQuerySchema,
  TestScenarioSpecLinkListResponseSchema,
  TestScenarioSpecLinkResponseSchema,
  TestScenarioSchema,
  TestScenarioSummarySchema,
};
