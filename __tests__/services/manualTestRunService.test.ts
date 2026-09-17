// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type {
  ManualTestRunPage,
  ManualTestRunResponse,
} from "@/types/manualTestRuns";

interface ManualTestRunHistoryResult {
  page: ManualTestRunPage | null;
  missingScope: "project" | "scenario" | null;
}

const modelMocks = {
  createFromScenario: jest.fn<
    () => Promise<ManualTestRunResponse | null>
  >(),
  findById: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
  findHistory: jest.fn<() => Promise<ManualTestRunHistoryResult>>(),
  updateRun: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
  updateStep: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
  complete: jest.fn<() => Promise<ManualTestRunResponse | null>>(),
};

jest.mock("@/models/manualTestRunModel", () => ({
  manualTestRunModel: modelMocks,
}));

import { manualTestRunService } from "@/services/manualTestRunService";
import {
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const stepId = "44444444-4444-4444-8444-444444444444";
const executorId = "55555555-5555-4555-8555-555555555555";

const run = {
  id: runId,
  projectId,
  sourceTestScenarioId: scenarioId,
  testScenarioId: scenarioId,
  executedById: executorId,
  executedBy: { id: executorId, name: "Tester", email: "tester@example.test" },
  status: "in_progress",
  startedAt: new Date("2026-01-01T00:00:00.000Z"),
  completedAt: null,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  title: "Login",
  details: null,
  objective: "Verify login",
  preconditions: null,
  testData: null,
  expectedResult: null,
  scenarioNotes: null,
  notes: null,
  steps: [
    {
      id: stepId,
      position: 0,
      action: "Open login",
      expectedResult: null,
      status: "not_started",
      notes: null,
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  ],
} as ManualTestRunResponse;

describe("manualTestRunService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modelMocks.createFromScenario.mockResolvedValue(run);
    modelMocks.findById.mockResolvedValue(run);
    modelMocks.findHistory.mockResolvedValue({
      page: { runs: [], total: 0, page: 1, limit: 30, totalPages: 0 },
      missingScope: null,
    });
    modelMocks.updateRun.mockResolvedValue(run);
    modelMocks.updateStep.mockResolvedValue(run);
    modelMocks.complete.mockResolvedValue(run);
  });

  it("normalizes start notes and attributes the authenticated executor", async () => {
    await manualTestRunService.startRun({
      projectId,
      scenarioId,
      executedById: executorId,
      notes: "  Started manually  ",
    });

    expect(modelMocks.createFromScenario).toHaveBeenCalledWith({
      projectId,
      scenarioId,
      executedById: executorId,
      notes: "Started manually",
    });
  });

  it("preserves omitted notes and explicitly passes null for clearing", async () => {
    await manualTestRunService.updateStep({
      projectId,
      runId,
      stepId,
      status: "passed",
    });
    expect(modelMocks.updateStep).toHaveBeenCalledWith({
      projectId,
      runId,
      stepId,
      status: "passed",
    });

    await manualTestRunService.updateRun({
      projectId,
      runId,
      notes: null,
    });
    expect(modelMocks.updateRun).toHaveBeenCalledWith({
      projectId,
      runId,
      notes: null,
    });
  });

  it("rejects empty, unknown, malformed, and immutable writes before persistence", async () => {
    await expect(
      manualTestRunService.updateRun({ projectId, runId }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    await expect(
      manualTestRunService.updateRun({
        projectId,
        runId,
        status: "not_started" as never,
      }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    await expect(
      manualTestRunService.startRun({
        projectId,
        scenarioId,
        executedById: executorId,
        contentMd: "# forbidden",
      } as never),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    expect(modelMocks.updateRun).not.toHaveBeenCalled();
  });

  it("maps missing runs and scopes to not-found errors", async () => {
    modelMocks.findById.mockResolvedValue(null);
    await expect(
      manualTestRunService.getRun({ projectId, runId }),
    ).rejects.toBeInstanceOf(ManualTestRunNotFoundError);

    modelMocks.findHistory.mockResolvedValue({
      page: null,
      missingScope: "scenario",
    });
    await expect(
      manualTestRunService.listRuns({ projectId, scenarioId }),
    ).rejects.toBeInstanceOf(ManualTestRunNotFoundError);
  });
});
