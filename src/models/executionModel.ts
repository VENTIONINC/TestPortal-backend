import { dbClient } from "@/prisma/client";
import type { PrismaExecution } from "@/types";
import type { Prisma } from "@prisma/client";

export interface FindManyParams {
  projectId?: string;
  type?: string;
  environment?: string;
  limit?: number;
  offset?: number;
}

export const executionModel = {
  findById: async (id: number | string): Promise<PrismaExecution | null> => {
    return await dbClient.execution.findUnique({
      where: {
        id: Number(id),
      },
    });
  },

  findMany: async (params: FindManyParams): Promise<PrismaExecution[]> => {
    const where: Prisma.ExecutionWhereInput = {};

    if (params.projectId) {
      where.projectId = params.projectId;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.environment) {
      where.environment = params.environment;
    }

    return await dbClient.execution.findMany({
      where,
      ...(params.limit && { take: params.limit }),
      ...(params.offset && { skip: params.offset }),
      orderBy: {
        startedAt: "desc",
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },
};
