import { assumptionService } from "../services/assumptionService.js";

export const mcpAssumptionHandler = {
  async createAssumption(assumptionParams) {
    return await assumptionService.createAssumption(assumptionParams);
  },

  async updateAssumption(assumptionId, updateData) {
    return await assumptionService.updateAssumption(assumptionId, updateData);
  },

  async getAssumptionById(assumptionId) {
    return await assumptionService.getAssumptionById(assumptionId);
  },
};
