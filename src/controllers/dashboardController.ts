// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response, Request } from "express";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardGranularity } from "@/types/dashboard";
import getLogger from "@/lib/logger";

const logger = getLogger("dashboard-controller");

type DashboardParams = {
  projectId: string;
};

function parseDashboardParams(req: Request<DashboardParams>) {
  const { projectId } = req.params;
  const { period, type, granularity } = req.query;

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const periodDays = parseInt(String(period ?? "30"), 10) || 30;
  const executionType = typeof type === "string" ? type : undefined;
  const dataGranularity =
    typeof granularity === "string" &&
    ["daily", "weekly", "monthly"].includes(granularity)
      ? (granularity as DashboardGranularity)
      : periodDays > 90
        ? "weekly"
        : "daily";

  return {
    projectId,
    periodDays,
    executionType,
    granularity: dataGranularity,
  };
}

export const dashboardController = {
  /**
   * GET /api/v2/projects/:projectId/dashboard
   * Query Params: period (number of days, default 30), type (string, optional)
   */
  async getDashboard(
    req: Request<DashboardParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { projectId, periodDays, executionType, granularity } =
        parseDashboardParams(req);

      const dashboardData = await dashboardService.getDashboard(
        projectId,
        periodDays,
        executionType,
        granularity,
      );

      res.json(dashboardData);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "Project ID is required"
        ) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      logger.error("Error fetching dashboard data", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  },
};
