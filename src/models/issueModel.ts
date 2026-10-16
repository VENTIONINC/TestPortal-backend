// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import type {
  PrismaIssue,
  PrismaIssueWithUsers,
  ResultCategory,
} from "@/types";
import { Prisma } from "@prisma/client";

interface CreateIssueData {
  name: string;
  category: ResultCategory;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  projectId: string;
  createdById?: string;
  updatedById?: string;
}

export interface LinkedIssueResult {
  id: string;
  startTime: Date;
  specId: string;
  analysisCategory: string | null;
  analysisFeedbackCategory: string | null;
  errors: Array<{
    assumptions: Array<{
      issueId: string;
    }>;
  }>;
}

const buildWhereClause = (
  projectId: string,
  category?: ResultCategory,
  name?: string,
  type?: string,
): Prisma.IssueWhereInput => ({
  projectId,
  ...(category && { category }),
  ...(name && { name: { contains: name, mode: "insensitive" } }),
  ...(type && {
    assumptions: {
      some: {
        resultError: {
          result: {
            execution: { type },
          },
        },
      },
    },
  }),
});

export const issueModel = {
  findMany: async (
    projectId: string,
    category?: ResultCategory,
    name?: string,
    page = 1,
    limit = 30,
    type?: string,
  ): Promise<PrismaIssue[]> => {
    const whereClause = buildWhereClause(projectId, category, name, type);

    return await dbClient.issue.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });
  },

  findManyWithUsers: async (
    projectId: string,
    category?: ResultCategory,
    name?: string,
    page = 1,
    limit = 30,
    type?: string,
  ): Promise<PrismaIssueWithUsers[]> => {
    const whereClause = buildWhereClause(projectId, category, name, type);

    return (await dbClient.issue.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: true,
        updatedBy: true,
      },
    })) as PrismaIssueWithUsers[];
  },

  count: async (
    projectId: string,
    category?: ResultCategory,
    name?: string,
    type?: string,
  ): Promise<number> => {
    const whereClause = buildWhereClause(projectId, category, name, type);

    return await dbClient.issue.count({
      where: whereClause,
    });
  },

  findObservedBySpecRecordIds: async (
    specRecordIds: string[],
    projectId: string,
    page = 1,
    limit = 30,
  ): Promise<PrismaIssueWithUsers[]> => {
    if (specRecordIds.length === 0) {
      return [];
    }

    return (await dbClient.issue.findMany({
      where: {
        projectId,
        assumptions: {
          some: {
            resultError: {
              result: {
                spec: {
                  id: { in: specRecordIds },
                  projectId,
                },
                execution: { projectId },
              },
            },
          },
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        createdBy: true,
        updatedBy: true,
      },
    })) as PrismaIssueWithUsers[];
  },

  countObservedBySpecRecordIds: async (
    specRecordIds: string[],
    projectId: string,
  ): Promise<number> => {
    if (specRecordIds.length === 0) {
      return 0;
    }

    return await dbClient.issue.count({
      where: {
        projectId,
        assumptions: {
          some: {
            resultError: {
              result: {
                spec: {
                  id: { in: specRecordIds },
                  projectId,
                },
                execution: { projectId },
              },
            },
          },
        },
      },
    });
  },

  findById: async (
    id: string,
    projectId: string,
  ): Promise<PrismaIssue | null> => {
    return await dbClient.issue.findFirst({
      where: {
        id,
        projectId,
      },
    });
  },

  findByIdWithUsers: async (
    id: string,
    projectId: string,
  ): Promise<PrismaIssueWithUsers | null> => {
    return (await dbClient.issue.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        createdBy: true,
        updatedBy: true,
      },
    })) as PrismaIssueWithUsers | null;
  },

  findLinkedResults: async (
    issueIds: string[],
    statFrom?: string,
    statTo?: string,
    type?: string,
  ): Promise<LinkedIssueResult[]> => {
    if (issueIds.length === 0) {
      return [];
    }

    const where: Prisma.ResultWhereInput = {
      ...(type && { execution: { type } }),
      errors: {
        some: {
          assumptions: {
            some: {
              issueId: { in: issueIds },
            },
          },
        },
      },
    };

    if (statFrom || statTo) {
      where.startTime = {};
      if (statFrom) {
        where.startTime.gte = new Date(statFrom);
      }
      if (statTo) {
        const endOfDay = new Date(statTo);
        endOfDay.setHours(23, 59, 59, 999);
        where.startTime.lte = endOfDay;
      }
    }

    return await dbClient.result.findMany({
      where,
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        specId: true,
        analysisCategory: true,
        analysisFeedbackCategory: true,
        errors: {
          select: {
            assumptions: {
              where: {
                issueId: { in: issueIds },
              },
              select: {
                issueId: true,
              },
            },
          },
        },
      },
    });
  },

  create: async (data: CreateIssueData): Promise<PrismaIssue> => {
    return await dbClient.issue.create({
      data,
    });
  },

  update: async (
    id: string,
    data: Partial<CreateIssueData>,
  ): Promise<PrismaIssue> => {
    return await dbClient.issue.update({
      where: { id },
      data,
    });
  },

  delete: async (id: string, projectId: string): Promise<PrismaIssue> => {
    // Check if issue exists and belongs to the project
    const existingIssue = await dbClient.issue.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        assumptions: true,
      },
    });

    if (!existingIssue) {
      throw new Error(`Issue with ID ${id} not found`);
    }

    // Use a transaction to safely delete assumptions first, then the issue
    return await dbClient.$transaction(async (tx) => {
      // Delete all assumptions associated with this issue
      if (existingIssue.assumptions.length > 0) {
        await tx.assumption.deleteMany({
          where: {
            issueId: id,
          },
        });
      }

      // Delete the issue
      return await tx.issue.delete({
        where: { id },
      });
    });
  },
};
