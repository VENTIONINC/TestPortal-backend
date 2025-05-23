import { resultService } from "../services/resultService.js";

export const resultController = {
  getResults: async (req, res) => {
    try {
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

      const result = await resultService.getResults({
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

      return res.json(result);
    } catch (error) {
      return res.status(500).json({
        error: `Failed to fetch results. ${error.message}`,
      });
    }
  },

  getResultById: async (req, res) => {
    try {
      const { resultId } = req.params;
      const resultRecord = await resultService.getResultById(resultId);
      return res.status(200).json(resultRecord);
    } catch (error) {
      return res.status(404).json({
        error: error.message,
      });
    }
  },
};
