// Minimal Prisma model type definitions to allow compilation without the
// generated client types. These mirror the fields defined in the Prisma
// schema and are sufficient for type checking within this repository.

export interface PrismaExecution {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  name: string;
  environment: string;
  version: string;
  startedAt: Date;
}

export interface PrismaSpec {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  key: string;
  file: string;
  title: string;
  tags: string;
  annotations?: string | null;
}

export interface PrismaResult {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  allureLink?: string | null;
  retry: number;
  status: string;
  duration: number;
  startTime: Date;
  specId: number;
  executionId: number;
  analysisStatus?: string | null;
  analysisCategory?: string | null;
  analysisConfidence?: number | null;
  analysisConclusion?: string | null;
}

export interface PrismaResultError {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  type: string;
  message: string;
  callLog?: string | null;
  callStack: string;
  testAssertion?: string | null;
  expectedPattern?: string | null;
  receivedString?: string | null;
  location: string;
  resultId?: number | null;
}

export interface PrismaAssumption {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  isConfirmed: boolean;
  score: number;
  madeBy: string;
  issueId: number;
  resultErrorId?: number | null;
}

export interface PrismaIssue {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  category: string;
  description?: string | null;
  portal?: string | null;
  service?: string | null;
  ticket?: string | null;
  createdById?: number | null;
  updatedById?: number | null;
}

export interface PrismaUser {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  passwordHash?: string | null;
  mcpToken?: string | null;
}

// Database model interfaces with relations
export interface ExecutionWithResults extends PrismaExecution {
  results: ResultWithRelations[];
}

export interface SpecWithResults extends PrismaSpec {
  results: ResultWithRelations[];
}

export interface ResultWithRelations extends PrismaResult {
  errors: ResultErrorWithRelations[];
  spec: PrismaSpec;
  execution: PrismaExecution;
}

export interface ResultErrorWithRelations extends PrismaResultError {
  result: PrismaResult | null;
  assumptions: AssumptionWithRelations[];
}

export interface AssumptionWithRelations extends PrismaAssumption {
  issue: PrismaIssue;
  resultError?: PrismaResultError;
}

export interface IssueWithAssumptions extends PrismaIssue {
  assumptions: AssumptionWithRelations[];
}

// Simplified interfaces for API responses
export interface ExecutionSummary {
  id: number;
  name: string;
  type: string;
  environment: string;
  version: string;
  startedAt: Date;
  createdAt: Date;
  resultsCount: number;
}

export interface SpecSummary {
  id: number;
  key: string;
  file: string;
  title: string;
  tags: string;
  resultsCount: number;
}

export interface ResultSummary {
  id: number;
  status: string;
  duration: number;
  startTime: Date;
  retry: number;
  allureLink?: string;
  spec: SpecSummary;
  execution: ExecutionSummary;
  errorsCount: number;
}

export interface ResultErrorSummary {
  id: number;
  type: string;
  message: string;
  location: string;
  createdAt: Date;
  assumptionsCount: number;
}

export interface AssumptionSummary {
  id: number;
  isConfirmed: boolean;
  score: number;
  madeBy: string;
  createdAt: Date;
  issue: IssueSummary;
}

export interface IssueSummary {
  id: number;
  name: string;
  category: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
}

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface UserWithPassword {
  id: number;
  name: string;
  email: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// V2 API Serialized Response Types
export interface SerializedUser {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
}

export interface SerializedIssue {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  category: string;
  description?: string | null;
  portal?: string | null;
  service?: string | null;
  ticket?: string | null;
  createdBy?: SerializedUser | null;
  updatedBy?: SerializedUser | null;
}

export interface SerializedIssuesResponse {
  issues: SerializedIssue[];
  total: number;
  page: number;
  totalPages: number;
}

// Extended Prisma types with relations for v2 endpoints
export interface PrismaIssueWithUsers extends PrismaIssue {
  createdBy?: PrismaUser | null;
  updatedBy?: PrismaUser | null;
}
