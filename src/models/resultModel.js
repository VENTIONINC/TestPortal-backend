import { dbClient } from "../../prisma/client.js";

export const resultModel = {
  findById: async (id) => {
    return await dbClient.result.findUnique({
      where: {
        id: Number(id),
      },
      include: { spec: true, execution: true, issue: true },
    });
  },

  findMany: async (filters, page = 1, limit = 1000) => {
    const {
      tag,
      specId,
      specFile,
      specName,
      environment,
      type,
      status,
      from,
      to,
    } = filters;

    let toDate;
    if (to) {
      toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1); // +1 day to include results of the whole day
    }

    return await dbClient.result.findMany({
      where: {
        spec: {
          id: specId ? Number(specId) : undefined,
          file: specFile ? { contains: specFile } : undefined,
          title: specName ? { contains: specName } : undefined,
          tags: tag ? { array_contains: tag } : undefined,
        },
        execution: {
          environment: environment || undefined,
          type: type || undefined,
        },
        status: status || undefined,
        startTime: {
          gte: from ? new Date(from) : undefined,
          lte: to ? toDate : undefined,
        },
      },
      skip: (page - 1) * limit,
      take: Number(limit),
      include: {
        spec: true,
        execution: true,
        errors: {
          include: {
            assumptions: {
              include: {
                issue: true,
              },
            },
          },
        },
      },
    });
  },

  count: async (filters) => {
    const {
      tag,
      specId,
      specFile,
      specName,
      environment,
      type,
      status,
      from,
      to,
    } = filters;

    return await dbClient.result.count({
      where: {
        spec: {
          id: specId ? Number(specId) : undefined,
          file: specFile ? { contains: specFile } : undefined,
          title: specName ? { contains: specName } : undefined,
          tags: tag ? { array_contains: tag } : undefined,
        },
        execution: {
          environment: environment || undefined,
          type: type || undefined,
        },
        status: status || undefined,
        startTime: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
    });
  },
};
