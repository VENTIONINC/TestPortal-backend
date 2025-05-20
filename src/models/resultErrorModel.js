import { dbClient } from "../../prisma/client.js";

export const resultErrorModel = {
  findById: async (id) => {
    return await dbClient.resultError.findUnique({
      where: {
        id: Number(id),
      },
    });
  },

  assignIssue: async (resultErrorId, assumptionId) => {
    return await dbClient.resultError.update({
      where: { id: Number(resultErrorId) },
      data: {
        assumptions: {
          connect: {
            id: assumptionId,
          },
        },
      },
      include: { issue: true },
    });
  },
};
