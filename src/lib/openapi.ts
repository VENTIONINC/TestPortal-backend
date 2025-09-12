import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from "@asteasolutions/zod-to-openapi";
import { z } from "zod";
import { IssueCategory } from "@/types/enums";

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z);

// Common response schemas
const ErrorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorResponse");

const SuccessResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi("SuccessResponse");

// Issue schemas
const IssueSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
    createdById: z.number().optional(),
    updatedById: z.number().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Issue");

const CreateIssueRequestSchema = z
  .object({
    name: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
  })
  .openapi("CreateIssueRequest");

const UpdateIssueRequestSchema = z
  .object({
    name: z.string().optional(),
    category: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
  })
  .openapi("UpdateIssueRequest");

// Result schemas
const ResultSchema = z
  .object({
    id: z.string(),
    tag: z.string().optional(),
    specId: z.string().optional(),
    specFile: z.string().optional(),
    specName: z.string().optional(),
    environment: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    reportPortalLink: z.string().optional(),
    retry: z.number().optional(),
    duration: z.number().optional(),
    startTime: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Result");

// Spec schemas
const SpecSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    custom_id: z.string().optional(),
    file: z.string().optional(),
    tags: z.array(z.string()).optional(),
    annotations: z.array(z.string()).optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Spec");

// Assumption schemas
const AssumptionSchema = z
  .object({
    id: z.string(),
    issueId: z.number(),
    resultErrorId: z.number(),
    madeBy: z.string().optional(),
    isConfirmed: z.boolean().optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Assumption");

const CreateAssumptionRequestSchema = z
  .object({
    issueId: z.number(),
    resultErrorId: z.number(),
    madeBy: z.string().optional(),
    isConfirmed: z.boolean().optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.string().optional(),
    score: z.number().optional(),
  })
  .openapi("CreateAssumptionRequest");

const UpdateAssumptionRequestSchema = z
  .object({
    madeBy: z.string().optional(),
    isConfirmed: z.boolean().optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.string().optional(),
  })
  .openapi("UpdateAssumptionRequest");

// Result Error schemas
const ResultErrorSchema = z
  .object({
    id: z.string(),
    resultId: z.string(),
    errorMessage: z.string(),
    stackTrace: z.string().optional(),
    assertionInfo: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("ResultError");

const AssignIssueRequestSchema = z
  .object({
    issueId: z.number(),
  })
  .openapi("AssignIssueRequest");

const BulkReviewRequestSchema = z
  .object({
    errorIds: z.array(z.number()),
  })
  .openapi("BulkReviewRequest");

// Test Analysis schemas
const TestAnalysisRequestSchema = z
  .object({
    testResults: z.array(z.any()).optional(),
  })
  .openapi("TestAnalysisRequest");

const TestResultAnalysisSchema = z
  .object({
    id: z.string(),
    status: z.enum(["passed", "failed"]),
    category: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .optional(),
    confidence: z.number().min(0).max(1),
    conclusion: z.string().optional(),
  })
  .openapi("TestResultAnalysis");

// Result analysis update schemas
const UpdateResultAnalysisRequestSchema = z
  .object({
    analysisStatus: z.enum(["passed", "failed"]).optional(),
    analysisCategory: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .optional(),
    analysisConfidence: z.number().min(0).max(1).optional(),
    analysisConclusion: z.string().optional(),
  })
  .openapi("UpdateResultAnalysisRequest");

const TestAnalysisResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.object({
      dataSource: z.string(),
      totalTests: z.number(),
      analysisResults: z.array(TestResultAnalysisSchema),
    }),
  })
  .openapi("TestAnalysisResponse");

// Execution schemas
const ExecutionSchema = z
  .object({
    id: z.string(),
    runId: z.string(),
    env: z.string().optional(),
    version: z.string().optional(),
    startTime: z.string(),
    endTime: z.string().optional(),
    status: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("Execution");

// JSON Report schemas
const JsonReportTestResultSchema = z
  .object({
    reportPortalLink: z.string().optional(),
    retry: z.number().optional(),
    status: z.string(),
    duration: z.number().optional(),
    startTime: z.string(),
    error: z
      .object({
        message: z.string(),
        stack: z.string().optional(),
        assertion: z.string().optional(),
      })
      .optional(),
  })
  .openapi("JsonReportTestResult");

const JsonReportTestSpecSchema = z
  .object({
    title: z.string(),
    custom_id: z.string().optional(),
    location: z
      .object({
        file: z.string().optional(),
      })
      .optional(),
    tags: z.array(z.string()).optional(),
    annotations: z.array(z.string()).optional(),
    results: z.array(JsonReportTestResultSchema),
  })
  .openapi("JsonReportTestSpec");

const JsonReportRequestSchema = z
  .object({
    runId: z.string().optional(),
    env: z.string().optional(),
    version: z.string().optional(),
    identifierStrategy: z.enum(["time-period", "hourly", "daily"]).optional(),
    stats: z
      .object({
        startTime: z.string(),
      })
      .optional(),
    tests: z.array(JsonReportTestSpecSchema),
  })
  .openapi("JsonReportRequest");

const JsonReportResponseSchema = z
  .object({
    success: z.boolean(),
    executionId: z.number(),
    specsProcessed: z.number(),
  })
  .openapi("JsonReportResponse");

// Raw JSON Report schema - accepts the raw JSON structure from test files
const RawJsonReportRequestSchema = z
  .object({
    runId: z.string().optional(),
    hash: z.string().optional(),
    config: z
      .object({
        env: z.string().optional(),
        version: z.string().optional(),
      })
      .optional(),
    stats: z
      .object({
        startTime: z.string().optional(),
      })
      .optional(),
    suites: z.array(z.any()).optional(), // Raw suites structure
  })
  .openapi("RawJsonReportRequest");

// Status schemas
const StatusResponseSchema = z
  .object({
    status: z.string(),
    database: z.string(),
    version: z.string(),
    timestamp: z.string().optional(),
  })
  .openapi("StatusResponse");

// User schemas
const UserSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    mcpToken: z.string().optional(),
    reportPortalUrl: z.string().nullable().optional(),
    reportPortalEnabled: z.boolean(),
    monitoringPortalUrl: z.string().nullable().optional(),
    monitoringPortalEnabled: z.boolean(),
  })
  .openapi("User");

const UserSignupRequestSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    password: z.string(),
  })
  .openapi("UserSignupRequest");

const UserLoginRequestSchema = z
  .object({
    email: z.string(),
    password: z.string(),
  })
  .openapi("UserLoginRequest");

const UserLoginResponseSchema = z
  .object({
    user: UserSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .openapi("UserLoginResponse");

const RefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string(),
  })
  .openapi("RefreshTokenRequest");

const UserUpdateRequestSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
  })
  .openapi("UserUpdateRequest");

const UserIntegrationsUpdateRequestSchema = z
  .object({
    reportPortalUrl: z.string().nullable().optional(),
    reportPortalEnabled: z.boolean().optional(),
    monitoringPortalUrl: z.string().nullable().optional(),
    monitoringPortalEnabled: z.boolean().optional(),
  })
  .openapi("UserIntegrationsUpdateRequest");

// MCP Token schemas
const McpTokenResponseSchema = z
  .object({
    token: z.string(),
    expiresAt: z.string(),
    message: z.string(),
  })
  .openapi("McpTokenResponse");

// Results Stats schemas
const ResultsStatsSchema = z
  .object({
    byStatus: z.object({
      passed: z.number(),
      failed: z.number(),
      skipped: z.number(),
      timedOut: z.number(),
    }),
    byStatusTotal: z.number(),
    entityCounts: z.object({
      specs: z.number(),
      results: z.number(),
      executions: z.number(),
      issues: z.number(),
      errors: z.number(),
      assumptions: z.number(),
    }),
    topErrors: z.array(
      z.object({
        title: z.string(),
        count: z.number(),
      }),
    ),
    topIssues: z.array(
      z.object({
        title: z.string(),
        count: z.number(),
      }),
    ),
  })
  .openapi("ResultsStats");

// Project schemas
const ProjectSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    ownerId: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
    _count: z.object({
      executions: z.number(),
      specs: z.number(),
      issues: z.number(),
    }).optional(),
  })
  .openapi("Project");

const CreateProjectRequestSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
  })
  .openapi("CreateProjectRequest");

const UpdateProjectRequestSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  })
  .openapi("UpdateProjectRequest");

// Error Formatter schemas
const ErrorFormatterRequestSchema = z
  .object({
    name: z.string().min(1, "Name cannot be empty").max(100, "Name is too long"),
    description: z.string().min(1, "Description cannot be empty").max(2000, "Description is too long"),
    category: z.string().min(1, "Category cannot be empty").max(50, "Category is too long"),
  })
  .openapi("ErrorFormatterRequest");

const ErrorFormatterResponseSchema = z
  .object({
    original: z.object({
      name: z.string(),
      description: z.string(),
      category: z.string(),
    }),
    formatted: z.object({
      name: z.string(),
      description: z.string(),
    }),
  })
  .openapi("ErrorFormatterResponse");

// Prompt schemas
const PromptParameterSchema = z
  .object({
    type: z.string(),
    required: z.boolean(),
    description: z.string(),
    example: z.string().optional(),
  })
  .openapi("PromptParameter");

const PromptConfigSchema = z
  .object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.enum(["development", "reporting", "analysis", "performance"]),
    parameters: z.record(z.string(), PromptParameterSchema),
  })
  .openapi("PromptConfig");

const PromptsListResponseSchema = z
  .object({
    prompts: z.array(PromptConfigSchema),
  })
  .openapi("PromptsListResponse");

const GeneratePromptRequestSchema = z
  .record(z.string(), z.any())
  .openapi("GeneratePromptRequest");

const GeneratePromptResponseSchema = z
  .object({
    name: z.string(),
    parameters: z.record(z.string(), z.any()),
    generated_prompt: z.string(),
  })
  .openapi("GeneratePromptResponse");

export function generateOpenAPISpec() {
  const registry = new OpenAPIRegistry();

  // Register all schemas
  registry.register("ErrorResponse", ErrorResponseSchema);
  registry.register("SuccessResponse", SuccessResponseSchema);
  registry.register("Issue", IssueSchema);
  registry.register("CreateIssueRequest", CreateIssueRequestSchema);
  registry.register("UpdateIssueRequest", UpdateIssueRequestSchema);
  registry.register("Result", ResultSchema);
  registry.register("Spec", SpecSchema);
  registry.register("Assumption", AssumptionSchema);
  registry.register("CreateAssumptionRequest", CreateAssumptionRequestSchema);
  registry.register("UpdateAssumptionRequest", UpdateAssumptionRequestSchema);
  registry.register("ResultError", ResultErrorSchema);
  registry.register("AssignIssueRequest", AssignIssueRequestSchema);
  registry.register("BulkReviewRequest", BulkReviewRequestSchema);
  registry.register("Execution", ExecutionSchema);
  registry.register("JsonReportRequest", JsonReportRequestSchema);
  registry.register("JsonReportResponse", JsonReportResponseSchema);
  registry.register("JsonReportTestSpec", JsonReportTestSpecSchema);
  registry.register("JsonReportTestResult", JsonReportTestResultSchema);
  registry.register("RawJsonReportRequest", RawJsonReportRequestSchema);
  registry.register("StatusResponse", StatusResponseSchema);
  registry.register("User", UserSchema);
  registry.register("UserSignupRequest", UserSignupRequestSchema);
  registry.register("UserLoginRequest", UserLoginRequestSchema);
  registry.register("UserLoginResponse", UserLoginResponseSchema);
  registry.register("RefreshTokenRequest", RefreshTokenRequestSchema);
  registry.register("UserUpdateRequest", UserUpdateRequestSchema);
  registry.register("UserIntegrationsUpdateRequest", UserIntegrationsUpdateRequestSchema);
  registry.register("McpTokenResponse", McpTokenResponseSchema);
  registry.register("ResultsStats", ResultsStatsSchema);
  registry.register(
    "UpdateResultAnalysisRequest",
    UpdateResultAnalysisRequestSchema,
  );
  registry.register("ErrorFormatterRequest", ErrorFormatterRequestSchema);
  registry.register("ErrorFormatterResponse", ErrorFormatterResponseSchema);
  registry.register("PromptParameter", PromptParameterSchema);
  registry.register("PromptConfig", PromptConfigSchema);
  registry.register("PromptsListResponse", PromptsListResponseSchema);
  registry.register("GeneratePromptRequest", GeneratePromptRequestSchema);
  registry.register("GeneratePromptResponse", GeneratePromptResponseSchema);
  registry.register("Project", ProjectSchema);
  registry.register("CreateProjectRequest", CreateProjectRequestSchema);
  registry.register("UpdateProjectRequest", UpdateProjectRequestSchema);

  // Base route
  registry.registerPath({
    method: "get",
    path: "/api/v1/",
    description: "Welcome endpoint",
    responses: {
      200: {
        description: "Welcome message",
        content: {
          "text/plain": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["System"],
  });

  // Issues routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/issues",
    description: "Retrieves all issues",
    request: {
      query: z.object({
        category: z.nativeEnum(IssueCategory).optional(),
        name: z.string().optional(),
        page: z.number().default(1).optional(),
        limit: z.number().default(30).optional(),
      }),
    },
    responses: {
      200: {
        description: "List of issues",
        content: {
          "application/json": {
            schema: z.array(IssueSchema),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/issues/with-stats",
    description:
      "Retrieves all issues with their statistics including occurrence count, first/last occurrence, impacted tests count, and time-based distribution. Optionally filter statistics by date range.",
    request: {
      query: z.object({
        category: z.nativeEnum(IssueCategory).optional(),
        name: z.string().optional(),
        page: z.number().default(1).optional(),
        limit: z.number().default(10).optional(),
        statFrom: z
          .string()
          .datetime()
          .optional()
          .describe(
            "Start date for statistics in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
          ),
        statTo: z
          .string()
          .datetime()
          .optional()
          .describe(
            "End date for statistics in ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)",
          ),
      }),
    },
    responses: {
      200: {
        description: "List of issues with statistics",
        content: {
          "application/json": {
            schema: z.object({
              issues: z.array(
                z.object({
                  ...IssueSchema.shape,
                  statistics: z.object({
                    occurrenceCount: z.number(),
                    firstOccurrence: z.date().nullable(),
                    lastOccurrence: z.date().nullable(),
                    impactedTestsCount: z.number(),
                    timeDistribution: z.array(
                      z.object({
                        date: z.string(),
                        count: z.number(),
                      }),
                    ),
                  }),
                }),
              ),
              total: z.number(),
              page: z.number(),
              totalPages: z.number(),
            }),
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/issues/{issueId}",
    description:
      "Deletes an issue by its ID. Also deletes all associated assumptions (cascade delete).",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
    },
    responses: {
      200: {
        description:
          "Issue and all associated assumptions deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string(),
              issue: IssueSchema,
            }),
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues", "Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/issues/{issueId}",
    description: "Retrieves an issue by its ID",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
    },
    responses: {
      200: {
        description: "Issue details",
        content: {
          "application/json": {
            schema: IssueSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/issues",
    description: "Creates a new issue",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateIssueRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Issue created successfully",
        content: {
          "application/json": {
            schema: IssueSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/issues/{issueId}",
    description: "Updates an existing issue",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateIssueRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Issue updated successfully",
        content: {
          "application/json": {
            schema: IssueSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues", "Results"],
  });

  // Register security schemes
  registry.registerComponent("securitySchemes", "BearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "JWT Bearer token authentication",
  });

  registry.registerComponent("securitySchemes", "McpBearerAuth", {
    type: "http", 
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "MCP Bearer token authentication",
  });

  // MCP session header parameter (not for authentication)
  const McpSessionHeaderParam = z.string().openapi({
    param: {
      name: "mcp-session-id",
      in: "header",
    },
    description: "MCP session ID",
    example: "session_12345",
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/issues",
    description: "Retrieves all issues (requires authentication)",
    request: {
      query: z.object({
        category: z.string().optional(),
        name: z.string().optional(),
        page: z.number().default(1).optional(),
        limit: z.number().default(30).optional(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of issues",
        content: {
          "application/json": {
            schema: z.array(IssueSchema),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/issues/{issueId}",
    description: "Retrieves an issue by its ID (requires authentication)",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Issue details",
        content: {
          "application/json": {
            schema: IssueSchema,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/issues",
    description: "Creates a new issue (requires authentication)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateIssueRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Issue created successfully",
        content: {
          "application/json": {
            schema: IssueSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/issues/{issueId}",
    description: "Updates an existing issue (requires authentication)",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateIssueRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Issue updated successfully",
        content: {
          "application/json": {
            schema: IssueSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/issues/{issueId}",
    description:
      "Deletes an issue by its ID (requires authentication). Also deletes all associated assumptions (cascade delete).",
    request: {
      params: z.object({
        issueId: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description:
          "Issue and all associated assumptions deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string(),
              issue: IssueSchema,
            }),
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Issue not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Issues", "Results"],
  });

  // Results routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/results",
    description: "Retrieves results with optional filtering (requires projectId)",
    request: {
      query: z.object({
        projectId: z.number(),
        tag: z.string().optional(),
        specId: z.string().optional(),
        specFile: z.string().optional(),
        specName: z.string().optional(),
        environment: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
        reviewStatus: z.string().optional(),
        errorMessage: z.string().optional(),
        issueName: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        page: z.number().default(1).optional(),
        limit: z.number().default(1000).optional(),
      }),
    },
    responses: {
      200: {
        description: "List of results",
        content: {
          "application/json": {
            schema: z.array(ResultSchema),
          },
        },
      },
      400: {
        description: "Bad request - projectId is required or invalid",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/results/{resultId}",
    description: "Retrieves a specific result by its ID",
    request: {
      params: z.object({
        resultId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Result details",
        content: {
          "application/json": {
            schema: ResultSchema,
          },
        },
      },
      404: {
        description: "Result not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/results-stats",
    description:
      "Retrieves statistical analysis of test results including status counts, entity counts, and top errors/issues for specified dates",
    request: {
      query: z.object({
        dates: z
          .array(z.string())
          .optional()
          .describe(
            "Array of dates in YYYY-MM-DD format to filter results. If not provided, returns stats for all results.",
          ),
      }),
    },
    responses: {
      200: {
        description: "Results statistics",
        content: {
          "application/json": {
            schema: ResultsStatsSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/results/{resultId}/analysis",
    description: "Updates the analysis fields of a specific result",
    request: {
      params: z.object({
        resultId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateResultAnalysisRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Result analysis updated successfully",
        content: {
          "application/json": {
            schema: ResultSchema,
          },
        },
      },
      400: {
        description: "Bad request - Invalid input data",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Results"],
  });

  // Specs routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/specs/{specId}",
    description: "Retrieves a specific spec by its ID",
    request: {
      params: z.object({
        specId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Spec details",
        content: {
          "application/json": {
            schema: SpecSchema,
          },
        },
      },
      404: {
        description: "Spec not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Specs"],
  });

  // Assumptions routes
  registry.registerPath({
    method: "post",
    path: "/api/v1/assumptions",
    description: "Creates a new assumption",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateAssumptionRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Assumption created successfully",
        content: {
          "application/json": {
            schema: AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions", "Results"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/assumptions/{assumptionId}",
    description: "Updates an existing assumption",
    request: {
      params: z.object({
        assumptionId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateAssumptionRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Assumption updated successfully",
        content: {
          "application/json": {
            schema: AssumptionSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Assumption not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Assumptions", "Results"],
  });

  // Result Errors routes
  registry.registerPath({
    method: "patch",
    path: "/api/v1/result-errors/{resultErrorId}/assign-issue",
    description: "Assigns an issue to a specific result error",
    request: {
      params: z.object({
        resultErrorId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: AssignIssueRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Issue assigned successfully",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result error not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/result-errors/{resultErrorId}/review",
    description: "Reviews a specific result error",
    request: {
      params: z.object({
        resultErrorId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Result error reviewed successfully",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Result error not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v1/result-errors/bulk-review",
    description: "Performs a bulk review of result errors",
    request: {
      body: {
        content: {
          "application/json": {
            schema: BulkReviewRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Bulk review completed successfully",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Result Errors"],
  });

  // Executions routes
  registry.registerPath({
    method: "get",
    path: "/api/v1/executions/{executionId}",
    description: "Retrieves an execution by its ID",
    request: {
      params: z.object({
        executionId: z.string(),
      }),
    },
    responses: {
      200: {
        description: "Execution details",
        content: {
          "application/json": {
            schema: ExecutionSchema,
          },
        },
      },
      404: {
        description: "Execution not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Executions"],
  });

  // JSON Report route
  registry.registerPath({
    method: "post",
    path: "/api/v1/json-report",
    description: "Processes and stores a JSON test report",
    request: {
      body: {
        content: {
          "application/json": {
            schema: JsonReportRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Report processed successfully",
        content: {
          "application/json": {
            schema: JsonReportResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request data or processing error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Reports"],
  });

  // File Upload JSON Report route
  registry.registerPath({
    method: "post",
    path: "/api/v1/json-report/upload",
    description:
      "Accepts JSON test report files for processing. Supports large files that exceed POST body size limits.",
    request: {
      body: {
        content: {
          "multipart/form-data": {
            schema: z.object({
              report: z.string().openapi({
                type: "string",
                format: "binary",
                description: "JSON test report file to upload",
              }),
            }),
          },
        },
      },
    },
    responses: {
      201: {
        description: "File report processed successfully",
        content: {
          "application/json": {
            schema: JsonReportResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid file format, missing file, or processing error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Reports", "Results"],
  });

  // Status route
  registry.registerPath({
    method: "get",
    path: "/api/v1/status",
    description: "Checks the status of the server and its connections",
    responses: {
      200: {
        description: "Server status",
        content: {
          "application/json": {
            schema: StatusResponseSchema,
          },
        },
      },
      503: {
        description: "Service unavailable",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["System"],
  });

  // User Authentication routes
  registry.registerPath({
    method: "post",
    path: "/api/v2/users/signup",
    description: "Creates a new user account with secure password hashing",
    request: {
      body: {
        content: {
          "application/json": {
            schema: UserSignupRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "User created successfully",
        content: {
          "application/json": {
            schema: UserSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Authentication"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/users/login",
    description: "Authenticates user credentials and returns JWT tokens",
    request: {
      body: {
        content: {
          "application/json": {
            schema: UserLoginRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description:
          "Login successful - returns user data, access token, and refresh token",
        content: {
          "application/json": {
            schema: UserLoginResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid credentials",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Authentication"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/users/refresh-token",
    description: "Refreshes access token using a valid refresh token",
    request: {
      body: {
        content: {
          "application/json": {
            schema: RefreshTokenRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description:
          "Token refresh successful - returns new access and refresh tokens",
        content: {
          "application/json": {
            schema: UserLoginResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - refresh token is required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or expired refresh token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Authentication"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/users/{userId}",
    description: "Retrieves user information by ID (requires authentication)",
    request: {
      params: z.object({
        userId: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "User details",
        content: {
          "application/json": {
            schema: UserSchema,
          },
        },
      },
      400: {
        description: "Bad request",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Users"],
  });

  registry.registerPath({
    method: "patch",
    path: "/api/v2/users/{userId}",
    description: "Updates user information (requires authentication)",
    request: {
      params: z.object({
        userId: z.number(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UserUpdateRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "User updated successfully",
        content: {
          "application/json": {
            schema: UserSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Users"],
  });

  // User Integrations route
  registry.registerPath({
    method: "patch",
    path: "/api/v2/users/{userId}/integrations",
    description: "Updates user integration settings for Report Portal and Monitoring Portal (requires authentication)",
    request: {
      params: z.object({
        userId: z.number(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UserIntegrationsUpdateRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "User integrations updated successfully",
        content: {
          "application/json": {
            schema: UserSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors or invalid URL format",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Users"],
  });

  // MCP Token management routes
  registry.registerPath({
    method: "post",
    path: "/api/v2/users/{userId}/mcp-token",
    description: "Generates a new MCP token for the user (requires authentication)",
    request: {
      params: z.object({
        userId: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "MCP token generated successfully",
        content: {
          "application/json": {
            schema: McpTokenResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid user ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Forbidden - user can only generate tokens for themselves",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["MCP"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/users/{userId}/mcp-token",
    description: "Revokes the user's MCP token (requires authentication)",
    request: {
      params: z.object({
        userId: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "MCP token revoked successfully",
        content: {
          "application/json": {
            schema: SuccessResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid user ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Forbidden - user can only revoke their own tokens",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "User not found or no MCP token to revoke",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["MCP"],
  });

  // Test Analysis endpoint
  registry.registerPath({
    method: "post",
    path: "/api/v1/test-analysis/analyze",
    description:
      "Analyzes test results using AI to categorize failures and provide insights",
    request: {
      body: {
        content: {
          "application/json": {
            schema: TestAnalysisRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Test analysis completed successfully",
        content: {
          "application/json": {
            schema: TestAnalysisResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid test results format",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - analysis failed",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Test Analysis"],
  });

  // Error Formatter endpoint
  registry.registerPath({
    method: "post",
    path: "/api/v2/error-formatter",
    description: "Formats error information using AI to make it clear and actionable (requires authentication)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: ErrorFormatterRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Error formatted successfully",
        content: {
          "application/json": {
            schema: ErrorFormatterResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid input format",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error - formatting failed",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Error Formatter"],
  });

  // Prompts routes
  registry.registerPath({
    method: "get",
    path: "/api/v2/prompts",
    description: "Retrieves a list of all prompt configurations with their metadata and parameters (requires authentication)",
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of available prompts",
        content: {
          "application/json": {
            schema: PromptsListResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Prompts"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/prompts/{name}",
    description: "Retrieves the configuration for a specific prompt by name (requires authentication)",
    request: {
      params: z.object({
        name: z.enum(["developer-code-assistant", "test-portal-assistant", "issue-analysis-assistant", "environment-performance-assistant"]),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Prompt configuration",
        content: {
          "application/json": {
            schema: PromptConfigSchema,
          },
        },
      },
      400: {
        description: "Bad request - prompt name is required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Prompt not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Prompts"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/prompts/{name}/generate",
    description: "Generates a prompt using the specified template and provided parameters (requires authentication)",
    request: {
      params: z.object({
        name: z.enum(["developer-code-assistant", "test-portal-assistant", "issue-analysis-assistant", "environment-performance-assistant"]),
      }),
      body: {
        content: {
          "application/json": {
            schema: GeneratePromptRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Generated prompt",
        content: {
          "application/json": {
            schema: GeneratePromptResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - prompt name is required",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Prompt not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Prompts"],
  });

  // Projects routes
  registry.registerPath({
    method: "get",
    path: "/api/v2/projects",
    description: "Retrieves all projects for the authenticated user (requires authentication)",
    request: {
      query: z.object({
        ownerId: z.number().optional(),
        isActive: z.boolean().optional(),
        name: z.string().optional(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "List of projects",
        content: {
          "application/json": {
            schema: z.array(ProjectSchema),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      500: {
        description: "Internal server error",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v2/projects/{id}",
    description: "Retrieves a specific project by ID (requires authentication)",
    request: {
      params: z.object({
        id: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Project details",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid project ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "post",
    path: "/api/v2/projects",
    description: "Creates a new project (requires authentication)",
    request: {
      body: {
        content: {
          "application/json": {
            schema: CreateProjectRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      201: {
        description: "Project created successfully",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors or name already exists",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "put",
    path: "/api/v2/projects/{id}",
    description: "Updates an existing project (requires authentication)",
    request: {
      params: z.object({
        id: z.number(),
      }),
      body: {
        content: {
          "application/json": {
            schema: UpdateProjectRequestSchema,
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Project updated successfully",
        content: {
          "application/json": {
            schema: ProjectSchema,
          },
        },
      },
      400: {
        description: "Bad request - validation errors or name already exists",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v2/projects/{id}",
    description: "Deletes a project by ID (requires authentication). Also deletes all associated executions, specs, and results (cascade delete).",
    request: {
      params: z.object({
        id: z.number(),
      }),
    },
    security: [{ BearerAuth: [] }],
    responses: {
      200: {
        description: "Project and all associated data deleted successfully",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string(),
              project: ProjectSchema,
            }),
          },
        },
      },
      400: {
        description: "Bad request - invalid project ID",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      404: {
        description: "Project not found",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
    tags: ["Projects"],
  });

  // MCP Server routes - requires MCP Bearer token
  registry.registerPath({
    method: "post",
    path: "/api/v1/mcp",
    description: "MCP server endpoint for tool execution (requires MCP Bearer token)",
    request: {
      headers: [McpSessionHeaderParam.optional()],
      body: {
        content: {
          "application/json": {
            schema: z.any().describe("MCP JSON-RPC request"),
          },
        },
      },
    },
    security: [{ McpBearerAuth: [] }],
    responses: {
      200: {
        description: "MCP response",
        content: {
          "application/json": {
            schema: z.any().describe("MCP JSON-RPC response"),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing MCP token",
        content: {
          "application/json": {
            schema: z.object({
              jsonrpc: z.string(),
              error: z.object({
                code: z.number(),
                message: z.string(),
              }),
              id: z.any().nullable(),
            }),
          },
        },
      },
      400: {
        description: "Bad request - invalid session or request format",
        content: {
          "application/json": {
            schema: z.object({
              jsonrpc: z.string(),
              error: z.object({
                code: z.number(),
                message: z.string(),
              }),
              id: z.any().nullable(),
            }),
          },
        },
      },
    },
    tags: ["MCP"],
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/mcp",
    description: "MCP session management endpoint (requires MCP Bearer token)",
    request: {
      headers: [McpSessionHeaderParam],
    },
    security: [{ McpBearerAuth: [] }],
    responses: {
      200: {
        description: "MCP session response",
        content: {
          "application/json": {
            schema: z.any().describe("MCP session data"),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing MCP token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid or missing session ID",
        content: {
          "text/plain": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["MCP"],
  });

  registry.registerPath({
    method: "delete",
    path: "/api/v1/mcp",
    description: "MCP session cleanup endpoint (requires MCP Bearer token)",
    request: {
      headers: [McpSessionHeaderParam],
    },
    security: [{ McpBearerAuth: [] }],
    responses: {
      200: {
        description: "Session cleanup successful",
        content: {
          "application/json": {
            schema: z.any().describe("MCP cleanup response"),
          },
        },
      },
      401: {
        description: "Unauthorized - invalid or missing MCP token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      400: {
        description: "Bad request - invalid or missing session ID",
        content: {
          "text/plain": {
            schema: z.string(),
          },
        },
      },
    },
    tags: ["MCP"],
  });

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
        description: "Project management endpoints for organizing test executions and results",
      },
    ],
  });
}

