import { issueModel } from "@/models/issueModel";
import type { PrismaIssue } from "@/types";
import { dbClient } from "@/prisma/client";
import { IssueCategory } from "@/types/enums";
import { Prisma } from "@prisma/client";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

interface CreateIssueParams {
  name: string;
  category: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
}

interface UpdateIssueParams {
  name?: string;
  category?: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
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

    const { name, category, description, portal, service, ticket } = updateData;

    const cleanUpdateData: Partial<CreateIssueParams> = {};
    if (name) cleanUpdateData.name = name;
    if (category) cleanUpdateData.category = category;
    if (description !== undefined) cleanUpdateData.description = description;
    if (portal !== undefined) cleanUpdateData.portal = portal;
    if (service !== undefined) cleanUpdateData.service = service;
    if (ticket !== undefined) cleanUpdateData.ticket = ticket;

    const updatedIssue = await issueModel.update(issueId, cleanUpdateData);
    return updatedIssue;
  },

  // Mock service for testing
  async getMockIssues(): Promise<PrismaIssue[]> {
    const mockIssues: PrismaIssue[] = [
      {
        id: 1,
        createdAt: new Date("2024-01-15T10:30:00Z"),
        updatedAt: new Date("2024-01-15T10:30:00Z"),
        name: "Login Authentication Failure",
        category: "authentication",
        description:
          "Users are experiencing intermittent login failures when using multi-factor authentication",
        portal: "user-portal",
        service: "auth-service",
        ticket: "TICKET-12345",
      },
      {
        id: 2,
        createdAt: new Date("2024-01-16T14:20:00Z"),
        updatedAt: new Date("2024-01-16T15:45:00Z"),
        name: "Payment Processing Timeout",
        category: "payment",
        description: "Payment transactions are timing out during peak hours",
        portal: "checkout-portal",
        service: "payment-service",
        ticket: "TICKET-12346",
      },
    ];

    await sleep(1000);
    return mockIssues;
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
};

