import { executionModel } from "../models/executionModel.js";

export const executionController = {
  getExecutionById: async (req, res) => {
    const { executionId } = req.params;

    const record = await executionModel.findById(executionId);

    return res.status(200).json(record);
  },
};
