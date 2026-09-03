// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Prisma } from "@prisma/client";

import { assumptionModel } from "@/models/assumptionModel";
import { dbClient } from "@/prisma/client";
import { dashboardService } from "@/services/dashboardService";
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

async function lockResultErrorAndRejectDuplicateConfirmation(
  tx: Prisma.TransactionClient,
  resultErrorId: string,
  assumptionId?: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT "id"
    FROM "ResultError"
    WHERE "id" = ${resultErrorId}::uuid
    FOR UPDATE
  `;

  const confirmedAssumption = await tx.assumption.findFirst({
    where: {
      resultErrorId,
      isConfirmed: true,
      ...(assumptionId && { id: { not: assumptionId } }),
    },
    select: { id: true },
  });
  if (confirmedAssumption) {
    throw new Error(
      `Result error with ID ${resultErrorId} already has a confirmed assumption`,
    );
  }
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

    const {
      issueId,
      resultErrorId,
      madeBy,
      isConfirmed,
      score,
      description,
      hypothesis,
      evidence,
    } = assumptionData;

    const processedAssumption: CreateAssumptionRequest = {
      issueId,
      resultErrorId,
      madeBy,
      isConfirmed,
      score,
      ...(description !== undefined && { description }),
      ...(hypothesis !== undefined && { hypothesis }),
      ...(evidence !== undefined && { evidence }),
    };

    if (!processedAssumption.issueId) {
      throw new Error("Issue ID is required");
    }

    if (isConfirmed) {
      return await dbClient.$transaction(async (tx) => {
        await lockResultErrorAndRejectDuplicateConfirmation(
          tx,
          resultErrorId,
        );
        return await tx.assumption.create({ data: processedAssumption });
      });
    }

    return await assumptionModel.create(processedAssumption);
  },

  async updateAssumption(
    assumptionId: string,
    updateData: Partial<UpdateAssumptionRequest>,
    reviewedById: string,
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
      if (!reviewedById) {
        throw new Error("Reviewer ID is required");
      }

      return await dbClient.$transaction(async (tx) => {
        const assumption = await tx.assumption.findUnique({
          where: { id: assumptionId },
          select: { resultErrorId: true },
        });
        if (!assumption?.resultErrorId) {
          throw new Error(
            `Assumption with ID ${assumptionId} is not linked to a result`,
          );
        }

        await lockResultErrorAndRejectDuplicateConfirmation(
          tx,
          assumption.resultErrorId,
          assumptionId,
        );
        const updatedAssumption = await tx.assumption.update({
          where: { id: assumptionId },
          data: updateData,
          include: {
            issue: true,
            resultError: {
              include: {
                result: { include: { execution: true } },
              },
            },
          },
        });
        const result = updatedAssumption.resultError?.result;

        if (!result) {
          throw new Error(
            `Assumption with ID ${assumptionId} is not linked to a result`,
          );
        }

        await tx.result.update({
          where: { id: result.id },
          data: {
            analysisFeedbackCategory: updatedAssumption.issue.category,
            analysisReviewedAt: new Date(),
            analysisReviewedById: reviewedById,
          },
        });
        await dashboardService.refreshDailyStats(
          result.execution.projectId,
          result.startTime,
          result.execution.environment,
          result.execution.type,
          tx,
        );

        return {
          action: "updated" as const,
          assumption: updatedAssumption as AssumptionWithRelations,
        };
      });
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
