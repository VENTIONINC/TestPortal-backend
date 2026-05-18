// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import type { Response, Request } from "express";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardGranularity } from "@/types/dashboard";
import getLogger from "@/lib/logger";

const logger = getLogger("dashboard-controller");

function parseDashboardParams(req: Request) {
  const { projectId } = req.params;
  const { environment, period, type, granularity } = req.query;

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  if (!environment || typeof environment !== "string") {
    throw new Error("Environment query parameter is required");
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
    environment,
    periodDays,
    executionType,
    granularity: dataGranularity,
  };
}

export const dashboardController = {
  /**
   * GET /api/v2/projects/:projectId/dashboard
   * Query Params: environment (string), period (number of days, default 30), type (string, optional)
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { projectId, environment, periodDays, executionType, granularity } =
        parseDashboardParams(req);

      const dashboardData = await dashboardService.getDashboard(
        projectId,
        environment,
        periodDays,
        executionType,
        granularity,
      );

      res.json(dashboardData);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "Project ID is required" ||
          error.message === "Environment query parameter is required"
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
