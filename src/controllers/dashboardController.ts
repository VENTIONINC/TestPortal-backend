// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response, Request } from "express";
import { resolveExecutionTypeFilter } from "@/lib/params-builder";
import { dashboardService } from "@/services/dashboardService";
import type { DashboardGranularity } from "@/types/dashboard";
import getLogger from "@/lib/logger";

const logger = getLogger("dashboard-controller");

type DashboardParams = {
  projectId: string;
};

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 0) - 1, day ?? 0));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === (month ?? 0) - 1 &&
    date.getUTCDate() === day
  );
}

function parseDashboardParams(req: Request<DashboardParams>) {
  const { projectId } = req.params;
  const { period, type, granularity, dateFrom, dateTo } = req.query;

  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const hasDateFrom = typeof dateFrom === "string";
  const hasDateTo = typeof dateTo === "string";
  if (hasDateFrom !== hasDateTo) {
    throw new Error("dateFrom and dateTo must be provided together");
  }
  if (
    hasDateFrom &&
    hasDateTo &&
    (!isValidCalendarDate(dateFrom) || !isValidCalendarDate(dateTo))
  ) {
    throw new Error("dateFrom and dateTo must be valid dates in YYYY-MM-DD format");
  }

  const periodDays = parseInt(String(period ?? "30"), 10) || 30;
  const executionType =
    typeof type === "string" ? resolveExecutionTypeFilter(type) : undefined;
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
    dateFrom: typeof dateFrom === "string" ? dateFrom : undefined,
    dateTo: typeof dateTo === "string" ? dateTo : undefined,
  };
}

export const dashboardController = {
  /**
   * GET /api/v2/projects/:projectId/dashboard
   * Query Params: period (number of days, default 30), type (string, optional),
   * dateFrom/dateTo (inclusive calendar-day range, optional)
   */
  async getDashboard(
    req: Request<DashboardParams>,
    res: Response,
  ): Promise<void> {
    try {
      const { projectId, periodDays, executionType, granularity, dateFrom, dateTo } =
        parseDashboardParams(req);

      const dashboardData = await dashboardService.getDashboard(
        projectId,
        periodDays,
        executionType,
        granularity,
        dateFrom,
        dateTo,
      );

      res.json(dashboardData);
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === "Project ID is required" ||
          error.message === "dateFrom and dateTo must be provided together" ||
          error.message === "dateFrom and dateTo must be valid dates in YYYY-MM-DD format"
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
