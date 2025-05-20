import { dbClient } from "../../prisma/client.js";

export const specModel = {
  findById: async (id) => {
    return await dbClient.spec.findUnique({
      where: {
        id: Number(id),
      },
    });
  },
};
