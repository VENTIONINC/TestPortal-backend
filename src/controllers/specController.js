import { specService } from "../services/specService.js";

export const specController = {
  getSpecById: async (req, res) => {
    try {
      const { specId } = req.params;
      const spec = await specService.getSpecById(specId);
      return res.status(200).json(spec);
    } catch (error) {
      return res.status(404).json({
        error: error.message,
      });
    }
  },
};
