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
  issueId: number;
  resultErrorId?: number;
  madeBy: string;
  isConfirmed: boolean;
  score: number;
  description?: string;
  hypothesis?: string;
  evidence?: string;
}

export interface UpdateAssumptionRequest {
  assumptionId: string;
  madeBy?: string;
  isConfirmed?: boolean;
  score?: number;
  description?: string;
  hypothesis?: string;
  evidence?: string;
}

export interface GetAssumptionByIdParams {
  assumptionId: string;
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
