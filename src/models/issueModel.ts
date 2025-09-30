import { dbClient } from "@/prisma/client";
import type { PrismaIssue, PrismaIssueWithUsers } from "@/types";
import { Prisma } from "@prisma/client";

interface IssueWhereInput {
  category?: string;
  name?: { contains: string };
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
    category?: string,
    name?: string,
    page = 1,
    limit = 30,
  ): Promise<PrismaIssue[]> => {
    const whereClause: IssueWhereInput = {};
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
    category?: string,
    name?: string,
    page = 1,
    limit = 30,
  ): Promise<PrismaIssueWithUsers[]> => {
    const whereClause: Prisma.IssueWhereInput = {};
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

  count: async (category?: string, name?: string): Promise<number> => {
    const whereClause: IssueWhereInput = {};
    if (category) whereClause.category = category;
    if (name) whereClause.name = { contains: name };

    return await dbClient.issue.count({
      where: whereClause,
    });
  },

  findById: async (id: number | string): Promise<PrismaIssue | null> => {
    return await dbClient.issue.findUnique({
      where: {
        id: Number(id),
      },
    });
  },

  findByIdWithUsers: async (
    id: number | string,
  ): Promise<PrismaIssueWithUsers | null> => {
    return (await dbClient.issue.findUnique({
      where: {
        id: Number(id),
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
    id: number | string,
    data: Partial<CreateIssueData>,
  ): Promise<PrismaIssue> => {
    return await dbClient.issue.update({
      where: { id: Number(id) },
      data,
    });
  },

  delete: async (id: number | string): Promise<PrismaIssue> => {
    const issueId = Number(id);
    
    // Check if issue exists
    const existingIssue = await dbClient.issue.findUnique({
      where: { id: issueId },
      include: {
        assumptions: true,
      },
    });

    if (!existingIssue) {
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    // Use a transaction to safely delete assumptions first, then the issue
    return await dbClient.$transaction(async (tx) => {
      // Delete all assumptions associated with this issue
      if (existingIssue.assumptions.length > 0) {
        await tx.assumption.deleteMany({
          where: {
            issueId,
          },
        });
      }

      // Delete the issue
      return await tx.issue.delete({
        where: { id: issueId },
      });
    });
  },
};
