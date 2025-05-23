import { executionService } from "../services/executionService.js";

export const mcpExecutionHandler = {
  async getExecutionById(executionId) {
    return await executionService.getExecutionById(executionId);
  },
};
