// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import { ErrorResponseSchema } from "./common";
import { ResultSchema } from "./results";
import { z } from "./zod";
import type { ZodTypeAny } from "zod";
import { TEST_SCENARIO_SORT_FIELDS, TEST_SCENARIO_SORT_VALUES } from "@/types/testScenarios";

const TestScenarioSchema = z
  .object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    folderId: z.string().uuid().nullable(),
    createdById: z.string().uuid(),
    title: z.string(),
    scenarioKey: z.string().max(100).nullable(),
    details: z.string().nullable(),
    objective: z.string().nullable(),
    preconditions: z.string().nullable(),
    testData: z.string().nullable(),
    expectedResult: z.string().nullable(),
    notes: z.string().nullable(),
    steps: z.array(
      z
        .object({
          id: z.string().uuid(),
          position: z.number().int().nonnegative(),
          action: z.string(),
          expectedResult: z.string().nullable(),
        })
        .strict(),
    ),
    contentMd: z.string(),
    contentMdHash: z
      .string()
      .length(64)
      .regex(/^[a-f0-9]{64}$/),
    contentMdFormatVersion: z.number().int().positive(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("TestScenario");

const CreateTestScenarioStepSchema = z
  .object({
    action: z.string().min(1).regex(/\S/),
    expectedResult: z.string().min(1).regex(/\S/).optional(),
  })
  .strict()
  .openapi("CreateTestScenarioStep");

const CreateTestScenarioRequestSchema = z
  .object({
    projectId: z.string().uuid(),
    folderId: z.string().uuid().nullable().optional(),
    title: z.string().min(1).regex(/\S/),
    scenarioKey: z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/).nullable().optional(),
    details: z.string().min(1).regex(/\S/).optional(),
    objective: z.string().min(1).regex(/\S/).optional(),
    preconditions: z.string().min(1).regex(/\S/).optional(),
    testData: z.string().min(1).regex(/\S/).optional(),
    expectedResult: z.string().min(1).regex(/\S/).optional(),
    notes: z.string().min(1).regex(/\S/).optional(),
    steps: z.array(CreateTestScenarioStepSchema).default([]),
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
    scenarioKey: z.string().max(100).nullable(),
    details: z.string().nullable(),
    createdBy: TestScenarioCreatorSummarySchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    folderId: z.string().uuid().nullable(),
    folderName: z.string().nullable(),
    matchedSuiteId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .openapi("TestScenarioSummary");

const UpdateTestScenarioFieldSchema = z.string().min(1).regex(/\S/).nullable();

const updateTestScenarioFields = {
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).regex(/\S/).optional(),
  scenarioKey: z.string().trim().min(1).max(100).regex(/^[^\r\n]+$/).nullable().optional(),
  details: UpdateTestScenarioFieldSchema.optional(),
  objective: UpdateTestScenarioFieldSchema.optional(),
  preconditions: UpdateTestScenarioFieldSchema.optional(),
  testData: UpdateTestScenarioFieldSchema.optional(),
  expectedResult: UpdateTestScenarioFieldSchema.optional(),
  notes: UpdateTestScenarioFieldSchema.optional(),
};

const UpdateTestScenarioRequestSchema = z
  .object(updateTestScenarioFields)
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one editable field is required",
  })
  .openapi("UpdateTestScenarioRequest");

const AppendTestScenarioStepRequestSchema = z
  .object({
    action: z.string().min(1).regex(/\S/),
    expectedResult: z.string().min(1).regex(/\S/).optional(),
  })
  .strict()
  .openapi("AppendTestScenarioStepRequest");

const UpdateTestScenarioStepRequestSchema = z
  .object({
    action: z.string().min(1).regex(/\S/).optional(),
    expectedResult: UpdateTestScenarioFieldSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one step field is required",
  })
  .openapi("UpdateTestScenarioStepRequest");

const ReorderTestScenarioStepsRequestSchema = z
  .object({ stepIds: z.array(z.string().uuid()) })
  .strict()
  .openapi("ReorderTestScenarioStepsRequest");

const TestScenarioIdParamsSchema = z
  .object({
    scenarioId: z.string().uuid(),
  })
  .openapi("TestScenarioIdParams");

const TestScenarioStepParamsSchema = z
  .object({
    scenarioId: z.string().uuid(),
    stepId: z.string().uuid(),
  })
  .openapi("TestScenarioStepParams");

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
    search: z.string().trim().optional().openapi({
      description:
        "Optional surrounding whitespace is trimmed; the remaining value is matched as a case-insensitive literal substring of title or scenarioKey. Percent, underscore, and backslash are literal; details and other authored fields are not searched.",
      example: "login",
    }),
    createdById: z.string().uuid().optional().openapi({
      description:
        "Optional creator User UUID filter. It may identify any user; a valid UUID with no matching scenarios returns an empty page.",
      example: "33333333-3333-4333-8333-333333333333",
    }),
    sort: z
      .enum(TEST_SCENARIO_SORT_VALUES)
      .optional()
      .openapi({
        description:
          "Ordering: recently_created (createdAt DESC, id DESC), recently_updated (updatedAt DESC, id DESC), or title_asc (title ASC, id ASC).",
        example: "title_asc",
      }),
    sortField: z.enum(TEST_SCENARIO_SORT_FIELDS).optional().openapi({ description: "Single sort column. Defaults to createdAt descending when omitted. Cannot be combined with legacy sort.", example: "scenarioKey" }),
    sortDirection: z.enum(["asc", "desc"]).optional().openapi({ description: "Sort direction; defaults to desc when sortField is supplied. Requires sortField.", example: "asc" }),
    scenarioKey: z.string().trim().optional().openapi({ description: "Case-insensitive literal substring filter for the persisted scenario key; whitespace-only values are ignored." }),
    title: z.string().trim().optional().openapi({ description: "Case-insensitive literal substring filter for title; whitespace-only values are ignored." }),
    details: z.string().trim().optional().openapi({ description: "Case-insensitive literal substring filter for persisted details; whitespace-only values are ignored." }),
    folder: z.string().trim().optional().openapi({ description: "Case-insensitive literal substring filter for the displayed full folder path or Unfiled value; whitespace-only values are ignored." }),
    createdBy: z.string().trim().optional().openapi({ description: "Case-insensitive literal substring filter for creator display name or email; whitespace-only values are ignored." }),
    folderId: z.union([z.string().uuid(), z.literal("unfiled")]).optional(),
    includeDescendants: z.boolean().optional(),
    suiteId: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.sortDirection && !value.sortField) context.addIssue({ code: "custom", path: ["sortDirection"], message: "sortDirection requires sortField" });
    if (value.sortField && value.sort !== undefined) context.addIssue({ code: "custom", path: ["sort"], message: "sort cannot be combined with sortField" });
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

const OrganizationProjectQuerySchema = z.object({ projectId: z.string().uuid() });
const FolderBodySchema = z.object({ projectId: z.string().uuid(), name: z.string().min(1), parentId: z.string().uuid().nullable().optional(), position: z.number().int().nonnegative().optional() });
const FolderUpdateBodySchema = z.object({ name: z.string().min(1).optional(), parentId: z.string().uuid().nullable().optional(), position: z.number().int().nonnegative().optional() });
const SuiteBodySchema = z.object({ projectId: z.string().uuid(), name: z.string().min(1), description: z.string().nullable().optional(), purpose: z.string().nullable().optional(), release: z.string().nullable().optional() });
const SuiteUpdateBodySchema = z.object({ name: z.string().min(1).optional(), description: z.string().nullable().optional(), purpose: z.string().nullable().optional(), release: z.string().nullable().optional() });
const MembersBodySchema = z.object({ projectId: z.string().uuid(), scenarioIds: z.array(z.string().uuid()).min(1).max(100) });
const MemberOrderBodySchema = z.object({ projectId: z.string().uuid(), scenarioIds: z.array(z.string().uuid()) });
const BulkFolderBodySchema = z.object({ projectId: z.string().uuid(), scenarioIds: z.array(z.string().uuid()).min(1).max(100), folderId: z.string().uuid().nullable() });
const FolderResponseSchema: ZodTypeAny = z.object({
  id: z.string().uuid(), projectId: z.string().uuid(), parentId: z.string().uuid().nullable(),
  name: z.string(), position: z.number().int(), createdAt: z.string(), updatedAt: z.string(),
  scenarioCount: z.number().int().nonnegative(), _count: z.object({ scenarios: z.number().int().nonnegative() }),
  children: z.array(z.unknown()),
});
const FolderRecordResponseSchema = z.object({ id: z.string().uuid(), projectId: z.string().uuid(), parentId: z.string().uuid().nullable(), name: z.string(), position: z.number().int(), createdAt: z.string(), updatedAt: z.string() });
const SuiteMemberResponseSchema = z.object({ suiteId: z.string().uuid(), testScenarioId: z.string().uuid(), position: z.number().int(), createdAt: z.string() });
const SuiteResponseSchema = z.object({
  id: z.string().uuid(), projectId: z.string().uuid(), name: z.string(), description: z.string().nullable(),
  purpose: z.string().nullable(), release: z.string().nullable(), createdAt: z.string(), updatedAt: z.string(),
  members: z.array(SuiteMemberResponseSchema).optional(),
});
const DeletedResponseSchema = z.object({ deleted: z.literal(true) });
const MovedResponseSchema = z.object({ moved: z.number().int().nonnegative() });
const MemberOrderResponseSchema = z.object({ scenarioIds: z.array(z.string().uuid()) });
const FolderDeleteQuerySchema = OrganizationProjectQuerySchema.extend({ disposition: z.enum(["parent", "unfiled"]) });

function organizationResponseSchema(path: string, method: string): ZodTypeAny {
  if (path.includes("bulk-folder")) return MovedResponseSchema;
  if (path.endsWith("/members/order")) return MemberOrderResponseSchema;
  if (path.endsWith("/members")) return z.array(SuiteMemberResponseSchema);
  if (method === "delete") return DeletedResponseSchema;
  if (path.includes("test-scenario-folders")) return method === "get" ? z.array(FolderResponseSchema) : FolderRecordResponseSchema;
  if (path === "/api/v2/test-suites" && method === "get") return z.array(SuiteResponseSchema);
  return SuiteResponseSchema;
}

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
  registry.register("CreateTestScenarioStep", CreateTestScenarioStepSchema);
  registry.register(
    "TestScenarioCreatorSummary",
    TestScenarioCreatorSummarySchema,
  );
  registry.register("TestScenarioSummary", TestScenarioSummarySchema);
  registry.register(
    "UpdateTestScenarioRequest",
    UpdateTestScenarioRequestSchema,
  );
  registry.register(
    "AppendTestScenarioStepRequest",
    AppendTestScenarioStepRequestSchema,
  );
  registry.register(
    "UpdateTestScenarioStepRequest",
    UpdateTestScenarioStepRequestSchema,
  );
  registry.register(
    "ReorderTestScenarioStepsRequest",
    ReorderTestScenarioStepsRequestSchema,
  );
  registry.register("TestScenarioIdParams", TestScenarioIdParamsSchema);
  registry.register("TestScenarioStepParams", TestScenarioStepParamsSchema);
  registry.register("TestScenarioProjectQuery", TestScenarioProjectQuerySchema);
  registry.register("TestScenarioListQuery", TestScenarioListQuerySchema);
  registry.register("TestScenarioListResponse", TestScenarioListResponseSchema);
  registry.register("TestScenarioSpecLinkBody", TestScenarioSpecLinkBodySchema);
  registry.register(
    "TestScenarioSpecLinkResponse",
    TestScenarioSpecLinkResponseSchema,
  );
  registry.register("TestScenarioLinkedSpec", TestScenarioLinkedSpecSchema);
  registry.register(
    "TestScenarioSpecLinkListQuery",
    TestScenarioSpecLinkListQuerySchema,
  );
  registry.register(
    "TestScenarioSpecLinkDeleteParams",
    TestScenarioSpecLinkDeleteParamsSchema,
  );
  registry.register(
    "TestScenarioEvidenceQuery",
    TestScenarioEvidenceQuerySchema,
  );
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
      "Partially updates structured Test Scenario fields within a project context. Omitted fields are preserved, nullable fields may be cleared, and generated Markdown and steps are read-only.",
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
    method: "post",
    path: "/api/v2/test-scenarios/{scenarioId}/steps",
    description:
      "Appends a stable-ID step and regenerates the scenario projection.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioProjectQuerySchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: AppendTestScenarioStepRequestSchema },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Step appended; complete scenario returned",
        content: { "application/json": { schema: TestScenarioSchema } },
      },
      400: errorResponse("Invalid step or project context"),
      401: errorResponse("Unauthorized"),
      404: errorResponse("Test scenario not found in the requested project"),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/test-scenarios/{scenarioId}/steps/{stepId}",
    description: "Partially edits a project-scoped stable-ID step.",
    request: {
      params: TestScenarioStepParamsSchema,
      query: TestScenarioProjectQuerySchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: UpdateTestScenarioStepRequestSchema },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Step updated; complete scenario returned",
        content: { "application/json": { schema: TestScenarioSchema } },
      },
      400: errorResponse("Invalid step or project context"),
      401: errorResponse("Unauthorized"),
      404: errorResponse(
        "Test scenario or step not found in the requested project",
      ),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/test-scenarios/{scenarioId}/steps/{stepId}",
    description:
      "Deletes a step, compacts positions, and regenerates the projection.",
    request: {
      params: TestScenarioStepParamsSchema,
      query: TestScenarioProjectQuerySchema,
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Step deleted; complete scenario returned",
        content: { "application/json": { schema: TestScenarioSchema } },
      },
      400: errorResponse("Invalid step or project context"),
      401: errorResponse("Unauthorized"),
      404: errorResponse(
        "Test scenario or step not found in the requested project",
      ),
      500: errorResponse("Internal server error"),
    },
    tags: ["Test Scenarios"],
  });

  registry.registerPath({
    method: "put",
    path: "/api/v2/test-scenarios/{scenarioId}/steps/order",
    description:
      "Reorders all current steps using their complete stable-ID list.",
    request: {
      params: TestScenarioIdParamsSchema,
      query: TestScenarioProjectQuerySchema,
      body: {
        required: true,
        content: {
          "application/json": { schema: ReorderTestScenarioStepsRequestSchema },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Steps reordered; complete scenario returned",
        content: { "application/json": { schema: TestScenarioSchema } },
      },
      400: errorResponse(
        "stepIds must contain every current step exactly once",
      ),
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
      "Creates a project-scoped structured Test Scenario with optional initial steps and generated Markdown.",
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
      "Lists lightweight project-scoped Test Scenario summaries without Markdown bodies. Global search matches title or scenarioKey; the independent scenarioKey, title, details, folder-path, and creator-name/email filters are combined before sorting and pagination. Text matching is case-insensitive literal substring matching; whitespace-only column filters are ignored. sortField supports scenarioKey, title, details, folder, createdBy, createdAt, and updatedAt; sortDirection defaults to desc. Omit sortField for createdAt DESC then id DESC. Legacy sort presets remain supported and cannot be combined with sortField. Totals count matching scenarios.",
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
        description:
          "Invalid project, pagination, search type, creator User UUID, or sort value",
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
      "Retrieves a complete structured Test Scenario with ordered steps and exact persisted generated Markdown within a project context.",
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

  registry.register("OrganizationProjectQuery", OrganizationProjectQuerySchema);
  registry.register("TestScenarioFolderRequest", FolderBodySchema);
  registry.register("TestSuiteRequest", SuiteBodySchema);
  registry.register("TestSuiteMembersRequest", MembersBodySchema);
  registry.register("TestScenarioBulkFolderRequest", BulkFolderBodySchema);
  registry.register("TestScenarioFolderResponse", FolderResponseSchema);
  registry.register("TestSuiteMemberResponse", SuiteMemberResponseSchema);
  registry.register("TestSuiteResponse", SuiteResponseSchema);
  registry.register("TestScenarioOrganizationDeleteResponse", DeletedResponseSchema);
  registry.register("TestScenarioBulkFolderResponse", MovedResponseSchema);
  registry.register("TestSuiteMemberOrderResponse", MemberOrderResponseSchema);
  const orgErrors = { 400: { description: "Invalid request", content: { "application/json": { schema: ErrorResponseSchema } } }, 401: { description: "Unauthorized", content: { "application/json": { schema: ErrorResponseSchema } } }, 404: { description: "Project or resource not found", content: { "application/json": { schema: ErrorResponseSchema } } }, 409: { description: "Name conflict", content: { "application/json": { schema: ErrorResponseSchema } } }, 500: { description: "Internal server error", content: { "application/json": { schema: ErrorResponseSchema } } } };
  const projectQuery = { query: OrganizationProjectQuerySchema };
  for (const [path, methods] of Object.entries({
    "/api/v2/test-scenario-folders": ["get", "post"],
    "/api/v2/test-scenario-folders/{folderId}": ["patch", "delete"],
    "/api/v2/test-suites": ["get", "post"],
    "/api/v2/test-suites/{suiteId}": ["get", "patch", "delete"],
    "/api/v2/test-suites/{suiteId}/members": ["post", "delete"],
    "/api/v2/test-suites/{suiteId}/members/order": ["put"],
    "/api/v2/test-scenarios/bulk-folder": ["patch"],
  })) {
    for (const method of methods) registry.registerPath({
      method: method as "get" | "post" | "patch" | "delete" | "put",
      path,
      tags: ["Test Scenarios"],
      description: "Authenticated project-scoped test scenario organization operation.",
      request: method === "get" || (method === "delete" && !path.endsWith("/members"))
        ? { query: path.includes("{folderId}") && method === "delete" ? FolderDeleteQuerySchema : OrganizationProjectQuerySchema, ...(path.includes("{folderId}") ? { params: z.object({ folderId: z.string().uuid() }) } : path.includes("{suiteId}") ? { params: z.object({ suiteId: z.string().uuid() }) } : {}) }
        : { ...(path.includes("{folderId}") ? { params: z.object({ folderId: z.string().uuid() }) } : path.includes("{suiteId}") ? { params: z.object({ suiteId: z.string().uuid() }) } : {}), ...(method === "patch" && !path.includes("bulk-folder") ? projectQuery : {}), body: { content: { "application/json": { schema: path.includes("bulk-folder") ? BulkFolderBodySchema : path.endsWith("/members/order") ? MemberOrderBodySchema : path.includes("members") ? MembersBodySchema : path.includes("folders") ? (method === "patch" ? FolderUpdateBodySchema : FolderBodySchema) : (method === "patch" ? SuiteUpdateBodySchema : SuiteBodySchema) } } } },
      security: [{ BearerAuth: [] }],
      responses: {
        [method === "post" && (path === "/api/v2/test-scenario-folders" || path === "/api/v2/test-suites") ? 201 : 200]: {
          description: "Organization operation succeeded",
          content: { "application/json": { schema: organizationResponseSchema(path, method) } },
        },
        ...orgErrors,
      },
    });
  }
}

export {
  CreateTestScenarioRequestSchema,
  CreateTestScenarioStepSchema,
  TestScenarioCreatorSummarySchema,
  AppendTestScenarioStepRequestSchema,
  UpdateTestScenarioStepRequestSchema,
  ReorderTestScenarioStepsRequestSchema,
  UpdateTestScenarioRequestSchema,
  TestScenarioEvidenceQuerySchema,
  TestScenarioIdParamsSchema,
  TestScenarioStepParamsSchema,
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
