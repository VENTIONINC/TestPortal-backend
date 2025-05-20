import { resultModel } from "../models/resultModel.js";

export const resultController = {
  getResults: async (req, res) => {
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
    } = req.query;

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

    try {
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

      return res.json({
        results,
        total: totalResults,
        page: Number(page),
        totalPages: Math.ceil(totalResults / limit),
      });
    } catch (error) {
      throw new Error(`Failed to fetch results. ${error.message}`);
    }
  },

  getResultById: async (req, res) => {
    const { resultId } = req.params;

    const resultRecord = await resultModel.findById(resultId);

    return res.status(200).json(resultRecord);
  },
};
