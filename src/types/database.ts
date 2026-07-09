// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Prisma } from "@prisma/client";

// Minimal Prisma model type definitions to allow compilation without the
// generated client types. These mirror the fields defined in the Prisma
// schema and are sufficient for type checking within this repository.

export interface PrismaExecution {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
  type: string;
  name: string;
  environment: string;
  version: string;
  startedAt: Date;
  projectId: string; // UUID reference to Project
}

export interface PrismaSpec {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
  key: string;
  file: string;
  title: string;
  tags: Prisma.JsonValue;
  annotations?: Prisma.JsonValue | null;
  projectId: string; // UUID reference to Project
}

export interface PrismaResult {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
  reportPortalLink?: string | null;
  retry: number;
  status: string;
  duration: number;
  startTime: Date;
  specId: string; // UUID reference to Spec
  executionId: string; // UUID reference to Execution
  analysisStatus?: string | null;
  analysisCategory?: string | null;
  analysisConfidence?: number | null;
  analysisConclusion?: string | null;
  analysisErrorQuality?: number | null;
  analysisErrorQualityConclusion?: string | null;
  analysisReviewedAt?: Date | null;
  analysisReviewedById?: string | null;
  analysisFeedbackCategory?: string | null;
  analysisFeedbackConfidence?: number | null;
  analysisFeedbackConclusion?: string | null;
}

export interface PrismaResultError {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
  type: string;
  message: string;
  callLog?: Prisma.JsonValue | null;
  callStack: Prisma.JsonValue;
  testAssertion?: string | null;
  expectedPattern?: string | null;
  receivedString?: string | null;
  location: string;
  resultId?: string | null; // UUID reference to Result
}

export interface PrismaAssumption {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
  isConfirmed: boolean;
  score: number;
  madeBy: string;
  issueId: string; // UUID reference to Issue
  resultErrorId?: string | null; // UUID reference to ResultError
}

export interface PrismaIssue {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
  name: string;
  category: string;
  description?: string | null;
  portal?: string | null;
  service?: string | null;
  ticket?: string | null;
  projectId: string; // UUID reference to Project
  createdById?: string | null;
  updatedById?: string | null;
}

export interface PrismaProject {
  id: string; // UUID
  createdAt: Date;
  updatedAt: Date;
  name: string;
  description?: string | null;
  isActive: boolean;
  ownerId: string;
  categoryWeights?: {
    bug: number;
    infra: number;
    performance: number;
    script: number;
    other: number;
  } | null;
}

export interface PrismaUser {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  email: string;
  status: "pending" | "active" | "suspended";
  role: "admin" | "member";
  passwordHash?: string | null;
  cognitoUserId?: string | null;
  mcpToken?: string | null;
  reportPortalUrl?: string | null;
  reportPortalEnabled: boolean;
  monitoringPortalUrl?: string | null;
  monitoringPortalEnabled: boolean;
  analyzeEnabled: boolean;
}

// Database model interfaces with relations
export interface ProjectWithRelations extends PrismaProject {
  owner: PrismaUser;
  executions: PrismaExecution[];
  specs: PrismaSpec[];
  issues: PrismaIssue[];
}

export interface ExecutionWithResults extends PrismaExecution {
  results: ResultWithRelations[];
  project: PrismaProject;
}

export interface SpecWithResults extends PrismaSpec {
  results: ResultWithRelations[];
  project: PrismaProject;
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

export interface StructuredSpec extends Omit<PrismaSpec, "tags" | "annotations"> {
  tags: string[];
  annotations: unknown[];
}

export interface StructuredResultError
  extends Omit<PrismaResultError, "callLog" | "callStack"> {
  callLog: string[];
  callStack: string[];
}

export interface StructuredResultWithRelations extends PrismaResult {
  errors: StructuredResultError[];
  spec: StructuredSpec;
  execution: PrismaExecution;
}

export interface IssueWithAssumptions extends PrismaIssue {
  assumptions: AssumptionWithRelations[];
}

// Simplified interfaces for API responses
export interface ProjectSummary {
  id: string; // UUID
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  owner: UserSummary;
}

export interface ExecutionSummary {
  id: string;
  name: string;
  type: string;
  environment: string;
  version: string;
  startedAt: Date;
  createdAt: Date;
  resultsCount: number;
  projectId: string;
}

export interface SpecSummary {
  id: string;
  key: string;
  file: string;
  title: string;
  tags: string[];
  resultsCount: number;
  projectId: string;
}

export interface ResultSummary {
  id: string;
  status: string;
  duration: number;
  startTime: Date;
  retry: number;
  reportPortalLink?: string;
  spec: SpecSummary;
  execution: ExecutionSummary;
  errorsCount: number;
}

export interface ResultErrorSummary {
  id: string;
  type: string;
  message: string;
  location: string;
  createdAt: Date;
  assumptionsCount: number;
}

export interface AssumptionSummary {
  id: string;
  isConfirmed: boolean;
  score: number;
  madeBy: string;
  createdAt: Date;
  issue: IssueSummary;
}

export interface IssueSummary {
  id: string;
  name: string;
  category: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface UserWithPassword {
  id: string;
  name: string;
  email: string;
  passwordHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// V2 API Serialized Response Types
export interface SerializedUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface SerializedIssue {
  id: string; // UUID
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
