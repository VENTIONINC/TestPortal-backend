// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { ManualTestRunPage } from "@/types/manualTestRuns";

const modelMocks = {
  list: jest.fn<() => Promise<ManualTestRunPage>>(),
  findById: jest.fn<() => Promise<unknown>>(),
};
jest.mock("@/models/manualTestRunHistoryModel", () => ({
  manualTestRunHistoryModel: modelMocks,
}));

import { manualTestRunHistoryService } from "@/services/manualTestRunHistoryService";
import {
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
} from "@/types/manualTestRuns";

const projectId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const emptyPage: ManualTestRunPage = {
  runs: [],
  total: 0,
  page: 1,
  limit: 30,
  totalPages: 0,
};

describe("manualTestRunHistoryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    modelMocks.list.mockResolvedValue(emptyPage);
    modelMocks.findById.mockResolvedValue({ id: runId });
  });

  it("applies default run-list filters and passes custom calendar context", async () => {
    await manualTestRunHistoryService.listRuns({ projectId });
    expect(modelMocks.list).toHaveBeenCalledWith({
      projectId,
      page: 1,
      limit: 30,
      search: "",
      show: "in_progress",
      period: "recent",
      timeZone: "UTC",
    });

    await manualTestRunHistoryService.listRuns({
      projectId,
      show: "completed",
      period: "custom",
      timeZone: "Europe/Bratislava",
      dateFrom: "2026-11-01",
      dateTo: "2026-11-12",
      search: "  auth  ",
    });
    expect(modelMocks.list).toHaveBeenLastCalledWith({
      projectId,
      page: 1,
      limit: 30,
      search: "auth",
      show: "completed",
      period: "custom",
      timeZone: "Europe/Bratislava",
      dateFrom: "2026-11-01",
      dateTo: "2026-11-12",
    });
  });

  it("rejects incomplete or invalid custom periods before querying", async () => {
    await expect(
      manualTestRunHistoryService.listRuns({
        projectId,
        period: "custom",
        dateFrom: "2026-11-01",
      }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    await expect(
      manualTestRunHistoryService.listRuns({
        projectId,
        timeZone: "not/a-zone",
      }),
    ).rejects.toBeInstanceOf(ManualTestRunValidationError);
    expect(modelMocks.list).not.toHaveBeenCalled();
  });

  it("maps a project-scoped detail miss to not found", async () => {
    modelMocks.findById.mockResolvedValue(null);
    await expect(
      manualTestRunHistoryService.getRun({ projectId, runId }),
    ).rejects.toBeInstanceOf(ManualTestRunNotFoundError);
  });
});
