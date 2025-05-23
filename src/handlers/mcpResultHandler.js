import { resultService } from "../services/resultService.js";

export const mcpResultHandler = {
  async getResults(params) {
    const {
      tag,
      specId,
      specFile,
      specName,
      environment,
      type,
      status,
      from,
      to,
      page = 1,
      limit = 1000,
    } = params || {};

    return await resultService.getResults({
      tag,
      specId,
      specFile,
      specName,
      environment,
      type,
      status,
      from,
      to,
      page,
      limit,
    });
  },

  async getResultById(resultId) {
    return await resultService.getResultById(resultId);
  },
};
