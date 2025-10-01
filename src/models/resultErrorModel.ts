import { dbClient } from "@/prisma/client";
import type { PrismaResultError, ResultErrorWithRelations } from "@/types";

type ResultErrorWithAssumptions = Omit<ResultErrorWithRelations, "result">;

export const resultErrorModel = {
  findById: async (id: string): Promise<PrismaResultError | null> => {
    return await dbClient.resultError.findUnique({
      where: {
        id,
      },
    });
  },

  assignIssue: async (
    resultErrorId: string,
    assumptionId: string,
  ): Promise<ResultErrorWithAssumptions> => {
    return (await dbClient.resultError.update({
      where: { id: resultErrorId },
      data: {
        assumptions: {
          connect: {
            id: assumptionId,
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
    })) as ResultErrorWithAssumptions;
  },
};
