import { executionModel } from "@/models/executionModel";
import type { PrismaExecution } from "@/types";

export interface GetExecutionsParams {
  projectId?: string;
  type?: string;
  environment?: string;
  limit?: number;
  offset?: number;
}

export const executionService = {
  async getExecutionById(
    executionId: number | string,
  ): Promise<PrismaExecution> {
    if (!executionId) {
      throw new Error("Execution ID is required");
    }

    // Validate ID format
    const numericId = Number(executionId);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error("Execution ID must be a valid positive number");
    }

    const execution = await executionModel.findById(executionId);

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
};
