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
    id: number | string,
    data: Partial<CreateAssumptionRequest>,
  ): Promise<AssumptionWithRelations> => {
    return (await dbClient.assumption.update({
      where: { id: Number(id) },
      data,
      include: { issue: true },
    })) as AssumptionWithRelations;
  },

  delete: async (id: number | string): Promise<PrismaAssumption> => {
    return await dbClient.assumption.delete({
      where: { id: Number(id) },
    });
  },

  findById: async (id: number | string): Promise<PrismaAssumption | null> => {
    return await dbClient.assumption.findUnique({
      where: { id: Number(id) },
    });
  },

  findByIdWithRelations: async (
    id: number | string,
  ): Promise<AssumptionWithRelations | null> => {
    return (await dbClient.assumption.findUnique({
      where: { id: Number(id) },
      include: {
        issue: true,
        resultError: true,
      },
    })) as AssumptionWithRelations | null;
  },
};
