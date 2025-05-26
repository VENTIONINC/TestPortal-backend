import { dbClient } from "@/prisma/client";
import type { ResultWithRelations } from "@/types";
import type { Prisma } from "@prisma/client";

interface ResultFilters {
  tag?: string;
  specId?: string;
  specFile?: string;
  specName?: string;
  environment?: string;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
}

export const resultModel = {
  findById: async (
    id: number | string,
  ): Promise<ResultWithRelations | null> => {
    return (await dbClient.result.findUnique({
      where: {
        id: Number(id),
      },
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
    })) as ResultWithRelations | null;
  },

  findMany: async (
    filters: ResultFilters,
    page = 1,
    limit = 1000,
  ): Promise<ResultWithRelations[]> => {
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

    let toDate: Date | undefined;
    if (to) {
      toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1); // +1 day to include results of the whole day
    }

    const whereClause: Prisma.ResultWhereInput = {};

    // Build spec filter
    if (specId || specFile || specName || tag) {
      whereClause.spec = {};
      if (specId) whereClause.spec.id = Number(specId);
      if (specFile) whereClause.spec.file = { contains: specFile };
      if (specName) whereClause.spec.title = { contains: specName };
      if (tag) whereClause.spec.tags = { contains: tag };
    }

    // Build execution filter
    if (environment || type) {
      whereClause.execution = {};
      if (environment) whereClause.execution.environment = environment;
      if (type) whereClause.execution.type = type;
    }

    // Add other filters
    if (status) whereClause.status = status;

    if (from || to) {
      whereClause.startTime = {};
      if (from) whereClause.startTime.gte = new Date(from);
      if (toDate) whereClause.startTime.lte = toDate;
    }

    return (await dbClient.result.findMany({
      where: whereClause,
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
    })) as ResultWithRelations[];
  },

  count: async (filters: ResultFilters): Promise<number> => {
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

    let toDate: Date | undefined;
    if (to) {
      toDate = new Date(to);
      toDate.setDate(toDate.getDate() + 1);
    }

    const whereClause: Prisma.ResultWhereInput = {};

    // Build spec filter
    if (specId || specFile || specName || tag) {
      whereClause.spec = {};
      if (specId) whereClause.spec.id = Number(specId);
      if (specFile) whereClause.spec.file = { contains: specFile };
      if (specName) whereClause.spec.title = { contains: specName };
      if (tag) whereClause.spec.tags = { contains: tag };
    }

    // Build execution filter
    if (environment || type) {
      whereClause.execution = {};
      if (environment) whereClause.execution.environment = environment;
      if (type) whereClause.execution.type = type;
    }

    // Add other filters
    if (status) whereClause.status = status;

    if (from || to) {
      whereClause.startTime = {};
      if (from) whereClause.startTime.gte = new Date(from);
      if (toDate) whereClause.startTime.lte = toDate;
    }

    return await dbClient.result.count({
      where: whereClause,
    });
  },
};
