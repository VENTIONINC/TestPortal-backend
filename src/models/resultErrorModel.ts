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

const similarityCandidateSelect = Prisma.validator<Prisma.IssueSelect>()({
  id: true,
  name: true,
  description: true,
  portal: true,
  service: true,
  ticket: true,
  projectId: true,
  assumptions: {
    where: { isConfirmed: true, resultErrorId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      isConfirmed: true,
      resultError: {
        select: {
          id: true,
          message: true,
          callStack: true,
          result: {
            select: {
              id: true,
              analysisCategory: true,
              analysisFeedbackCategory: true,
              spec: { select: { file: true } },
            },
          },
        },
      },
    },
  },
});

export type ResultErrorSimilarityCandidateRecord = Prisma.IssueGetPayload<{
  select: typeof similarityCandidateSelect;
}>;

export interface ResultErrorSimilarityCandidate {
  projectId: string;
  issue: {
    id: string;
    name: string;
    description: string | null;
    portal: string | null;
    service: string | null;
    ticket: string | null;
  };
  evidence: Array<{
    resultErrorId: string;
    resultId: string | null;
    analysisCategory: string | null;
    analysisFeedbackCategory: string | null;
    isConfirmed: true;
    message: string;
    callStack: Prisma.JsonValue;
    specPath: string | null;
  }>;
}

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

  findSimilarityCandidates: async (
    projectId: string,
  ): Promise<ResultErrorSimilarityCandidate[]> => {
    const rows: ResultErrorSimilarityCandidateRecord[] =
      await dbClient.issue.findMany({
      where: {
        projectId,
        assumptions: {
          some: { isConfirmed: true, resultErrorId: { not: null } },
        },
      },
      orderBy: { id: "asc" },
      take: 100,
      select: similarityCandidateSelect,
      });
    return rows.map((row) => ({
      projectId: row.projectId,
      issue: {
        id: row.id,
        name: row.name,
        description: row.description,
        portal: row.portal,
        service: row.service,
        ticket: row.ticket,
      },
      evidence: row.assumptions.flatMap((assumption) => {
        const error = assumption.resultError;
        if (!error) return [];
        return [
          {
            resultErrorId: error.id,
            resultId: error.result?.id ?? null,
            analysisCategory: error.result?.analysisCategory ?? null,
            analysisFeedbackCategory:
              error.result?.analysisFeedbackCategory ?? null,
            isConfirmed: true as const,
            message: error.message,
            callStack: error.callStack,
            specPath: error.result?.spec.file ?? null,
          },
        ];
      }),
    }));
  },

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
