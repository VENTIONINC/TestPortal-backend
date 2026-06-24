// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

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
