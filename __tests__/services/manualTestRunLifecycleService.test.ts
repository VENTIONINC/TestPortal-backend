// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const modelMocks = {
  complete: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
  reopen: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
  delete: jest.fn<() => Promise<boolean>>(),
};
jest.mock("@/models/manualTestRunLifecycleModel", () => ({
  manualTestRunLifecycleModel: modelMocks,
}));

import { manualTestRunLifecycleService } from "@/services/manualTestRunLifecycleService";
import {
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

const projectId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const run = { id: runId } as ManualTestRunResponse;

describe("manualTestRunLifecycleService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modelMocks.complete.mockResolvedValue(run);
    modelMocks.reopen.mockResolvedValue(run);
  });

  it("completes with the authenticated user and maps missing runs", async () => {
    await manualTestRunLifecycleService.completeRun({
      projectId,
      runId,
      completedById: userId,
    });
    expect(modelMocks.complete).toHaveBeenCalledWith({
      projectId,
      runId,
      completedById: userId,
    });
    modelMocks.complete.mockResolvedValue(null);
    await expect(
      manualTestRunLifecycleService.completeRun({
        projectId,
        runId,
        completedById: userId,
      }),
    ).rejects.toBeInstanceOf(ManualTestRunNotFoundError);
  });

  it("deletes only the requested project run and reports missing runs", async () => {
    modelMocks.delete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    await manualTestRunLifecycleService.deleteRun({ projectId, runId, userId });
    expect(modelMocks.delete).toHaveBeenCalledWith({ projectId, runId });
    await expect(manualTestRunLifecycleService.deleteRun({ projectId, runId, userId })).rejects.toBeInstanceOf(ManualTestRunNotFoundError);
  });

  it("reopens with an authenticated actor and validates scope IDs", async () => {
    await manualTestRunLifecycleService.reopenRun({
      projectId,
      runId,
      reopenedById: userId,
    });
    expect(modelMocks.reopen).toHaveBeenCalledWith({
      projectId,
      runId,
      reopenedById: userId,
    });
    await expect(
      manualTestRunLifecycleService.reopenRun({
        projectId,
        runId: "bad",
        reopenedById: userId,
      }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
  });
});
