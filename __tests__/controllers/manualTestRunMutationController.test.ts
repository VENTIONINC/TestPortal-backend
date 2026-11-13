// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const serviceMocks = {
  updateResult: jest.fn<() => Promise<ManualTestRunResponse>>(),
  updateAssignee: jest.fn<() => Promise<ManualTestRunResponse>>(),
  reorder: jest.fn<() => Promise<ManualTestRunResponse>>(),
  bulkUpdate: jest.fn<() => Promise<ManualTestRunResponse>>(),
};
jest.mock("@/services/manualTestRunMutationService", () => ({
  manualTestRunMutationService: serviceMocks,
}));

import { manualTestRunMutationController } from "@/controllers/manualTestRunMutationController";

const projectId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const scenarioId = "33333333-3333-4333-8333-333333333333";
const userId = "44444444-4444-4444-8444-444444444444";
const run = { id: runId } as ManualTestRunResponse;

function response(): Response {
  const result = {} as Response;
  result.status = jest
    .fn()
    .mockReturnValue(result) as unknown as Response["status"];
  result.json = jest
    .fn()
    .mockReturnValue(result) as unknown as Response["json"];
  return result;
}

describe("manualTestRunMutationController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serviceMocks.updateResult.mockResolvedValue(run);
    serviceMocks.bulkUpdate.mockResolvedValue(run);
  });

  it("attributes a result to the authenticated user", async () => {
    const result = response();
    await manualTestRunMutationController.updateResult(
      {
        user: { id: userId } as AuthenticatedRequest["user"],
        params: { runId, scenarioId },
        query: { projectId },
        body: { result: "passed" },
      } as unknown as AuthenticatedRequest<{
        runId: string;
        scenarioId: string;
      }>,
      result,
    );
    expect(serviceMocks.updateResult).toHaveBeenCalledWith({
      projectId,
      runId,
      scenarioId,
      result: "passed",
      resultById: userId,
    });
    expect(result.status as jest.Mock).toHaveBeenCalledWith(200);
  });

  it("requires authentication for bulk result attribution and ignores client identity", async () => {
    const unauthenticated = response();
    await manualTestRunMutationController.bulkUpdate(
      {
        params: { runId },
        query: { projectId },
        body: { scenarioIds: [scenarioId], result: "failed" },
      } as unknown as AuthenticatedRequest<{ runId: string }>,
      unauthenticated,
    );
    expect(unauthenticated.status as jest.Mock).toHaveBeenCalledWith(401);

    const invalid = response();
    await manualTestRunMutationController.bulkUpdate(
      {
        user: { id: userId } as AuthenticatedRequest["user"],
        params: { runId },
        query: { projectId },
        body: {
          scenarioIds: [scenarioId],
          result: "failed",
          resultById: userId,
        },
      } as unknown as AuthenticatedRequest<{ runId: string }>,
      invalid,
    );
    expect(invalid.status as jest.Mock).toHaveBeenCalledWith(400);
    expect(serviceMocks.bulkUpdate).not.toHaveBeenCalled();
  });
});
