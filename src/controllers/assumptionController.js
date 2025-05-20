import { assumptionModel } from "../models/assumptionModel.js";

export const assumptionController = {
  createAssumption: async (req, res) => {
    try {
      const { issueId, resultErrorId, ...rest } = req.body;

      if (!issueId) {
        throw new Error("Unable to create new assumption: missing issue id");
      }

      if (!resultErrorId) {
        throw new Error(
          "Unable to create new assumption: missing result error id"
        );
      }

      const assumption = {
        issueId: Number(issueId),
        resultErrorId: Number(resultErrorId),
        ...rest,
      };

      const updatedRecord = await assumptionModel.create(assumption);

      return res.status(201).json(updatedRecord);
    } catch (error) {
      res
        .status(400)
        .json({ error: `Failed to update assumption, ${error.message}` });
    }
  },

  updateAssumption: async (req, res) => {
    try {
      const { assumptionId } = req.params;
      const assumption = req.body;

      if (assumption.madeBy !== "user") {
        throw new Error("Only real user can modify assumptions");
      }

      if (assumption.isConfirmed) {
        const updatedRecord = await assumptionModel.update(
          assumptionId,
          req.body
        );

        return res.status(200).json(updatedRecord);
      }

      // delete record if user confirmed assumption is wrong (isConfirmed === FALSE)
      await assumptionModel.delete(assumptionId);

      return res.status(204).send();
    } catch (error) {
      res
        .status(400)
        .json({ error: `Failed to update assumption, ${error.message}` });
    }
  },
};
