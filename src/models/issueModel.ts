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
  createdById?: number;
  updatedById?: number;
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
};
