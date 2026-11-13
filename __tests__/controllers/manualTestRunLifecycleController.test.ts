// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const serviceMocks = {
  completeRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
  deleteRun: jest.fn<() => Promise<void>>(),
  reopenRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
};
jest.mock("@/services/manualTestRunLifecycleService", () => ({
  manualTestRunLifecycleService: serviceMocks,
}));

import { manualTestRunLifecycleController } from "@/controllers/manualTestRunLifecycleController";

const projectId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const run = { id: runId } as ManualTestRunResponse;

function response(): Response {
  const result = {} as Response;
  result.status = jest.fn().mockReturnValue(result) as unknown as Response["status"];
  result.send = jest.fn().mockReturnValue(result) as unknown as Response["send"];
  result.json = jest.fn().mockReturnValue(result) as unknown as Response["json"];
  return result;
}

describe("manualTestRunLifecycleController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serviceMocks.completeRun.mockResolvedValue(run);
    serviceMocks.reopenRun.mockResolvedValue(run);
  });

  it("completes with the authenticated user and does not accept client lifecycle fields", async () => {
    const result = response();
    await manualTestRunLifecycleController.complete(
      {
        user: { id: userId } as AuthenticatedRequest["user"],
        params: { runId },
        query: { projectId },
        body: {},
      } as unknown as AuthenticatedRequest<{ runId: string }>,
      result,
    );
    expect(serviceMocks.completeRun).toHaveBeenCalledWith({ projectId, runId, completedById: userId });
    expect(result.status as jest.Mock).toHaveBeenCalledWith(200);

    const invalid = response();
    await manualTestRunLifecycleController.complete(
      {
        user: { id: userId } as AuthenticatedRequest["user"],
        params: { runId },
        query: { projectId },
        body: { status: "passed" },
      } as unknown as AuthenticatedRequest<{ runId: string }>,
      invalid,
    );
    expect(invalid.status as jest.Mock).toHaveBeenCalledWith(400);
  });

  it("deletes the requested project run", async () => {
    const result = response();
    await manualTestRunLifecycleController.delete({ user: { id: userId }, params: { runId }, query: { projectId } } as unknown as AuthenticatedRequest<{ runId: string }>, result);
    expect(serviceMocks.deleteRun).toHaveBeenCalledWith({ projectId, runId, userId });
    expect(result.status as jest.Mock).toHaveBeenCalledWith(204);
  });

  it("reopens using the authenticated user", async () => {
    const result = response();
    await manualTestRunLifecycleController.reopen(
      {
        user: { id: userId } as AuthenticatedRequest["user"],
        params: { runId },
        query: { projectId },
        body: {},
      } as unknown as AuthenticatedRequest<{ runId: string }>,
      result,
    );
    expect(serviceMocks.reopenRun).toHaveBeenCalledWith({ projectId, runId, reopenedById: userId });
  });
});
