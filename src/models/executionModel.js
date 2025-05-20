import { dbClient } from "../../prisma/client.js";

export const executionModel = {
  findById: async (id) => {
    return await dbClient.execution.findUnique({
      where: {
        id: Number(id),
      },
    });
  },
};
