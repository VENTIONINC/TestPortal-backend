import { dbClient } from "@/prisma/client";
import type { PrismaResultError } from "@/types";
import type { Prisma } from "@prisma/client";

type ResultErrorWithAssumptions = Prisma.ResultErrorGetPayload<{
  include: {
    assumptions: {
      include: {
        issue: true;
      };
    };
  };
}>;

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
