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
    if (!assumptionData?.issueId) {
      throw new Error("Unable to create assumption: missing issue ID");
    }

    if (!assumptionData.resultErrorId) {
      throw new Error("Unable to create assumption: missing result error ID");
    }

    const { issueId, resultErrorId, ...rest } = assumptionData;

    const processedAssumption: CreateAssumptionRequest = {
      issueId,
      resultErrorId,
      ...rest,
    };

    if (!processedAssumption.issueId) {
      throw new Error("Issue ID is required");
    }

    const createdAssumption = await assumptionModel.create(processedAssumption);
    return createdAssumption;
  },

  async updateAssumption(
    assumptionId: string,
    updateData: Partial<UpdateAssumptionRequest>,
  ): Promise<AssumptionUpdateResult> {
    if (!assumptionId) {
      throw new Error("Assumption ID is required");
    }

    if (!updateData) {
      throw new Error("Update data is required");
    }

    if (updateData.madeBy && updateData.madeBy !== "user") {
      throw new Error("Only real user can modify assumptions");
    }

    if (updateData.isConfirmed === true) {
      const updatedAssumption = await assumptionModel.update(
        assumptionId,
        updateData,
      );
      return { action: "updated", assumption: updatedAssumption };
    } else if (updateData.isConfirmed === false) {
      await assumptionModel.delete(assumptionId);
      return { action: "deleted", assumptionId };
    } else {
      const updatedAssumption = await assumptionModel.update(
        assumptionId,
        updateData,
      );
      return { action: "updated", assumption: updatedAssumption };
    }
  },

  async getAssumptionById(
    assumptionId: string,
    projectId: string,
  ): Promise<PrismaAssumption> {
    if (!assumptionId) {
      throw new Error("Assumption ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const assumption = await assumptionModel.findById(assumptionId, projectId);

    if (!assumption) {
      throw new Error(`Assumption with ID ${assumptionId} not found`);
    }

    return assumption;
  },

  async deleteAssumption(assumptionId: string, projectId: string): Promise<void> {
    if (!assumptionId) {
      throw new Error("Assumption ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const assumption = await assumptionModel.findById(assumptionId, projectId);

    if (!assumption) {
      throw new Error(`Assumption with ID ${assumptionId} not found`);
    }

    await assumptionModel.delete(assumptionId);
  },
};
