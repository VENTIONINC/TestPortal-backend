import { resultErrorService } from "../services/resultErrorService.js";

export const resultErrorController = {
  assignIssue: async (req, res) => {
    try {
      const { resultErrorId } = req.params;
      const { assumptionId } = req.body;

      const updatedRecord = await resultErrorService.assignIssue(
        resultErrorId,
        assumptionId,
      );
      return res.status(200).json(updatedRecord);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to assign issue. ${error.message}`,
      });
    }
  },

  reviewError: async (req, res) => {
    try {
      const { resultErrorId } = req.params;
      const reviewedRecord =
        await resultErrorService.reviewError(resultErrorId);
      return res.status(200).json(reviewedRecord);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to review result error. ${error.message}`,
      });
    }
  },

  bulkReview: async (req, res) => {
    try {
      const { errorIds } = req.body;
      const bulkResults = await resultErrorService.bulkReview(errorIds);
      return res.status(200).json(bulkResults);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to complete bulk review. ${error.message}`,
      });
    }
  },

  getResultErrorById: async (req, res) => {
    try {
      const { resultErrorId } = req.params;
      const resultError =
        await resultErrorService.getResultErrorById(resultErrorId);
      return res.status(200).json(resultError);
    } catch (error) {
      return res.status(404).json({
        error: error.message,
      });
    }
  },
};
