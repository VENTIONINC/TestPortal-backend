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
    );
    expect(res.json).toHaveBeenCalledWith(dashboard);
  });
});
