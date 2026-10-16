// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { Request, Response } from "express";
import { dashboardController } from "@/controllers/dashboardController";
import { dashboardService } from "@/services/dashboardService";

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe("dashboardController.getDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("accepts requests without environment and passes period and filters to the dashboard service", async () => {
    const dashboard = {
      summary: { totalRuns: 0, failures: 0, passRate: 0 },
      history: [],
      recentExecutions: [],
    };
    jest.spyOn(dashboardService, "getDashboard").mockResolvedValue(dashboard);
    const req = {
      params: { projectId: "project-1" },
      query: {
        period: "14",
        type: "Nightly",
        granularity: "weekly",
      },
    } as unknown as Request<{ projectId: string }>;
    const res = { json: jest.fn() } as unknown as Response;

    await dashboardController.getDashboard(req, res);

    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      "project-1",
      14,
      "Nightly",
      "weekly",
      undefined,
      undefined,
    );
    expect(res.json).toHaveBeenCalledWith(dashboard);
  });

  it("treats the reserved all sentinel as an unfiltered dashboard request", async () => {
    const dashboard = {
      summary: { totalRuns: 0, failures: 0, passRate: 0 },
      history: [],
      recentExecutions: [],
    };
    jest.spyOn(dashboardService, "getDashboard").mockResolvedValue(dashboard);
    const req = {
      params: { projectId: "project-1" },
      query: {
        period: "14",
        type: "all",
      },
    } as unknown as Request<{ projectId: string }>;
    const res = { json: jest.fn() } as unknown as Response;

    await dashboardController.getDashboard(req, res);

    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      "project-1",
      14,
      undefined,
      "daily",
      undefined,
      undefined,
    );
  });

  it("passes an explicit date range for calendar-day dashboard filters", async () => {
    const dashboard = {
      summary: { totalRuns: 0, failures: 0, passRate: 0 },
      history: [],
      recentExecutions: [],
    };
    jest.spyOn(dashboardService, "getDashboard").mockResolvedValue(dashboard);
    const req = {
      params: { projectId: "project-1" },
      query: {
        period: "1",
        dateFrom: "2026-08-06",
        dateTo: "2026-08-06",
      },
    } as unknown as Request<{ projectId: string }>;
    const res = { json: jest.fn() } as unknown as Response;

    await dashboardController.getDashboard(req, res);

    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      "project-1",
      1,
      undefined,
      "daily",
      "2026-08-06",
      "2026-08-06",
    );
  });

  it("rejects an incomplete calendar-day range", async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const req = {
      params: { projectId: "project-1" },
      query: { dateFrom: "2026-08-06" },
    } as unknown as Request<{ projectId: string }>;
    const res = { status, json } as unknown as Response;

    await dashboardController.getDashboard(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: "dateFrom and dateTo must be provided together",
    });
    expect(dashboardService.getDashboard).not.toHaveBeenCalled();
  });

  it("rejects malformed calendar dates", async () => {
    const status = jest.fn().mockReturnThis();
    const json = jest.fn();
    const req = {
      params: { projectId: "project-1" },
      query: { dateFrom: "2026-02-30", dateTo: "2026-02-30" },
    } as unknown as Request<{ projectId: string }>;
    const res = { status, json } as unknown as Response;

    await dashboardController.getDashboard(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: "dateFrom and dateTo must be valid dates in YYYY-MM-DD format",
    });
    expect(dashboardService.getDashboard).not.toHaveBeenCalled();
  });
});
