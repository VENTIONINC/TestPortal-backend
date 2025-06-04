import { dbClient } from "@/prisma/client";
import type { PrismaIssue } from "@/types";

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
