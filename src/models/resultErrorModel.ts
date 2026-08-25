// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";

import { dbClient } from "@/prisma/client";
import type { PrismaResultError, ResultErrorWithRelations } from "@/types";

type ResultErrorWithAssumptions = Omit<ResultErrorWithRelations, "result">;

const modalContextSelect = Prisma.validator<Prisma.ResultErrorSelect>()({
  id: true,
  type: true,
  message: true,
  callLog: true,
  callStack: true,
  rawLogs: true,
  sourceSnippet: true,
  generatedTestCase: true,
  location: true,
  result: {
    select: {
      id: true,
      retry: true,
      status: true,
      duration: true,
      startTime: true,
      reportPortalLink: true,
      analysisCategory: true,
      analysisFeedbackCategory: true,
      spec: {
        select: { id: true, key: true, title: true, file: true },
      },
      execution: {
        select: { id: true, name: true, environment: true },
      },
    },
  },
  assumptions: {
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      isConfirmed: true,
      score: true,
      madeBy: true,
      createdAt: true,
      issue: {
        select: {
          id: true,
          name: true,
          description: true,
          portal: true,
          service: true,
          ticket: true,
        },
      },
    },
  },
});

export type ResultErrorModalContextRecord = Prisma.ResultErrorGetPayload<{
  select: typeof modalContextSelect;
}>;

export const resultErrorModel = {
  findModalContext: async (
    id: string,
    projectId: string,
  ): Promise<ResultErrorModalContextRecord | null> =>
    await dbClient.resultError.findFirst({
      where: {
        id,
        result: {
          execution: { projectId },
          spec: { projectId },
        },
      },
      select: modalContextSelect,
    }),

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
