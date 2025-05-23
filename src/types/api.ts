// API Request Types
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Result API Types
export interface GetResultsParams extends PaginationParams {
  tag?: string;
  specId?: string;
  specFile?: string;
  specName?: string;
  environment?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
}

export interface GetResultByIdParams {
  resultId: string;
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
