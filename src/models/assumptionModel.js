import { dbClient } from "../../prisma/client.js";

export const assumptionModel = {
  create: async (data) => {
    return await dbClient.assumption.create({
      data,
    });
  },

  update: async (id, data) => {
    return await dbClient.assumption.update({
      where: { id: Number(id) },
      data,
      include: { issue: true },
    });
  },

  delete: async (id) => {
    return await dbClient.assumption.delete({
      where: { id: Number(id) },
    });
  },

  findById: async (id) => {
    return await dbClient.assumption.findUnique({
      where: { id: Number(id) },
    });
  },
};
