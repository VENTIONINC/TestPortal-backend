import { assumptionService } from "../services/assumptionService.js";

export const assumptionController = {
  createAssumption: async (req, res) => {
    try {
      const assumptionData = req.body;
      const assumption =
        await assumptionService.createAssumption(assumptionData);
      return res.status(201).json(assumption);
    } catch (error) {
      return res.status(400).json({
        error: `Failed to create assumption. ${error.message}`,
      });
    }
  },

  updateAssumption: async (req, res) => {
    try {
      const { assumptionId } = req.params;
      const updateData = req.body;

      const result = await assumptionService.updateAssumption(
        assumptionId,
        updateData,
      );

      if (result.action === "deleted") {
        return res.status(204).send();
      } else {
        return res.status(200).json(result.assumption);
      }
    } catch (error) {
      return res.status(400).json({
        error: `Failed to update assumption. ${error.message}`,
      });
    }
  },

  getAssumptionById: async (req, res) => {
    try {
      const { assumptionId } = req.params;
      const assumption =
        await assumptionService.getAssumptionById(assumptionId);
      return res.status(200).json(assumption);
    } catch (error) {
      return res.status(404).json({
        error: error.message,
      });
    }
  },
};
