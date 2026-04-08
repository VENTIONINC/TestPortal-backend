import { dbClient } from "@/prisma/client";
import type { PrismaResultError, ResultErrorWithRelations } from "@/types";

type ResultErrorWithAssumptions = Omit<ResultErrorWithRelations, "result">;

export const resultErrorModel = {
  findById: async (
    id: string,
    projectId: string,
  ): Promise<PrismaResultError | null> => {
    return await dbClient.resultError.findFirst({
      where: {
        id,
        result: {
          execution: {
            projectId,
          },
        },
      },
    });
  },

  findManyForAnalysis: async (
    ids: string[],
    projectId: string,
  ): Promise<
    Array<
      PrismaResultError & {
        result: {
          id: string;
          status: string;
          duration: number;
          startTime: Date;
          retry: number;
          executionId: string;
          spec: { key: string; title: string; file: string };
          execution: { name: string; environment: string };
        } | null;
      }
    >
  > => {
    return await dbClient.resultError.findMany({
      where: {
        id: { in: ids },
        result: {
          execution: {
            projectId,
          },
        },
      },
      include: {
        result: {
          include: {
            spec: true,
            execution: true,
          },
        },
      },
    });
  },

  findManyForExecutionContext: async (
    executionId: string,
    projectId: string,
    options?: {
      category?: string;
      ids?: string[];
    },
  ): Promise<
    Array<
      PrismaResultError & {
        result: {
          id: string;
          status: string;
          retry: number;
          analysisCategory: string | null;
          analysisConclusion: string | null;
          executionId: string;
        } | null;
      }
    >
  > => {
    return await dbClient.resultError.findMany({
      where: {
        ...(options?.ids ? { id: { in: options.ids } } : {}),
        result: {
          executionId,
          execution: {
            projectId,
          },
          ...(options?.category
            ? { analysisCategory: options.category }
            : {}),
        },
      },
      include: {
        result: {
          select: {
            id: true,
            status: true,
            retry: true,
            analysisCategory: true,
            analysisConclusion: true,
            executionId: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
  },

  findByIdInternal: async (id: string): Promise<PrismaResultError | null> => {
    return await dbClient.resultError.findUnique({
      where: {
        id,
      },
    });
  },

  assignIssue: async (
    resultErrorId: string,
    assumptionId: string,
  ): Promise<ResultErrorWithAssumptions> => {
    return (await dbClient.resultError.update({
      where: { id: resultErrorId },
      data: {
        assumptions: {
          connect: {
            id: assumptionId,
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
    })) as ResultErrorWithAssumptions;
  },
};
