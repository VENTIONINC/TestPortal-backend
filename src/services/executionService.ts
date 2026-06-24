// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { executionModel } from "@/models/executionModel";
import type { PrismaExecution } from "@/types";
import { dashboardService } from "@/services/dashboardService";
import getLogger from "@/lib/logger";
import { dbClient } from "@/prisma/client";

const logger = getLogger("execution-service");

export interface GetExecutionsParams {
  projectId?: string;
  type?: string;
  environment?: string;
  limit?: number;
  offset?: number;
}

export const executionService = {
  async getExecutionById(executionId: string, projectId: string): Promise<PrismaExecution> {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const execution = await executionModel.findById(executionId, projectId, dbClient);

    if (!execution) {
      throw new Error(`Execution with ID ${executionId} not found`);
    }

    return execution;
  },

  async getExecutions(params: GetExecutionsParams): Promise<PrismaExecution[]> {
    return await executionModel.findMany(params);
  },

  async getExecutionsByProject(projectId: string): Promise<PrismaExecution[]> {
    return await executionModel.findMany({ projectId });
  },

  async deleteExecution(executionId: string, projectId: string): Promise<void> {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    await dbClient.$transaction(async (tx) => {
      // Fetch execution details before deletion to know which stats bucket to refresh
      const execution = await executionModel.findById(
        executionId,
        projectId,
        tx,
      );

      await executionModel.delete(executionId, projectId, tx);

      if (execution) {
        // Refresh dashboard stats for the affected day
        try {
          await dashboardService.refreshDailyStats(
            projectId,
            execution.createdAt,
            execution.environment,
            execution.type,
            tx,
          );
        } catch (error) {
          logger.error(
            `Failed to refresh dashboard stats after execution deletion: ${error}`,
          );
          throw error;
        }
      }
    });
  },
};
