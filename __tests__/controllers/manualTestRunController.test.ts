// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const serviceMocks = {
  startRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
  listRuns: jest.fn<() => Promise<unknown>>(),
  getRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
  updateRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
  updateStep: jest.fn<() => Promise<ManualTestRunResponse>>(),
  completeRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
};

jest.mock("@/services/manualTestRunService", () => ({
  manualTestRunService: serviceMocks,
}));

import { manualTestRunController } from "@/controllers/manualTestRunController";
import {
  ManualTestRunConflictError,
  ManualTestRunNotFoundError,
} from "@/types/manualTestRuns";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
const runId = "33333333-3333-4333-8333-333333333333";
const user = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Tester",
  email: "tester@example.test",
  status: "active" as const,
  role: "member" as const,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

function response(): Response {
  const result = {} as Response;
  result.status = jest.fn().mockReturnValue(result) as unknown as Response["status"];
  result.json = jest.fn().mockReturnValue(result) as unknown as Response["json"];
  return result;
}

describe("manualTestRunController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serviceMocks.startRun.mockResolvedValue({} as ManualTestRunResponse);
    serviceMocks.completeRun.mockResolvedValue({} as ManualTestRunResponse);
  });

  it("requires authenticated identity and rejects client executor overrides", async () => {
    const unauthenticated = response();
    await manualTestRunController.start(
      { params: { scenarioId }, query: { projectId }, body: {} } as unknown as AuthenticatedRequest<{
        scenarioId: string;
      }>,
      unauthenticated,
    );
    expect(unauthenticated.status as jest.Mock).toHaveBeenCalledWith(401);
    expect(serviceMocks.startRun).not.toHaveBeenCalled();

    const invalid = response();
    await manualTestRunController.start(
      {
        user,
        params: { scenarioId },
        query: { projectId },
        body: { executedById: user.id },
      } as unknown as AuthenticatedRequest<{ scenarioId: string }>,
      invalid,
    );
    expect(invalid.status as jest.Mock).toHaveBeenCalledWith(400);
    expect(serviceMocks.startRun).not.toHaveBeenCalled();
  });

  it("maps scoped not-found and completed-state errors consistently", async () => {
    serviceMocks.getRun.mockRejectedValue(new ManualTestRunNotFoundError("not found"));
    const missing = response();
    await manualTestRunController.getById(
      { params: { runId }, query: { projectId } } as unknown as Request<{
        runId: string;
      }>,
      missing,
    );
    expect(missing.status as jest.Mock).toHaveBeenCalledWith(404);
    expect(missing.json as jest.Mock).toHaveBeenCalledWith({ error: "not found" });

    serviceMocks.completeRun.mockRejectedValue(
      new ManualTestRunConflictError("completed"),
    );
    const conflict = response();
    await manualTestRunController.complete(
      { params: { runId }, query: { projectId }, body: { status: "failed" } } as unknown as Request<{
        runId: string;
      }>,
      conflict,
    );
    expect(conflict.status as jest.Mock).toHaveBeenCalledWith(409);
    expect(conflict.json as jest.Mock).toHaveBeenCalledWith({ error: "completed" });
  });

  it("returns successful completion with the service response", async () => {
    const result = response();
    await manualTestRunController.complete(
      { params: { runId }, query: { projectId }, body: { status: "failed" } } as unknown as Request<{
        runId: string;
      }>,
      result,
    );
    expect(serviceMocks.completeRun).toHaveBeenCalledWith({
      projectId,
      runId,
      status: "failed",
    });
    expect(result.status as jest.Mock).toHaveBeenCalledWith(200);
  });
});
