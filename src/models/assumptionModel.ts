// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import type {
  PrismaAssumption,
  AssumptionWithRelations,
  CreateAssumptionRequest,
} from "@/types";

export const assumptionModel = {
  create: async (data: CreateAssumptionRequest): Promise<PrismaAssumption> => {
    return await dbClient.assumption.create({
      data,
    });
  },

  update: async (
    id: string,
    data: Partial<CreateAssumptionRequest>,
  ): Promise<AssumptionWithRelations> => {
    return (await dbClient.assumption.update({
      where: { id },
      data,
      include: { issue: true },
    })) as AssumptionWithRelations;
  },

  delete: async (id: string): Promise<PrismaAssumption> => {
    return await dbClient.assumption.delete({
      where: { id },
    });
  },

  findById: async (id: string, projectId: string): Promise<PrismaAssumption | null> => {
    return await dbClient.assumption.findFirst({
      where: {
        id,
        issue: {
          projectId,
        },
      },
    });
  },

  findByIdSimple: async (id: string): Promise<PrismaAssumption | null> => {
    return await dbClient.assumption.findUnique({
      where: { id },
    });
  },

  findByIdWithRelations: async (
    id: string,
  ): Promise<AssumptionWithRelations | null> => {
    return (await dbClient.assumption.findUnique({
      where: { id },
      include: {
        issue: true,
        resultError: true,
      },
    })) as AssumptionWithRelations | null;
  },
};
