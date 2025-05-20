import { resultErrorModel } from "../models/resultErrorModel.js";
import { runReview } from "../lib/error-analyzer.js";

export const resultErrorController = {
  assignIssue: async (req, res) => {
    const { resultErrorId } = req.params;
    const { assumptionId } = req.body;

    try {
      const updatedRecord = await resultErrorModel.assignIssue(
        resultErrorId,
        assumptionId
      );
      return res.status(200).json(updatedRecord);
    } catch (error) {
      res.status(400).json({ error: "Failed to assign issue" });
    }
  },

  reviewError: async (req, res) => {
    const { resultErrorId } = req.params;

    try {
      const resultError = await resultErrorModel.findById(resultErrorId);
      const record = await runReview(resultError);

      console.log(record);

      return res.status(200).json(record);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to review result error #${resultErrorId}, ${error.message}`,
      });
    }
  },

  bulkReview: async (req, res) => {
    const { errorIds } = req.body;
    const reviewResults = [];

    try {
      for (const errorId of errorIds) {
        const resultError = await resultErrorModel.findById(errorId);
        const record = await runReview(resultError);
        reviewResults.push(record);
      }

      return res.status(200).json(reviewResults);
    } catch (e) {
      throw new Error(
        `Unable to complete auto review for: ${errorIds.join(",")}. ${
          e.message
        }`
      );
    }
  },
};
