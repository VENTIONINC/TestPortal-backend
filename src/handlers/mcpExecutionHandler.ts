import { executionService } from "@/services/executionService";
import type { PrismaExecution } from "@/types";

export const mcpExecutionHandler = {
  async getExecutionById(executionId: string): Promise<PrismaExecution> {
    return await executionService.getExecutionById(executionId);
  },
};
