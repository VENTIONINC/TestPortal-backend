import type {
  Execution as PrismaExecution,
  Spec as PrismaSpec,
  Result as PrismaResult,
  ResultError as PrismaResultError,
  Assumption as PrismaAssumption,
  Issue as PrismaIssue,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type {
  PrismaExecution,
  PrismaSpec,
  PrismaResult,
  PrismaResultError,
  PrismaAssumption,
  PrismaIssue,
};

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
  result?: PrismaResult;
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
