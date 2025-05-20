import { dbClient } from "../../prisma/client.js";

export const issueModel = {
  findMany: async (category, name, page = 1, limit = 30) => {
    return await dbClient.issue.findMany({
      where: {
        category: category || undefined,
        name: name ? { contains: name } : undefined,
      },
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });
  },

  count: async (category, name) => {
    return await dbClient.issue.count({
      where: {
        category: category || undefined,
        name: name ? { contains: name } : undefined,
      },
    });
  },

  findById: async (id) => {
    return await dbClient.issue.findUnique({
      where: {
        id: Number(id),
      },
    });
  },

  create: async (data) => {
    return await dbClient.issue.create({
      data,
    });
  },

  update: async (id, data) => {
    return await dbClient.issue.update({
      where: { id: Number(id) },
      data,
    });
  },
};
