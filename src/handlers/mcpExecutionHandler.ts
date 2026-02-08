import { executionService } from "@/services/executionService";
import type { PrismaExecution } from "@/types";

export const mcpExecutionHandler = {
  async getExecutionById(executionId: string, projectId: string): Promise<PrismaExecution> {
    return await executionService.getExecutionById(executionId, projectId);
  },

  async deleteExecution(executionId: string, projectId: string): Promise<void> {
    await executionService.deleteExecution(executionId, projectId);
  },
};
