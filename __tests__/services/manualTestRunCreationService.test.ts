// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const modelMocks = {
  createFromCatalog: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
};

jest.mock("@/models/manualTestRunCreationModel", () => ({
  manualTestRunCreationModel: modelMocks,
}));

import { manualTestRunCreationService } from "@/services/manualTestRunCreationService";
import {
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

const projectId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const scenarioId = "33333333-3333-4333-8333-333333333333";
const suiteId = "44444444-4444-4444-8444-444444444444";
const run = {
  id: "55555555-5555-4555-8555-555555555555",
} as ManualTestRunResponse;

describe("manualTestRunCreationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modelMocks.createFromCatalog.mockResolvedValue(run);
  });

  it("delegates ordered selected scenarios to an atomic catalog creation", async () => {
    await manualTestRunCreationService.createRun({
      projectId,
      executedById: userId,
      scenarioIds: [scenarioId, suiteId],
    });
    expect(modelMocks.createFromCatalog).toHaveBeenCalledWith({
      projectId,
      executedById: userId,
      scenarioIds: [scenarioId, suiteId],
    });
  });

  it("delegates a suite source and maps an unavailable source to not found", async () => {
    await manualTestRunCreationService.createRun({
      projectId,
      executedById: userId,
      suiteId,
    });
    expect(modelMocks.createFromCatalog).toHaveBeenCalledWith({
      projectId,
      executedById: userId,
      suiteId,
    });

    modelMocks.createFromCatalog.mockResolvedValue(null);
    await expect(
      manualTestRunCreationService.createRun({
        projectId,
        executedById: userId,
        suiteId,
      }),
    ).rejects.toBeInstanceOf(ManualTestRunNotFoundError);
  });

  it("rejects malformed or mixed sources before persistence", async () => {
    await expect(
      manualTestRunCreationService.createRun({
        projectId: "bad",
        executedById: userId,
        suiteId,
      }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    await expect(
      manualTestRunCreationService.createRun({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioId, scenarioId],
      }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    await expect(
      manualTestRunCreationService.createRun({
        projectId,
        executedById: userId,
        scenarioIds: [scenarioId],
        suiteId,
      } as never),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    expect(modelMocks.createFromCatalog).not.toHaveBeenCalled();
  });
});
