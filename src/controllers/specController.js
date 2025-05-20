import { specModel } from "../models/specModel.js";

export const specController = {
  getSpecById: async (req, res) => {
    const { specId } = req.params;

    const record = await specModel.findById(specId);

    record.tags = JSON.parse(record.tags);
    record.annotations = JSON.parse(record.annotations);

    return res.status(200).json(record);
  },
};
