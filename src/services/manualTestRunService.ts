// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { manualTestRunModel } from "@/models/manualTestRunModel";
import {
  MANUAL_TEST_RUN_STATUSES,
  MANUAL_TEST_RUN_STEP_STATUSES,
  MANUAL_TEST_RUN_TERMINAL_STATUSES,
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
  type CompleteManualTestRunParams,
  type GetManualTestRunParams,
  type ListManualTestRunsParams,
  type ManualTestRunPage,
  type ManualTestRunResponse,
  type StartManualTestRunParams,
  type UpdateManualTestRunParams,
  type UpdateManualTestRunStepParams,
} from "@/types/manualTestRuns";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RFC3339_WITH_TIMEZONE_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function validateKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const unknownKey = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknownKey) {
    throw new ManualTestRunValidationError(`Unknown field '${unknownKey}'`);
  }
}

function requireUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ManualTestRunValidationError(`${label} must be a valid UUID`);
  }
}

function normalizeNotes(
  value: string | null | undefined,
  label = "Notes",
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== "string" || !value.trim()) {
    throw new ManualTestRunValidationError(`${label} must not be blank`);
  }
  return value.trim();
}

function isRunStatus(value: unknown): value is (typeof MANUAL_TEST_RUN_STATUSES)[number] {
  return (
    typeof value === "string" &&
    (MANUAL_TEST_RUN_STATUSES as readonly string[]).includes(value)
  );
}

function isStepStatus(
  value: unknown,
): value is (typeof MANUAL_TEST_RUN_STEP_STATUSES)[number] {
  return (
    typeof value === "string" &&
    (MANUAL_TEST_RUN_STEP_STATUSES as readonly string[]).includes(value)
  );
}

function isTerminalStatus(
  value: unknown,
): value is (typeof MANUAL_TEST_RUN_TERMINAL_STATUSES)[number] {
  return (
    typeof value === "string" &&
    (MANUAL_TEST_RUN_TERMINAL_STATUSES as readonly string[]).includes(value)
  );
}

function validatePagination(page: number, limit: number): void {
  if (!Number.isInteger(page) || page < 1) {
    throw new ManualTestRunValidationError("page must be a positive integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new ManualTestRunValidationError(
      `limit must be a positive integer no greater than ${MAX_LIMIT}`,
    );
  }
}

function validateDateBounds(
  startedFrom: string | undefined,
  startedBefore: string | undefined,
): void {
  for (const [value, label] of [
    [startedFrom, "startedFrom"],
    [startedBefore, "startedBefore"],
  ] as const) {
    if (value === undefined) {
      continue;
    }
    if (
      !RFC3339_WITH_TIMEZONE_PATTERN.test(value) ||
      Number.isNaN(Date.parse(value))
    ) {
      throw new ManualTestRunValidationError(
        `${label} must be an RFC 3339 timestamp with an explicit timezone`,
      );
    }
  }

  if (
    startedFrom !== undefined &&
    startedBefore !== undefined &&
    new Date(startedFrom).getTime() >= new Date(startedBefore).getTime()
  ) {
    throw new ManualTestRunValidationError(
      "startedFrom must be earlier than startedBefore",
    );
  }
}

function runNotFound(runId: string): ManualTestRunNotFoundError {
  return new ManualTestRunNotFoundError(
    `Manual test run with id '${runId}' not found in the requested project`,
  );
}

function scopeNotFound(
  kind: "project" | "scenario",
  id: string,
): ManualTestRunNotFoundError {
  return new ManualTestRunNotFoundError(
    `${kind === "project" ? "Project" : "Test scenario"} with id '${id}' not found in the requested project context`,
  );
}

function validateListParams(params: ListManualTestRunsParams): void {
  validateKeys(params as unknown as Record<string, unknown>, [
    "projectId",
    "scenarioId",
    "testScenarioId",
    "page",
    "limit",
    "startedFrom",
    "startedBefore",
    "status",
  ]);
  requireUuid(params.projectId, "Project ID");
  if (params.scenarioId !== undefined) {
    requireUuid(params.scenarioId, "Scenario ID");
  }
  if (params.testScenarioId !== undefined) {
    requireUuid(params.testScenarioId, "Test scenario filter");
  }
  if (params.scenarioId !== undefined && params.testScenarioId !== undefined) {
    throw new ManualTestRunValidationError(
      "testScenarioId cannot be supplied for nested scenario history",
    );
  }
  const page = params.page ?? DEFAULT_PAGE;
  const limit = params.limit ?? DEFAULT_LIMIT;
  validatePagination(page, limit);
  if (params.status !== undefined && !isRunStatus(params.status)) {
    throw new ManualTestRunValidationError("status is not a valid run status");
  }
  validateDateBounds(params.startedFrom, params.startedBefore);
}

export const manualTestRunService = {
  async startRun(
    params: StartManualTestRunParams,
  ): Promise<ManualTestRunResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "projectId",
      "scenarioId",
      "executedById",
      "notes",
    ]);
    requireUuid(params.projectId, "Project ID");
    requireUuid(params.scenarioId, "Scenario ID");
    requireUuid(params.executedById, "Executor ID");
    const notes = normalizeNotes(params.notes);

    const run = await manualTestRunModel.createFromScenario({
      projectId: params.projectId,
      scenarioId: params.scenarioId,
      executedById: params.executedById,
      notes,
    });
    if (!run) {
      throw new ManualTestRunNotFoundError(
        `Test scenario with id '${params.scenarioId}' not found in project '${params.projectId}'`,
      );
    }
    return run;
  },

  async getRun(params: GetManualTestRunParams): Promise<ManualTestRunResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "projectId",
      "runId",
    ]);
    requireUuid(params.projectId, "Project ID");
    requireUuid(params.runId, "Run ID");
    const run = await manualTestRunModel.findById(params.runId, params.projectId);
    if (!run) {
      throw runNotFound(params.runId);
    }
    return run;
  },

  async listRuns(params: ListManualTestRunsParams): Promise<ManualTestRunPage> {
    validateListParams(params);
    const result = await manualTestRunModel.findHistory(params);
    if (result.missingScope === "project") {
      throw scopeNotFound("project", params.projectId);
    }
    if (result.missingScope === "scenario") {
      throw scopeNotFound("scenario", params.scenarioId ?? "");
    }
    if (!result.page) {
      throw new Error("Manual test run history query returned no page");
    }
    return result.page;
  },

  async updateRun(
    params: UpdateManualTestRunParams,
  ): Promise<ManualTestRunResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "projectId",
      "runId",
      "status",
      "notes",
    ]);
    requireUuid(params.projectId, "Project ID");
    requireUuid(params.runId, "Run ID");
    if (!hasOwn(params, "status") && !hasOwn(params, "notes")) {
      throw new ManualTestRunValidationError(
        "At least one editable field is required",
      );
    }
    if (params.status !== undefined && !isRunStatus(params.status)) {
      throw new ManualTestRunValidationError("status is not a valid run status");
    }
    const notes = normalizeNotes(params.notes);
    const run = await manualTestRunModel.updateRun({
      projectId: params.projectId,
      runId: params.runId,
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(hasOwn(params, "notes") ? { notes } : {}),
    });
    if (!run) {
      throw runNotFound(params.runId);
    }
    return run;
  },

  async updateStep(
    params: UpdateManualTestRunStepParams,
  ): Promise<ManualTestRunResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "projectId",
      "runId",
      "stepId",
      "status",
      "notes",
    ]);
    requireUuid(params.projectId, "Project ID");
    requireUuid(params.runId, "Run ID");
    requireUuid(params.stepId, "Step ID");
    if (!hasOwn(params, "status") && !hasOwn(params, "notes")) {
      throw new ManualTestRunValidationError(
        "At least one editable field is required",
      );
    }
    if (params.status !== undefined && !isStepStatus(params.status)) {
      throw new ManualTestRunValidationError(
        "status is not a valid step status",
      );
    }
    const notes = normalizeNotes(params.notes, "Step notes");
    const run = await manualTestRunModel.updateStep({
      projectId: params.projectId,
      runId: params.runId,
      stepId: params.stepId,
      ...(params.status !== undefined ? { status: params.status } : {}),
      ...(hasOwn(params, "notes") ? { notes } : {}),
    });
    if (!run) {
      throw new ManualTestRunNotFoundError(
        `Manual test run or step with id '${params.stepId}' not found in the requested project`,
      );
    }
    return run;
  },

  async completeRun(
    params: CompleteManualTestRunParams,
  ): Promise<ManualTestRunResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "projectId",
      "runId",
      "status",
      "notes",
    ]);
    requireUuid(params.projectId, "Project ID");
    requireUuid(params.runId, "Run ID");
    if (!isTerminalStatus(params.status)) {
      throw new ManualTestRunValidationError(
        "Completion status must be a terminal run status",
      );
    }
    const notes = normalizeNotes(params.notes);
    const run = await manualTestRunModel.complete({
      projectId: params.projectId,
      runId: params.runId,
      status: params.status,
      ...(hasOwn(params, "notes") ? { notes } : {}),
    });
    if (!run) {
      throw runNotFound(params.runId);
    }
    return run;
  },
};

export { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT, validateDateBounds };
