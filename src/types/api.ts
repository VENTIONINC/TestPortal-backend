import type { PrismaAssumption } from "@/types/database";

// API Request Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Project API Types
export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface GetProjectsParams {
  ownerId?: number;
  isActive?: boolean;
  name?: string;
}

export interface GetProjectByIdParams {
  projectId: string;
}

// Result API Types
export interface GetResultsParams extends PaginationParams {
  projectId: string;
  tag?: string;
  specId?: string;
  specFile?: string;
  specName?: string;
  environment?: string;
  type?: string;
  status?: string;
  reviewStatus?: string;
  errorMessage?: string;
  issueName?: string;
  from?: string;
  to?: string;
}

export interface GetResultByIdParams {
  resultId: string;
}

export interface GetResultsStatsParams {
  projectId: string;
  dates?: string[];
}

export interface AnalysisExportParams {
  projectId: string;
  dateFrom: string;
  dateTo: string;
}

export interface AnalysisExportMetadata {
  type: "metadata";
  schemaVersion: string;
  projectId: string;
  dateFrom: string;
  dateTo: string;
  generatedAt: string;
}

export interface AnalysisExportRecord {
  type: "result";
  resultId: string;
  startTime: string;
  status: string;
  duration: number;
  retry: number;
  reportPortalLink?: string | null;
  spec: {
    id: string;
    key: string;
    file: string;
    title: string;
    tags: string | string[];
  };
  execution: {
    id: string;
    environment: string;
    type: string;
    name: string;
    version: string;
    startedAt: string;
    createdAt: string;
  };
  ai: {
    status?: string | null;
    category?: string | null;
    confidence?: number | null;
    conclusion?: string | null;
    errorQuality?: number | null;
    errorQualityConclusion?: string | null;
  };
  feedback: {
    category?: string | null;
    confidence?: number | null;
    conclusion?: string | null;
    reviewedAt?: string | null;
    reviewedById?: string | null;
  };
  final: {
    category?: string | null;
    confidence?: number | null;
    conclusion?: string | null;
  };
}

export interface ResultsStats {
  byStatus: {
    passed: number;
    failed: number;
    skipped: number;
    timedOut: number;
  };
  byStatusTotal: number;
  entityCounts: {
    specs: number;
    results: number;
    executions: number;
    issues: number;
    errors: number;
    assumptions: number;
  };
  topErrors: { title: string; count: number }[];
  topIssues: { title: string; count: number }[];
}

// Assumption API Types
export interface CreateAssumptionRequest {
  issueId: string; // UUID reference to Issue
  resultErrorId?: string; // UUID reference to ResultError
  madeBy: string;
  isConfirmed: boolean;
  score: number;
  description?: string;
  hypothesis?: string;
  evidence?: string;
}

export interface UpdateAssumptionRequest {
  assumptionId: string; // UUID reference to Assumption
  madeBy?: string;
  isConfirmed?: boolean;
  score?: number;
  description?: string;
  hypothesis?: string;
  evidence?: string;
}

export type FailureGroupingCategory =
  | "bug"
  | "infra"
  | "performance"
  | "script"
  | "other";

export type FailureGroupingSource = "llm" | "algorithmic" | "none";

export type FailureGroupingReason =
  | "insufficient_failures"
  | "analysis_not_complete"
  | "too_many_failures";

export interface FailureGroup {
  groupDescription: string;
  confidence: number;
  resultErrorIds: string[];
  suggestedIssueQuery?: string;
}

export interface GroupFailuresRequest {
  category: FailureGroupingCategory;
}

export interface GroupFailuresResponse {
  groups: FailureGroup[];
  source: FailureGroupingSource;
  reason?: FailureGroupingReason;
}

export interface AcceptFailureGroupRequest {
  issueId: string;
  groupResultErrorIds: string[];
}

export interface AcceptFailureGroupResponse {
  createdAssumptions: PrismaAssumption[];
  skippedResultErrorIds: string[];
}

export interface GetAssumptionByIdParams {
  assumptionId: string; // UUID reference to Assumption
}

// Common API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    status: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error Response Types
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    status: number;
  };
}

// Success Response Types
export interface SuccessResponse<T> {
  success: true;
  data: T;
}
