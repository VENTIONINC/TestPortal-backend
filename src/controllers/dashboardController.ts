import type { Response, Request } from "express";
import { dashboardService } from "@/services/dashboardService";
import getLogger from "@/lib/logger";

const logger = getLogger("dashboard-controller");

export const dashboardController = {
  /**
   * GET /api/v2/projects/:projectId/dashboard
   * Query Params: environment (string), period (number of days, default 30), type (string, optional)
   */
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { projectId } = req.params;
      const { environment, period, type } = req.query;

      if (!projectId) {
        res.status(400).json({ error: "Project ID is required" });
        return;
      }

      if (!environment || typeof environment !== "string") {
        res
          .status(400)
          .json({ error: "Environment query parameter is required" });
        return;
      }

      // Default period to 30 days if not provided
      let periodDays = 30;
      if (period) {
        const parsedPeriod = parseInt(period as string, 10);
        if (!isNaN(parsedPeriod) && parsedPeriod > 0) {
          periodDays = parsedPeriod;
        }
      }

      const executionType = typeof type === "string" ? type : undefined;

      const dashboardData = await dashboardService.getDashboard(
        projectId,
        environment,
        periodDays,
        executionType,
      );

      res.json(dashboardData);
    } catch (error) {
      logger.error("Error fetching dashboard data", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  },
};
