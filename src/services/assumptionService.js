import { assumptionModel } from "../models/assumptionModel.js";

export const assumptionService = {
  async createAssumption(assumptionData) {
    // Input validation
    if (!assumptionData || !assumptionData.issueId) {
      throw new Error("Unable to create assumption: missing issue ID");
    }

    if (!assumptionData.resultErrorId) {
      throw new Error("Unable to create assumption: missing result error ID");
    }

    // Business logic - data processing and validation
    const { issueId, resultErrorId, ...rest } = assumptionData;

    const processedAssumption = {
      issueId: Number(issueId),
      resultErrorId: Number(resultErrorId),
      ...rest,
    };

    // Validate that the numbers are valid
    if (
      isNaN(processedAssumption.issueId) ||
      processedAssumption.issueId <= 0
    ) {
      throw new Error("Issue ID must be a valid positive number");
    }

    if (
      isNaN(processedAssumption.resultErrorId) ||
      processedAssumption.resultErrorId <= 0
    ) {
      throw new Error("Result error ID must be a valid positive number");
    }

    const createdAssumption = await assumptionModel.create(processedAssumption);
    return createdAssumption;
  },

  async updateAssumption(assumptionId, updateData) {
    // Input validation
    if (!assumptionId) {
      throw new Error("Assumption ID is required");
    }

    if (!updateData) {
      throw new Error("Update data is required");
    }

    // Business rule validation
    if (updateData.madeBy !== "user") {
      throw new Error("Only real user can modify assumptions");
    }

    // Business logic - handle confirmation workflow
    if (updateData.isConfirmed === true) {
      // Update the assumption if confirmed
      const updatedAssumption = await assumptionModel.update(
        assumptionId,
        updateData,
      );
      return { action: "updated", assumption: updatedAssumption };
    } else if (updateData.isConfirmed === false) {
      // Delete the assumption if user confirmed it's wrong
      await assumptionModel.delete(assumptionId);
      return { action: "deleted", assumptionId: Number(assumptionId) };
    } else {
      // Handle other updates that don't involve confirmation
      const updatedAssumption = await assumptionModel.update(
        assumptionId,
        updateData,
      );
      return { action: "updated", assumption: updatedAssumption };
    }
  },

  async getAssumptionById(assumptionId) {
    if (!assumptionId) {
      throw new Error("Assumption ID is required");
    }

    const assumption = await assumptionModel.findById(assumptionId);

    if (!assumption) {
      throw new Error(`Assumption with ID ${assumptionId} not found`);
    }

    return assumption;
  },
};
