// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const serviceMocks = {
  createRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
};
jest.mock("@/services/manualTestRunCreationService", () => ({
  manualTestRunCreationService: serviceMocks,
}));

import { manualTestRunCreationController } from "@/controllers/manualTestRunCreationController";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
const run = {
  id: "33333333-3333-4333-8333-333333333333",
} as ManualTestRunResponse;

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

describe("manualTestRunCreationController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serviceMocks.createRun.mockResolvedValue(run);
  });

  it("requires authentication and delegates the source with the authenticated starter", async () => {
    const unauthenticated = response();
    await manualTestRunCreationController.create(
      {
        query: { projectId },
        body: { scenarioIds: [scenarioId] },
      } as unknown as AuthenticatedRequest,
      unauthenticated,
    );
    expect(unauthenticated.status as jest.Mock).toHaveBeenCalledWith(401);

    const successful = response();
    await manualTestRunCreationController.create(
      {
        user: {
          id: "44444444-4444-4444-8444-444444444444",
        } as AuthenticatedRequest["user"],
        query: { projectId },
        body: { scenarioIds: [scenarioId], browser: " Chrome ", build: "42" },
      } as unknown as AuthenticatedRequest,
      successful,
    );
    expect(serviceMocks.createRun).toHaveBeenCalledWith({
      projectId,
      executedById: "44444444-4444-4444-8444-444444444444",
      scenarioIds: [scenarioId],
      browser: "Chrome",
      build: "42",
    });
    expect(successful.status as jest.Mock).toHaveBeenCalledWith(201);
    expect(successful.json as jest.Mock).toHaveBeenCalledWith(run);
  });

  it("rejects malformed and mixed source forms before calling the service", async () => {
    const result = response();
    await manualTestRunCreationController.create(
      {
        user: {
          id: "44444444-4444-4444-8444-444444444444",
        } as AuthenticatedRequest["user"],
        query: { projectId },
        body: { scenarioIds: [scenarioId], suiteId: scenarioId },
      } as unknown as AuthenticatedRequest,
      result,
    );
    expect(result.status as jest.Mock).toHaveBeenCalledWith(400);
    expect(serviceMocks.createRun).not.toHaveBeenCalled();
  });
});
