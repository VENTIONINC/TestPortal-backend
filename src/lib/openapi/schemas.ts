import { OpenAPIRegistry, extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

// Extend Zod with OpenAPI functionality
extendZodWithOpenApi(z);

// Common response schemas
export const ErrorResponseSchema = z
  .object({
    error: z.string(),
  })
  .openapi("ErrorResponse");

export const SuccessResponseSchema = z
  .object({
    message: z.string(),
  })
  .openapi("SuccessResponse");

// Issue schemas
export const IssueSchema = z
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

export const CreateIssueRequestSchema = z
  .object({
    name: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
    portal: z.string().optional(),
    service: z.string().optional(),
    ticket: z.string().optional(),
  })
  .openapi("CreateIssueRequest");

export const UpdateIssueRequestSchema = z
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
export const ResultSchema = z
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
export const SpecSchema = z
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
export const AssumptionSchema = z
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

export const CreateAssumptionRequestSchema = z
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

export const UpdateAssumptionRequestSchema = z
  .object({
    madeBy: z.string().optional(),
    isConfirmed: z.boolean().optional(),
    description: z.string().optional(),
    hypothesis: z.string().optional(),
    evidence: z.string().optional(),
  })
  .openapi("UpdateAssumptionRequest");

// Result Error schemas
export const ResultErrorSchema = z
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

export const AssignIssueRequestSchema = z
  .object({
    issueId: z.number(),
  })
  .openapi("AssignIssueRequest");

export const BulkReviewRequestSchema = z
  .object({
    errorIds: z.array(z.number()),
  })
  .openapi("BulkReviewRequest");

// Test Analysis schemas
export const TestAnalysisRequestSchema = z
  .object({
    testResults: z.array(z.any()).optional(),
  })
  .openapi("TestAnalysisRequest");

export const TestResultAnalysisSchema = z
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
export const UpdateResultAnalysisRequestSchema = z
  .object({
    analysisStatus: z.enum(["passed", "failed"]).optional(),
    analysisCategory: z
      .enum(["bug", "infra", "performance", "script", "other"])
      .optional(),
    analysisConfidence: z.number().min(0).max(1).optional(),
    analysisConclusion: z.string().optional(),
  })
  .openapi("UpdateResultAnalysisRequest");

export const TestAnalysisResponseSchema = z
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
export const ExecutionSchema = z
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
export const JsonReportTestResultSchema = z
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

export const JsonReportTestSpecSchema = z
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

export const JsonReportRequestSchema = z
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

export const JsonReportResponseSchema = z
  .object({
    success: z.boolean(),
    executionId: z.number(),
    specsProcessed: z.number(),
  })
  .openapi("JsonReportResponse");

// Raw JSON Report schema - accepts the raw JSON structure from test files
export const RawJsonReportRequestSchema = z
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
export const StatusResponseSchema = z
  .object({
    status: z.string(),
    database: z.string(),
    version: z.string(),
    timestamp: z.string().optional(),
  })
  .openapi("StatusResponse");

// User schemas
export const UserSchema = z
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

export const UserSignupRequestSchema = z
  .object({
    name: z.string(),
    email: z.string(),
    password: z.string(),
  })
  .openapi("UserSignupRequest");

export const UserLoginRequestSchema = z
  .object({
    email: z.string(),
    password: z.string(),
  })
  .openapi("UserLoginRequest");

export const UserLoginResponseSchema = z
  .object({
    user: UserSchema,
    accessToken: z.string(),
    refreshToken: z.string(),
  })
  .openapi("UserLoginResponse");

export const RefreshTokenRequestSchema = z
  .object({
    refreshToken: z.string(),
  })
  .openapi("RefreshTokenRequest");

export const UserUpdateRequestSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    password: z.string().optional(),
  })
  .openapi("UserUpdateRequest");

export const UserIntegrationsUpdateRequestSchema = z
  .object({
    reportPortalUrl: z.string().nullable().optional(),
    reportPortalEnabled: z.boolean().optional(),
    monitoringPortalUrl: z.string().nullable().optional(),
    monitoringPortalEnabled: z.boolean().optional(),
  })
  .openapi("UserIntegrationsUpdateRequest");

// MCP Token schemas
export const McpTokenResponseSchema = z
  .object({
    token: z.string(),
    expiresAt: z.string(),
    message: z.string(),
  })
  .openapi("McpTokenResponse");

// Results Stats schemas
export const ResultsStatsSchema = z
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

// Error Formatter schemas
export const ErrorFormatterRequestSchema = z
  .object({
    name: z.string().min(1, "Name must be between 1 and 100 characters long").max(100, "Name must be between 1 and 100 characters long"),
    description: z
      .string()
      .min(1, "Description must be between 1 and 2000 characters long")
      .max(2000, "Description must be between 1 and 2000 characters long"),
    category: z.string().min(1, "Category must be between 1 and 50 characters long").max(50, "Category must be between 1 and 50 characters long"),
  })
  .openapi("ErrorFormatterRequest");

export const ErrorFormatterResponseSchema = z
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
export const PromptParameterSchema = z
  .object({
    type: z.string(),
    required: z.boolean(),
    description: z.string(),
    example: z.string().optional(),
  })
  .openapi("PromptParameter");

export const PromptConfigSchema = z
  .object({
    name: z.string(),
    title: z.string(),
    description: z.string(),
    category: z.enum(["development", "reporting", "analysis", "performance"]),
    parameters: z.record(z.string(), PromptParameterSchema),
  })
  .openapi("PromptConfig");

export const PromptsListResponseSchema = z
  .object({
    prompts: z.array(PromptConfigSchema),
  })
  .openapi("PromptsListResponse");

export const GeneratePromptRequestSchema = z
  .record(z.string(), z.any())
  .openapi("GeneratePromptRequest");

export const GeneratePromptResponseSchema = z
  .object({
    name: z.string(),
    parameters: z.record(z.string(), z.any()),
    generated_prompt: z.string(),
  })
  .openapi("GeneratePromptResponse");

export function registerSchemas(registry: OpenAPIRegistry): void {
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
  registry.register("UpdateResultAnalysisRequest", UpdateResultAnalysisRequestSchema);
  registry.register("ErrorFormatterRequest", ErrorFormatterRequestSchema);
  registry.register("ErrorFormatterResponse", ErrorFormatterResponseSchema);
  registry.register("PromptParameter", PromptParameterSchema);
  registry.register("PromptConfig", PromptConfigSchema);
  registry.register("PromptsListResponse", PromptsListResponseSchema);
  registry.register("GeneratePromptRequest", GeneratePromptRequestSchema);
  registry.register("GeneratePromptResponse", GeneratePromptResponseSchema);
}

