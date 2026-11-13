// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { manualTestRunMutationModel } from "@/models/manualTestRunMutationModel";
import {
  MANUAL_TEST_RUN_SCENARIO_RESULTS,
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
  type BulkUpdateManualTestRunScenariosParams,
  type ManualTestRunResponse,
  type ReorderManualTestRunScenariosParams,
  type UpdateManualTestRunScenarioAssigneeParams,
  type UpdateManualTestRunScenarioResultParams,
} from "@/types/manualTestRuns";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isScenarioResult = (
  value: unknown,
): value is (typeof MANUAL_TEST_RUN_SCENARIO_RESULTS)[number] =>
  typeof value === "string" &&
  (MANUAL_TEST_RUN_SCENARIO_RESULTS as readonly string[]).includes(value);

function validateIds(projectId: unknown, runId: unknown): void {
  if (typeof projectId !== "string" || !UUID_PATTERN.test(projectId)) {
    throw new ManualTestRunValidationError("Project ID must be a valid UUID");
  }
  if (typeof runId !== "string" || !UUID_PATTERN.test(runId)) {
    throw new ManualTestRunValidationError("Run ID must be a valid UUID");
  }
}

function validateScenarioId(scenarioId: unknown): asserts scenarioId is string {
  if (typeof scenarioId !== "string" || !UUID_PATTERN.test(scenarioId)) {
    throw new ManualTestRunValidationError("Scenario ID must be a valid UUID");
  }
}

function validateScenarioIds(
  scenarioIds: unknown,
): asserts scenarioIds is string[] {
  if (!Array.isArray(scenarioIds) || scenarioIds.length === 0) {
    throw new ManualTestRunValidationError(
      "At least one scenario ID is required",
    );
  }
  scenarioIds.forEach(validateScenarioId);
  if (new Set(scenarioIds).size !== scenarioIds.length) {
    throw new ManualTestRunValidationError("Scenario IDs must be unique");
  }
}

function validateKeys(input: object, allowed: readonly string[]): void {
  const unknownKey = Object.keys(input).find((key) => !allowed.includes(key));
  if (unknownKey)
    throw new ManualTestRunValidationError(`Unknown field '${unknownKey}'`);
}

async function requireResult(
  promise: Promise<ManualTestRunResponse | null>,
  runId: string,
): Promise<ManualTestRunResponse> {
  const run = await promise;
  if (!run) {
    throw new ManualTestRunNotFoundError(
      `Manual test run '${runId}' or one of its scenarios was not found in the requested project`,
    );
  }
  return run;
}

export const manualTestRunMutationService = {
  async updateResult(
    params: UpdateManualTestRunScenarioResultParams,
  ): Promise<ManualTestRunResponse> {
    validateKeys(params, [
      "projectId",
      "runId",
      "scenarioId",
      "result",
      "resultById",
    ]);
    validateIds(params.projectId, params.runId);
    validateScenarioId(params.scenarioId);
    validateScenarioId(params.resultById);
    if (!isScenarioResult(params.result)) {
      throw new ManualTestRunValidationError(
        "result is not a valid scenario result",
      );
    }
    return await requireResult(
      manualTestRunMutationModel.updateResult(params),
      params.runId,
    );
  },

  async updateAssignee(
    params: UpdateManualTestRunScenarioAssigneeParams,
  ): Promise<ManualTestRunResponse> {
    validateKeys(params, ["projectId", "runId", "scenarioId", "assigneeId"]);
    validateIds(params.projectId, params.runId);
    validateScenarioId(params.scenarioId);
    if (params.assigneeId !== null) validateScenarioId(params.assigneeId);
    return await requireResult(
      manualTestRunMutationModel.updateAssignee(params),
      params.runId,
    );
  },

  async reorder(
    params: ReorderManualTestRunScenariosParams,
  ): Promise<ManualTestRunResponse> {
    validateKeys(params, ["projectId", "runId", "scenarioIds"]);
    validateIds(params.projectId, params.runId);
    validateScenarioIds(params.scenarioIds);
    return await requireResult(
      manualTestRunMutationModel.reorder(params),
      params.runId,
    );
  },

  async bulkUpdate(
    params: BulkUpdateManualTestRunScenariosParams,
  ): Promise<ManualTestRunResponse> {
    validateKeys(params, [
      "projectId",
      "runId",
      "scenarioIds",
      "result",
      "assigneeId",
      "resultById",
    ]);
    validateIds(params.projectId, params.runId);
    validateScenarioIds(params.scenarioIds);
    const hasResult = params.result !== undefined;
    const hasAssignee = Object.hasOwn(params, "assigneeId");
    if (!hasResult && !hasAssignee) {
      throw new ManualTestRunValidationError(
        "Bulk update requires a result or assignee change",
      );
    }
    if (hasResult && !isScenarioResult(params.result)) {
      throw new ManualTestRunValidationError(
        "result is not a valid scenario result",
      );
    }
    if (hasAssignee && params.assigneeId !== null)
      validateScenarioId(params.assigneeId);
    if (params.resultById !== undefined) validateScenarioId(params.resultById);
    if (hasResult !== (params.resultById !== undefined)) {
      throw new ManualTestRunValidationError(
        "resultById is required only when changing result",
      );
    }
    return await requireResult(
      manualTestRunMutationModel.bulkUpdate(params),
      params.runId,
    );
  },
};
