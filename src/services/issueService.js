import { issueModel } from "../models/issueModel.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const issueService = {
  async getAllIssues({ category, name, page = 1, limit = 30 }) {
    const issues = await issueModel.findMany(category, name, page, limit);
    const totalIssues = await issueModel.count(category, name);

    return {
      issues,
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },

  async getIssueById(issueId) {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const issueRecords = await issueModel.findById(issueId);

    if (!issueRecords) {
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    return issueRecords;
  },

  async createIssue(issueParams) {
    if (!issueParams || !issueParams?.name) {
      throw new Error("Unable to create issue without name");
    }

    const issueRecord = await issueModel.create(issueParams);
    return issueRecord;
  },

  async updateIssue(issueId, updateData) {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const { name, category, description, portal, service, ticket } = updateData;

    const cleanUpdateData = {
      name,
      category,
      description,
      portal,
      service,
      ticket,
    };

    const updatedIssue = await issueModel.update(issueId, cleanUpdateData);
    return updatedIssue;
  },

  // Mock service for testing
  async getMockIssues() {
    const mockIssues = [
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
