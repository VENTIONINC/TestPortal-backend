// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export type ManualTestRunStatus = "in_progress" | "completed";
export type ManualTestRunScenarioResult =
  | "untested"
  | "passed"
  | "failed"
  | "blocked"
  | "skipped";
export type ManualTestRunStepStatus = ManualTestRunScenarioResult;

export const MANUAL_TEST_RUN_STATUSES = [
  "in_progress",
  "completed",
] as const satisfies readonly ManualTestRunStatus[];

export const MANUAL_TEST_RUN_SCENARIO_RESULTS = [
  "untested",
  "passed",
  "failed",
  "blocked",
  "skipped",
] as const satisfies readonly ManualTestRunScenarioResult[];
export const MANUAL_TEST_RUN_STEP_STATUSES = MANUAL_TEST_RUN_SCENARIO_RESULTS;

export const MANUAL_TEST_RUN_TERMINAL_STATUSES = ["completed"] as const;

export interface ManualTestRunUser {
  id: string;
  name: string;
  email: string;
}

export interface ManualTestRunScenarioStepResponse {
  id: string;
  position: number;
  action: string;
  expectedResult: string | null;
}

export interface ManualTestRunScenarioResponse {
  id: string;
  sourceScenarioId: string;
  sourceScenarioKey: string;
  title: string;
  position: number;
  details: string | null;
  preconditions: string | null;
  testData: string | null;
  folderPath: string | null;
  result: ManualTestRunScenarioResult;
  assigneeId: string | null;
  assignee: ManualTestRunUser | null;
  resultById: string | null;
  resultBy: ManualTestRunUser | null;
  resultAt: Date | null;
  steps: ManualTestRunScenarioStepResponse[];
}

export interface ManualRunEnvironmentSnapshot {
  browser: string | null;
  operatingSystem: string | null;
  device: string | null;
  apiEnvironment: string | null;
  build: string | null;
  deployment: string | null;
}

export interface ManualTestRunResponse extends ManualRunEnvironmentSnapshot {
  id: string;
  projectId: string;
  executedById: string | null;
  executedBy: ManualTestRunUser | null;
  status: ManualTestRunStatus;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  completedById: string | null;
  completedBy: ManualTestRunUser | null;
  skippedAtCompletion: number;
  title: string;
  scenarios: ManualTestRunScenarioResponse[];
}

export interface ManualTestRunSummary extends ManualRunEnvironmentSnapshot {
  id: string;
  projectId: string;
  executedById: string | null;
  executedBy: ManualTestRunUser | null;
  status: ManualTestRunStatus;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  completedDay: string | null;
  title: string;
  scenarioCount: number;
  untestedCount: number;
  passedCount: number;
  failedCount: number;
  blockedCount: number;
  skippedCount: number;
}

export type ManualTestRunShowFilter = "in_progress" | "completed" | "all";
export type ManualTestRunPeriod =
  | "recent"
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "any_time"
  | "custom";

export interface ManualTestRunPage {
  runs: ManualTestRunSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ManualTestRunSource =
  | { scenarioIds: string[]; suiteId?: never }
  | { suiteId: string; scenarioIds?: never };

export type CreateManualTestRunParams = ManualTestRunSource & {
  [K in keyof ManualRunEnvironmentSnapshot]?:
    | ManualRunEnvironmentSnapshot[K]
    | undefined;
} & {
  projectId: string;
  executedById: string;
};

export interface GetManualTestRunParams {
  projectId: string;
  runId: string;
}

export interface ListManualTestRunsParams {
  projectId: string;
  page?: number;
  limit?: number;
  search?: string | undefined;
  show?: ManualTestRunShowFilter;
  period?: ManualTestRunPeriod;
  timeZone?: string;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
}

export interface UpdateManualTestRunScenarioResultParams {
  projectId: string;
  runId: string;
  scenarioId: string;
  result: ManualTestRunScenarioResult;
  resultById: string;
}

export interface UpdateManualTestRunScenarioAssigneeParams {
  projectId: string;
  runId: string;
  scenarioId: string;
  assigneeId: string | null;
}

export interface ReorderManualTestRunScenariosParams {
  projectId: string;
  runId: string;
  scenarioIds: string[];
}

export interface BulkUpdateManualTestRunScenariosParams {
  projectId: string;
  runId: string;
  scenarioIds: string[];
  result?: ManualTestRunScenarioResult;
  assigneeId?: string | null;
  resultById?: string;
}

export interface CompleteManualTestRunParams {
  projectId: string;
  runId: string;
  completedById: string;
}

export interface ReopenManualTestRunParams {
  projectId: string;
  runId: string;
  reopenedById: string;
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
