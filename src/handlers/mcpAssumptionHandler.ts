// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { assumptionService } from "@/services/assumptionService";
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

export const mcpAssumptionHandler = {
  async createAssumption(
    assumptionParams: CreateAssumptionRequest,
  ): Promise<PrismaAssumption> {
    return await assumptionService.createAssumption(assumptionParams);
  },

  async updateAssumption(
    assumptionId: string,
    updateData: Partial<UpdateAssumptionRequest>,
  ): Promise<AssumptionUpdateResult> {
    return await assumptionService.updateAssumption(assumptionId, updateData);
  },

  async getAssumptionById(assumptionId: string, projectId: string): Promise<PrismaAssumption> {
    return await assumptionService.getAssumptionById(assumptionId, projectId);
  },
};
