// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { dashboardController } from "@/controllers/dashboardController";
import { dashboardService } from "@/services/dashboardService";
import { executeController } from "@/test-utils/httpMocks";

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe("dashboardController shared workspace access", () => {
  it("loads dashboard data using project scope without owner scope", async () => {
    jest.spyOn(dashboardService, "getDashboard").mockResolvedValue({
      summary: { totalRuns: 0, failures: 0, passRate: 0 },
      history: [],
      recentExecutions: [],
    });

    const response = await executeController(dashboardController.getDashboard, {
      params: { projectId: "project-1" },
      query: { environment: "staging" },
    });

    expect(response.statusCode).toBe(200);
    expect(dashboardService.getDashboard).toHaveBeenCalledWith(
      "project-1",
      "staging",
      30,
      undefined,
      "daily",
    );
  });
});
