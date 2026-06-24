// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import type { PrismaIssue, PrismaIssueWithUsers } from "@/types";
import { Prisma } from "@prisma/client";

interface IssueWhereInput {
  category?: string;
  name?: { contains: string };
  projectId?: string;
}

interface CreateIssueData {
  name: string;
  category: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  projectId: string;
  createdById?: string;
  updatedById?: string;
}

export const issueModel = {
  findMany: async (
    projectId: string,
    category?: string,
    name?: string,
    page = 1,
    limit = 30,
  ): Promise<PrismaIssue[]> => {
    const whereClause: IssueWhereInput = { projectId };
    if (category) whereClause.category = category;
    if (name) whereClause.name = { contains: name };

    return await dbClient.issue.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: Number(limit),
      orderBy: { createdAt: "desc" },
    });
  },

  findManyWithUsers: async (
    projectId: string,
    category?: string,
    name?: string,
    page = 1,
    limit = 30,
  ): Promise<PrismaIssueWithUsers[]> => {
    const whereClause: Prisma.IssueWhereInput = { projectId };
    if (category) whereClause.category = category;
    if (name) whereClause.name = { contains: name };

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
    category?: string,
    name?: string,
  ): Promise<number> => {
    const whereClause: IssueWhereInput = { projectId };
    if (category) whereClause.category = category;
    if (name) whereClause.name = { contains: name };

    return await dbClient.issue.count({
      where: whereClause,
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
