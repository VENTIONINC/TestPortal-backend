// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { Request, Response } from "express";
import type {
  ManualTestRunPage,
  ManualTestRunResponse,
} from "@/types/manualTestRuns";

const serviceMocks = {
  listRuns: jest.fn<() => Promise<ManualTestRunPage>>(),
  getRun: jest.fn<() => Promise<ManualTestRunResponse>>(),
};
jest.mock("@/services/manualTestRunHistoryService", () => ({
  manualTestRunHistoryService: serviceMocks,
}));

import { manualTestRunHistoryController } from "@/controllers/manualTestRunHistoryController";

const projectId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const page: ManualTestRunPage = {
  runs: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 0,
};
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

describe("manualTestRunHistoryController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    serviceMocks.listRuns.mockResolvedValue(page);
    serviceMocks.getRun.mockResolvedValue(run);
  });

  it("passes the project run-list filters and pagination to the service", async () => {
    const result = response();
    await manualTestRunHistoryController.list(
      {
        query: {
          projectId,
          period: "today",
          show: "all",
          timeZone: "Europe/Bratislava",
          page: "2",
          limit: "10",
        },
      } as unknown as Request,
      result,
    );
    expect(serviceMocks.listRuns).toHaveBeenCalledWith({
      projectId,
      page: 2,
      limit: 10,
      search: undefined,
      show: "all",
      period: "today",
      timeZone: "Europe/Bratislava",
      dateFrom: undefined,
      dateTo: undefined,
    });
    expect(result.status as jest.Mock).toHaveBeenCalledWith(200);
    expect(result.json as jest.Mock).toHaveBeenCalledWith(page);
  });

  it("returns a project-scoped selected run detail", async () => {
    const result = response();
    await manualTestRunHistoryController.getById(
      { params: { runId }, query: { projectId } } as unknown as Request<{
        runId: string;
      }>,
      result,
    );
    expect(serviceMocks.getRun).toHaveBeenCalledWith({ projectId, runId });
    expect(result.json as jest.Mock).toHaveBeenCalledWith(run);
  });
});
