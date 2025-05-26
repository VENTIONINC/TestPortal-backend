import { issueModel } from "@/models/issueModel";
import type { PrismaIssue } from "@/types";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface GetAllIssuesParams {
  category?: string;
  name?: string;
  page?: number;
  limit?: number;
}

interface GetAllIssuesResponse {
  issues: PrismaIssue[];
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

  async getIssueById(issueId: number | string): Promise<PrismaIssue> {
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
    issueId: number | string,
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
};
