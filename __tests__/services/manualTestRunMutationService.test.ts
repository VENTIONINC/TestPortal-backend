// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const modelMocks = {
  updateResult: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
  updateAssignee: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
  reorder: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
  bulkUpdate: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
};
jest.mock("@/models/manualTestRunMutationModel", () => ({
  manualTestRunMutationModel: modelMocks,
}));

import { manualTestRunMutationService } from "@/services/manualTestRunMutationService";
import {
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

const projectId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const scenarioId = "33333333-3333-4333-8333-333333333333";
const secondScenarioId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const run = { id: runId } as ManualTestRunResponse;

describe("manualTestRunMutationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modelMocks.updateResult.mockResolvedValue(run);
    modelMocks.updateAssignee.mockResolvedValue(run);
    modelMocks.reorder.mockResolvedValue(run);
    modelMocks.bulkUpdate.mockResolvedValue(run);
  });

  it("records the authenticated result actor separately from the assignee", async () => {
    await manualTestRunMutationService.updateResult({
      projectId,
      runId,
      scenarioId,
      result: "passed",
      resultById: userId,
    });
    expect(modelMocks.updateResult).toHaveBeenCalledWith({
      projectId,
      runId,
      scenarioId,
      result: "passed",
      resultById: userId,
    });

    await manualTestRunMutationService.updateAssignee({
      projectId,
      runId,
      scenarioId,
      assigneeId: null,
    });
    expect(modelMocks.updateAssignee).toHaveBeenCalledWith({
      projectId,
      runId,
      scenarioId,
      assigneeId: null,
    });
  });

  it("validates complete ordering and nonempty bulk actions", async () => {
    await manualTestRunMutationService.reorder({
      projectId,
      runId,
      scenarioIds: [scenarioId, secondScenarioId],
    });
    expect(modelMocks.reorder).toHaveBeenCalledWith({
      projectId,
      runId,
      scenarioIds: [scenarioId, secondScenarioId],
    });
    await manualTestRunMutationService.bulkUpdate({
      projectId,
      runId,
      scenarioIds: [scenarioId, secondScenarioId],
      result: "failed",
      assigneeId: userId,
      resultById: userId,
    });
    expect(modelMocks.bulkUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ result: "failed", resultById: userId }),
    );

    await expect(
      manualTestRunMutationService.reorder({
        projectId,
        runId,
        scenarioIds: [scenarioId, scenarioId],
      }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    await expect(
      manualTestRunMutationService.bulkUpdate({
        projectId,
        runId,
        scenarioIds: [scenarioId],
      }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
  });

  it("maps an out-of-run scenario miss to not found", async () => {
    modelMocks.updateResult.mockResolvedValue(null);
    await expect(
      manualTestRunMutationService.updateResult({
        projectId,
        runId,
        scenarioId,
        result: "blocked",
        resultById: userId,
      }),
    ).rejects.toBeInstanceOf(ManualTestRunNotFoundError);
  });
});
