import { issueModel } from "@/models/issueModel";
import type {
  PrismaIssue,
  PrismaUser,
  PrismaIssueWithUsers,
  SerializedUser,
  SerializedIssue,
  SerializedIssuesResponse,
} from "@/types";
import { dbClient } from "@/prisma/client";
import { IssueCategory } from "@/types/enums";
import { Prisma } from "@prisma/client";

interface GetAllIssuesParams {
  category?: IssueCategory;
  name?: string;
  page?: number;
  limit?: number;
  statFrom?: string; // ISO date string
  statTo?: string; // ISO date string
}

interface GetAllIssuesResponse {
  issues: PrismaIssue[];
  total: number;
  page: number;
  totalPages: number;
}

interface TimeDistribution {
  date: string; // ISO date string YYYY-MM-DD
  count: number;
}

interface IssueStatistics {
  occurrenceCount: number;
  firstOccurrence: Date | null;
  lastOccurrence: Date | null;
  impactedTestsCount: number;
  timeDistribution: TimeDistribution[];
}

interface IssueWithStatistics extends PrismaIssue {
  statistics: IssueStatistics;
}

interface GetAllIssuesWithStatsResponse {
  issues: IssueWithStatistics[];
  total: number;
  page: number;
  totalPages: number;
}

interface SerializedIssueWithStatistics extends SerializedIssue {
  statistics: IssueStatistics;
}

interface GetAllIssuesWithStatsV2Response {
  issues: SerializedIssueWithStatistics[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateIssueParams {
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

interface UpdateIssueParams {
  name?: string;
  category?: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  updatedById?: string;
}

export const issueService = {
  async getAllIssues(
    params: GetAllIssuesParams,
  ): Promise<GetAllIssuesResponse> {
    const { category, name, page = 1, limit = 30 } = params;

    const issues = await issueModel.findMany(category, name, page, limit);
    const totalIssues = await issueModel.count(category, name);

    return {
      issues,
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },

  // V2 method with serialized response
  async getAllIssuesV2(
    params: GetAllIssuesParams,
  ): Promise<SerializedIssuesResponse> {
    const { category, name, page = 1, limit = 30 } = params;

    const issues = await issueModel.findManyWithUsers(
      category,
      name,
      page,
      limit,
    );
    const totalIssues = await issueModel.count(category, name);

    return {
      issues: issues.map(serializeIssue),
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },

  async getIssueById(issueId: number): Promise<PrismaIssue> {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const issueRecords = await issueModel.findById(issueId);

    if (!issueRecords) {
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    return issueRecords;
  },

  // V2 method with serialized response
  async getIssueByIdV2(issueId: number): Promise<SerializedIssue> {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const issueRecords = await issueModel.findByIdWithUsers(issueId);

    if (!issueRecords) {
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    return serializeIssue(issueRecords);
  },

  async createIssue(issueParams: CreateIssueParams): Promise<PrismaIssue> {
    if (!issueParams?.name) {
      throw new Error("Unable to create issue without name");
    }

    const issueRecord = await issueModel.create(issueParams);
    return issueRecord;
  },

  async updateIssue(
    issueId: number,
    updateData: UpdateIssueParams,
  ): Promise<PrismaIssue> {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const {
      name,
      category,
      description,
      portal,
      service,
      ticket,
      updatedById,
    } = updateData;

    const cleanUpdateData: Partial<CreateIssueParams> = {};
    if (name) cleanUpdateData.name = name;
    if (category) cleanUpdateData.category = category;
    if (description !== undefined) cleanUpdateData.description = description;
    if (portal !== undefined) cleanUpdateData.portal = portal;
    if (service !== undefined) cleanUpdateData.service = service;
    if (ticket !== undefined) cleanUpdateData.ticket = ticket;
    if (updatedById !== undefined) cleanUpdateData.updatedById = updatedById;

    const updatedIssue = await issueModel.update(issueId, cleanUpdateData);
    return updatedIssue;
  },

  async deleteIssue(issueId: number): Promise<PrismaIssue> {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    // Validate ID format
    const numericId = Number(issueId);
    if (isNaN(numericId) || numericId <= 0) {
      throw new Error("Issue ID must be a valid positive number");
    }

    try {
      const deletedIssue = await issueModel.delete(issueId);
      return deletedIssue;
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to delete issue: ${err.message}`);
    }
  },

  async getAllIssuesWithStats(
    params: GetAllIssuesParams,
  ): Promise<GetAllIssuesWithStatsResponse> {
    const { category, name, page = 1, limit = 10, statFrom, statTo } = params;

    const issues = await issueModel.findMany(category, name, page, limit);
    const totalIssues = await issueModel.count(category, name);

    // Get statistics for each issue
    const issuesWithStats = await Promise.all(
      issues.map(async (issue) => {
        const whereClause: Prisma.ResultWhereInput = {
          errors: {
            some: {
              assumptions: {
                some: {
                  issueId: issue.id,
                },
              },
            },
          },
        };

        // Add date range filter if provided
        if (statFrom || statTo) {
          whereClause.startTime = {};
          if (statFrom) {
            whereClause.startTime.gte = new Date(statFrom);
          }
          if (statTo) {
            const toDate = new Date(statTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire day
            whereClause.startTime.lte = toDate;
          }
        }

        const results = await dbClient.result.findMany({
          where: whereClause,
          include: {
            spec: true,
          },
          orderBy: {
            startTime: "asc",
          },
        });

        const uniqueTestIds = new Set(results.map((r) => r.spec.id));

        // Calculate time distribution
        const timeDistribution = new Map<string, number>();

        results.forEach((result) => {
          const date = result.startTime.toISOString().split("T")[0] ?? ""; // Get YYYY-MM-DD
          timeDistribution.set(date, (timeDistribution.get(date) ?? 0) + 1);
        });

        // Convert to array and sort by date
        const timeDistributionArray = Array.from(timeDistribution.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        return {
          ...issue,
          statistics: {
            occurrenceCount: results.length,
            firstOccurrence: results[0]?.startTime ?? null,
            lastOccurrence: results[results.length - 1]?.startTime ?? null,
            impactedTestsCount: uniqueTestIds.size,
            timeDistribution: timeDistributionArray,
          },
        };
      }),
    );

    return {
      issues: issuesWithStats,
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },

  // V2 method with serialized response and statistics
  async getAllIssuesWithStatsV2(
    params: GetAllIssuesParams,
  ): Promise<GetAllIssuesWithStatsV2Response> {
    const { category, name, page = 1, limit = 10, statFrom, statTo } = params;

    const issues = await issueModel.findManyWithUsers(
      category,
      name,
      page,
      limit,
    );
    const totalIssues = await issueModel.count(category, name);

    // Get statistics for each issue
    const issuesWithStats = await Promise.all(
      issues.map(async (issue) => {
        const whereClause: Prisma.ResultWhereInput = {
          errors: {
            some: {
              assumptions: {
                some: {
                  issueId: issue.id,
                },
              },
            },
          },
        };

        // Add date range filter if provided
        if (statFrom || statTo) {
          whereClause.startTime = {};
          if (statFrom) {
            whereClause.startTime.gte = new Date(statFrom);
          }
          if (statTo) {
            const toDate = new Date(statTo);
            toDate.setHours(23, 59, 59, 999); // Include the entire day
            whereClause.startTime.lte = toDate;
          }
        }

        const results = await dbClient.result.findMany({
          where: whereClause,
          include: {
            spec: true,
          },
          orderBy: {
            startTime: "asc",
          },
        });

        const uniqueTestIds = new Set(results.map((r) => r.spec.id));

        // Calculate time distribution
        const timeDistribution = new Map<string, number>();

        results.forEach((result) => {
          const date = result.startTime.toISOString().split("T")[0] ?? ""; // Get YYYY-MM-DD
          timeDistribution.set(date, (timeDistribution.get(date) ?? 0) + 1);
        });

        // Convert to array and sort by date
        const timeDistributionArray = Array.from(timeDistribution.entries())
          .map(([date, count]) => ({ date, count }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const serialized = serializeIssue(issue);

        return {
          ...serialized,
          statistics: {
            occurrenceCount: results.length,
            firstOccurrence: results[0]?.startTime ?? null,
            lastOccurrence: results[results.length - 1]?.startTime ?? null,
            impactedTestsCount: uniqueTestIds.size,
            timeDistribution: timeDistributionArray,
          },
        };
      }),
    );

    return {
      issues: issuesWithStats,
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },
};

function serializeUser(user: PrismaUser): SerializedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function serializeIssue(issue: PrismaIssueWithUsers): SerializedIssue {
  return {
    id: issue.id,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    name: issue.name,
    category: issue.category,
    description: issue.description ?? null,
    portal: issue.portal ?? null,
    service: issue.service ?? null,
    ticket: issue.ticket ?? null,
    createdBy: issue.createdBy ? serializeUser(issue.createdBy) : null,
    updatedBy: issue.updatedBy ? serializeUser(issue.updatedBy) : null,
  };
}
