import { assumptionModel } from "@/models/assumptionModel";
import type {
  CreateAssumptionRequest,
  UpdateAssumptionRequest,
  PrismaAssumption,
  AssumptionWithRelations,
} from "@/types";

interface AssumptionUpdateResult {
  action: "updated" | "deleted";
  assumption?: AssumptionWithRelations;
  assumptionId?: string; // UUID
}

export const assumptionService = {
  async createAssumption(
    assumptionData: CreateAssumptionRequest,
  ): Promise<PrismaAssumption> {
    // Input validation
    if (!assumptionData?.issueId) {
      throw new Error("Unable to create assumption: missing issue ID");
    }

    if (!assumptionData.resultErrorId) {
      throw new Error("Unable to create assumption: missing result error ID");
    }

    // Business logic - data processing and validation
    const { issueId, resultErrorId, ...rest } = assumptionData;

    const processedAssumption: CreateAssumptionRequest = {
      issueId,
      resultErrorId,
      ...rest,
    };

    // Validate that issueId (UUID) is provided
    if (!processedAssumption.issueId) {
      throw new Error("Issue ID is required");
    }

    // No additional validation needed for resultErrorId (UUID string)
    // Prisma will validate the UUID format

    const createdAssumption = await assumptionModel.create(processedAssumption);
    return createdAssumption;
  },

  async updateAssumption(
    assumptionId: string,
    updateData: Partial<UpdateAssumptionRequest>,
  ): Promise<AssumptionUpdateResult> {
    // Input validation
    if (!assumptionId) {
      throw new Error("Assumption ID is required");
    }

    if (!updateData) {
      throw new Error("Update data is required");
    }

    // Business rule validation
    if (updateData.madeBy && updateData.madeBy !== "user") {
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
      return { action: "deleted", assumptionId };
    } else {
      // Handle other updates that don't involve confirmation
      const updatedAssumption = await assumptionModel.update(
        assumptionId,
        updateData,
      );
      return { action: "updated", assumption: updatedAssumption };
    }
  },

  async getAssumptionById(
    assumptionId: string,
  ): Promise<PrismaAssumption> {
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
