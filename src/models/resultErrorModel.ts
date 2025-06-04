import { dbClient } from "@/prisma/client";
import type { PrismaResultError, ResultErrorWithRelations } from "@/types";

type ResultErrorWithAssumptions = Omit<ResultErrorWithRelations, "result">;

export const resultErrorModel = {
  findById: async (id: number | string): Promise<PrismaResultError | null> => {
    return await dbClient.resultError.findUnique({
      where: {
        id: Number(id),
      },
    });
  },

  assignIssue: async (
    resultErrorId: number | string,
    assumptionId: number | string,
  ): Promise<ResultErrorWithAssumptions> => {
    return await dbClient.resultError.update({
      where: { id: Number(resultErrorId) },
      data: {
        assumptions: {
          connect: {
            id: Number(assumptionId),
          },
        },
      },
      include: {
        assumptions: {
          include: {
            issue: true,
          },
        },
      },
    });
  },
};
