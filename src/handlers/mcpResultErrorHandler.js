import { resultErrorService } from "../services/resultErrorService.js";

export const mcpResultErrorHandler = {
  async assignIssue(resultErrorId, assumptionId) {
    return await resultErrorService.assignIssue(resultErrorId, assumptionId);
  },

  async reviewError(resultErrorId) {
    return await resultErrorService.reviewError(resultErrorId);
  },

  async bulkReview(errorIds) {
    return await resultErrorService.bulkReview(errorIds);
  },

  async getResultErrorById(resultErrorId) {
    return await resultErrorService.getResultErrorById(resultErrorId);
  },
};
