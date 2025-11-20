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
  findById: async (id: string, projectId: string): Promise<PrismaExecution | null> => {
    return await dbClient.execution.findFirst({
      where: {
        id,
        projectId,
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

  delete: async (id: string, projectId: string): Promise<void> => {
    const existingExecution = await dbClient.execution.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        results: {
          include: {
            errors: {
              include: {
                assumptions: true,
              },
            },
          },
        },
      },
    });

    if (!existingExecution) {
      throw new Error(`Execution with ID ${id} not found`);
    }

    await dbClient.$transaction(async (tx) => {
      for (const result of existingExecution.results) {
        for (const error of result.errors) {
          if (error.assumptions.length > 0) {
            await tx.assumption.deleteMany({
              where: {
                resultErrorId: error.id,
              },
            });
          }
        }

        await tx.resultError.deleteMany({
          where: {
            resultId: result.id,
          },
        });
      }

      await tx.result.deleteMany({
        where: {
          executionId: id,
        },
      });

      await tx.execution.delete({
        where: { id },
      });
    });
  },
};
