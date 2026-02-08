import { z } from "zod";
import type { MCPToolSchema } from "@/types";

/**
 * Schema for fetching project dashboard data
 */
export const getProjectDashboardSchema: MCPToolSchema = {
  projectId: z.string(),
  environment: z.string(),
  periodDays: z.number().default(30).optional(),
  type: z.string().optional(),
  granularity: z.enum(["daily", "weekly", "monthly"]).optional(),
};
