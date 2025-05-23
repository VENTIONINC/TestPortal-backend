import { executionService } from "../services/executionService.js";

export const executionController = {
  getExecutionById: async (req, res) => {
    try {
      const { executionId } = req.params;
      const execution = await executionService.getExecutionById(executionId);
      return res.status(200).json(execution);
    } catch (error) {
      return res.status(404).json({
        error: error.message,
      });
    }
  },
};
