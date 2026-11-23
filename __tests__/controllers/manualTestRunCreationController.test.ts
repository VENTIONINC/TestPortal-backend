// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { Response } from "express";
import getLogger from "@/lib/logger";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import { createMockRequest } from "@/test-utils/httpMocks";
import type { ManualTestRunResponse } from "@/types/manualTestRuns";

const serviceMocks = {
  createRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
};
jest.mock("@/lib/logger", () => {
  const logger = { debug: jest.fn(), error: jest.fn() };
  return { __esModule: true, default: () => logger };
});
jest.mock("@/services/manualTestRunCreationService", () => ({
  manualTestRunCreationService: serviceMocks,
}));

import { manualTestRunCreationController } from "@/controllers/manualTestRunCreationController";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
const user: NonNullable<AuthenticatedRequest["user"]> = {
  id: "44444444-4444-4444-8444-444444444444",
  name: "Test Runner",
  email: "runner@example.com",
  status: "active",
  role: "member",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};
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

  it("delegates the source with the authenticated starter", async () => {
    const successful = response();
    await manualTestRunCreationController.create(
      Object.assign(
        createMockRequest({
          query: { projectId },
          body: {
            title: "Release check",
            scenarioIds: [scenarioId],
            browser: " Chrome ",
            build: "42",
            environmentProperties: [{ name: "Browser", value: "Chrome" }],
          },
        }),
        { user },
      ),
      successful,
    );
    expect(serviceMocks.createRun).toHaveBeenCalledWith({
      projectId,
      executedById: "44444444-4444-4444-8444-444444444444",
      title: "Release check",
      scenarioIds: [scenarioId],
      browser: "Chrome",
      build: "42",
      environmentProperties: [{ name: "Browser", value: "Chrome" }],
    });
    expect(successful.status as jest.Mock).toHaveBeenCalledWith(201);
    expect(successful.json as jest.Mock).toHaveBeenCalledWith(run);
  });

  it("rejects malformed and mixed source forms before calling the service", async () => {
    const result = response();
    await manualTestRunCreationController.create(
      Object.assign(
        createMockRequest({
          query: { projectId },
          body: { scenarioIds: [scenarioId], suiteId: scenarioId },
        }),
        { user },
      ),
      result,
    );
    expect(result.status as jest.Mock).toHaveBeenCalledWith(400);
    expect(serviceMocks.createRun).not.toHaveBeenCalled();
  });

  it("logs unexpected errors and returns a generic 500 response", async () => {
    const error = new Error("Database connection failed");
    serviceMocks.createRun.mockRejectedValueOnce(error);
    const result = response();

    await manualTestRunCreationController.create(
      Object.assign(
        createMockRequest({
          query: { projectId },
          body: { scenarioIds: [scenarioId] },
        }),
        { user },
      ),
      result,
    );

    expect(result.status as jest.Mock).toHaveBeenCalledWith(500);
    expect(result.json as jest.Mock).toHaveBeenCalledWith({
      error: "Failed to create manual test run.",
    });
    expect(getLogger().error).toHaveBeenCalledWith(
      "Failed to create manual test run",
      error,
    );
  });
});
