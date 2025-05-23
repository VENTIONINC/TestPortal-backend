import { resultModel } from "../models/resultModel.js";

export const resultService = {
  async getResults({
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
  }) {
    const filters = {
      tag,
      specId,
      specFile,
      specName,
      environment,
      type,
      status,
      from,
      to,
    };

    const results = await resultModel.findMany(filters, page, limit);
    const totalResults = await resultModel.count(filters);

    for (const result of results) {
      // de-serialize stacks
      if (result.errors && result.errors.length) {
        for (const error of result.errors) {
          error.callLog = JSON.parse(error.callLog);
          error.callStack = JSON.parse(error.callStack);
        }
      }

      // de-serialize string arrays
      result.spec.tags = JSON.parse(result.spec.tags);
      result.spec.annotations = JSON.parse(result.spec.annotations);
    }

    return {
      results,
      total: totalResults,
      page: Number(page),
      totalPages: Math.ceil(totalResults / limit),
    };
  },

  async getResultById(resultId) {
    if (!resultId) {
      throw new Error("Result ID is required");
    }

    const resultRecord = await resultModel.findById(resultId);

    if (!resultRecord) {
      throw new Error(`Result with ID ${resultId} not found`);
    }

    return resultRecord;
  },
};
