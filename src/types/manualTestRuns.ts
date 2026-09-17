// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type {
  ManualTestRunStatus,
  ManualTestRunStepStatus,
} from "@prisma/client";

export type ManualTestRunStatusValue = ManualTestRunStatus;
export type ManualTestRunStepStatusValue = ManualTestRunStepStatus;

export const MANUAL_TEST_RUN_STATUSES = [
  "in_progress",
  "passed",
  "failed",
  "blocked",
  "skipped",
] as const satisfies readonly ManualTestRunStatus[];

export const MANUAL_TEST_RUN_STEP_STATUSES = [
  "not_started",
  "passed",
  "failed",
  "blocked",
  "skipped",
] as const satisfies readonly ManualTestRunStepStatus[];

export const MANUAL_TEST_RUN_TERMINAL_STATUSES = [
  "passed",
  "failed",
  "blocked",
  "skipped",
] as const satisfies readonly ManualTestRunStatus[];

export interface ManualTestRunExecutor {
  id: string;
  name: string;
  email: string;
}

export interface ManualTestRunStepResponse {
  id: string;
  position: number;
  action: string;
  expectedResult: string | null;
  status: ManualTestRunStepStatus;
  notes: string | null;
  updatedAt: Date;
}

export interface ManualTestRunResponse {
  id: string;
  projectId: string;
  sourceTestScenarioId: string;
  testScenarioId: string | null;
  executedById: string | null;
  executedBy: ManualTestRunExecutor | null;
  status: ManualTestRunStatus;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
  title: string;
  details: string | null;
  objective: string | null;
  preconditions: string | null;
  testData: string | null;
  expectedResult: string | null;
  scenarioNotes: string | null;
  notes: string | null;
  steps: ManualTestRunStepResponse[];
}

export interface ManualTestRunSummary {
  id: string;
  projectId: string;
  sourceTestScenarioId: string;
  testScenarioId: string | null;
  executedById: string | null;
  executedBy: ManualTestRunExecutor | null;
  title: string;
  status: ManualTestRunStatus;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
}

export interface ManualTestRunPage {
  runs: ManualTestRunSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface StartManualTestRunParams {
  projectId: string;
  scenarioId: string;
  executedById: string;
  notes?: string | null | undefined;
}

export interface GetManualTestRunParams {
  projectId: string;
  runId: string;
}

export interface ListManualTestRunsParams {
  projectId: string;
  scenarioId?: string | undefined;
  testScenarioId?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
  startedFrom?: string | undefined;
  startedBefore?: string | undefined;
  status?: ManualTestRunStatus | undefined;
}

export interface UpdateManualTestRunParams {
  projectId: string;
  runId: string;
  status?: ManualTestRunStatus | undefined;
  notes?: string | null | undefined;
}

export interface UpdateManualTestRunStepParams {
  projectId: string;
  runId: string;
  stepId: string;
  status?: ManualTestRunStepStatus | undefined;
  notes?: string | null | undefined;
}

export interface CompleteManualTestRunParams {
  projectId: string;
  runId: string;
  status: Exclude<ManualTestRunStatus, "in_progress">;
  notes?: string | null | undefined;
}

export class ManualTestRunValidationError extends Error {
  readonly code = "MANUAL_TEST_RUN_VALIDATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "ManualTestRunValidationError";
  }
}

export class ManualTestRunNotFoundError extends Error {
  readonly code = "MANUAL_TEST_RUN_NOT_FOUND" as const;

  constructor(message: string) {
    super(message);
    this.name = "ManualTestRunNotFoundError";
  }
}

export class ManualTestRunConflictError extends Error {
  readonly code = "MANUAL_TEST_RUN_CONFLICT" as const;

  constructor(message: string) {
    super(message);
    this.name = "ManualTestRunConflictError";
  }
}
