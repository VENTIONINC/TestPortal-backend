// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { PrismaIssue, PrismaUser } from "@/types";
import { issueService } from "@/services/issueService";
import { IssueCategory } from "@/types/enums";

const users: PrismaUser[] = [];
const issues: PrismaIssue[] = [];

const generateUserId = () => crypto.randomUUID();
const generateIssueId = () => crypto.randomUUID();

const mockResultFindMany = jest.fn(async () => [] as unknown[]);

jest.mock("@/models/userModel", () => ({
  userModel: {
    findById: jest.fn((id: string) => {
      const user = users.find((u) => u.id === id);
      return Promise.resolve(user ?? null);
    }),
    findByEmail: jest.fn((email: string) => {
      const user = users.find((u) => u.email === email);
      return Promise.resolve(user ?? null);
    }),
    create: jest.fn(
      (data: { name: string; email: string; passwordHash: string }) => {
        const user: PrismaUser = {
          id: generateUserId(),
          createdAt: new Date(),
          updatedAt: new Date(),
          name: data.name,
          email: data.email,
          passwordHash: data.passwordHash,
          cognitoUserId: null,
          mcpToken: null,
          reportPortalUrl: null,
          reportPortalEnabled: false,
          monitoringPortalUrl: null,
          monitoringPortalEnabled: false,
          analyzeEnabled: false,
        };
        users.push(user);
        return Promise.resolve(user);
      },
    ),
  },
}));

jest.mock("@/models/issueModel", () => ({
  issueModel: {
    findMany: jest.fn(
      (
        projectId: string,
        category?: string,
        name?: string,
        page = 1,
        limit = 30,
      ) => {
        let filtered = issues.filter((issue) => issue.projectId === projectId);
        if (category) {
          filtered = filtered.filter((issue) =>
            issue.category.toLowerCase().includes(category.toLowerCase()),
          );
        }
        if (name) {
          filtered = filtered.filter((issue) =>
            issue.name.toLowerCase().includes(name.toLowerCase()),
          );
        }
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        return Promise.resolve(filtered.slice(startIndex, endIndex));
      },
    ),
    findManyWithUsers: jest.fn(
      (
        projectId: string,
        category?: string,
        name?: string,
        page = 1,
        limit = 30,
      ) => {
        let filtered = issues.filter((issue) => issue.projectId === projectId);
        if (category) {
          filtered = filtered.filter((issue) =>
            issue.category.toLowerCase().includes(category.toLowerCase()),
          );
        }
        if (name) {
          filtered = filtered.filter((issue) =>
            issue.name.toLowerCase().includes(name.toLowerCase()),
          );
        }
        const startIndex = (Number(page) - 1) * Number(limit);
        const endIndex = startIndex + Number(limit);
        return Promise.resolve(
          filtered.slice(startIndex, endIndex).map((issue) => ({
            ...issue,
            createdBy: issue.createdById
              ? (users.find((u) => u.id === issue.createdById) ?? null)
              : null,
            updatedBy: issue.updatedById
              ? (users.find((u) => u.id === issue.updatedById) ?? null)
              : null,
          })),
        );
      },
    ),
    count: jest.fn((projectId: string, category?: string, name?: string) => {
      let filtered = issues.filter((issue) => issue.projectId === projectId);
      if (category) {
        filtered = filtered.filter((issue) =>
          issue.category.toLowerCase().includes(category.toLowerCase()),
        );
      }
      if (name) {
        filtered = filtered.filter((issue) =>
          issue.name.toLowerCase().includes(name.toLowerCase()),
        );
      }
      return Promise.resolve(filtered.length);
    }),
    findById: jest.fn((id: string, projectId: string) => {
      const issue = issues.find(
        (i) => i.id === id && i.projectId === projectId,
      );
      return Promise.resolve(issue ?? null);
    }),
    findByIdWithUsers: jest.fn((id: string, projectId: string) => {
      const issue = issues.find(
        (i) => i.id === id && i.projectId === projectId,
      );
      if (!issue) return Promise.resolve(null);
      return Promise.resolve({
        ...issue,
        createdBy: issue.createdById
          ? (users.find((u) => u.id === issue.createdById) ?? null)
          : null,
        updatedBy: issue.updatedById
          ? (users.find((u) => u.id === issue.updatedById) ?? null)
          : null,
      });
    }),
    create: jest.fn((data: Partial<PrismaIssue>) => {
      const issue: PrismaIssue = {
        id: generateIssueId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        name: data.name as string,
        category: data.category as string,
        description: data.description ?? null,
        portal: data.portal ?? null,
        service: data.service ?? null,
        ticket: data.ticket ?? null,
        projectId: data.projectId ?? "test-project",
        createdById: data.createdById ?? null,
        updatedById: data.updatedById ?? null,
      };
      issues.push(issue);
      return Promise.resolve(issue);
    }),
    update: jest.fn((id: string, data: Partial<PrismaIssue>) => {
      const issue = issues.find((i) => i.id === id);
      if (!issue) throw new Error("Issue not found");
      Object.assign(issue, data, { updatedAt: new Date() });
      return Promise.resolve(issue);
    }),
    delete: jest.fn((id: string) => {
      const index = issues.findIndex((i) => i.id === id);
      if (index === -1) throw new Error("Issue not found");
      issues.splice(index, 1);
      return Promise.resolve();
    }),
  },
}));

jest.mock("@/prisma/client", () => ({
  dbClient: {
    result: {
      findMany: () => mockResultFindMany(),
    },
  },
}));

const addUser = (name: string, email: string): PrismaUser => {
  const user: PrismaUser = {
    id: generateUserId(),
    name,
    email,
    passwordHash: "hash",
    createdAt: new Date(),
    updatedAt: new Date(),
    cognitoUserId: null,
    mcpToken: null,
    reportPortalUrl: null,
    reportPortalEnabled: false,
    monitoringPortalUrl: null,
    monitoringPortalEnabled: false,
    analyzeEnabled: false,
  };
  users.push(user);
  return user;
};

const createIssueRecord = async (
  name: string,
  category: string,
  user: PrismaUser,
): Promise<PrismaIssue> =>
  issueService.createIssue({
    name,
    category,
    projectId: "test-project",
    createdById: user.id,
    updatedById: user.id,
  });

describe("Issue service V2 behaviours", () => {
  let primaryUser: PrismaUser;

  beforeEach(async () => {
    users.length = 0;
    issues.length = 0;
    mockResultFindMany.mockResolvedValue([]);
    primaryUser = addUser("Primary User", "primary@ventionteams.com");
  });

  it("fetches issues with user relations", async () => {
    await createIssueRecord("Login bug", "bug", primaryUser);

    const result = await issueService.getAllIssuesV2({
      projectId: "test-project",
    });

    expect(result.issues).toHaveLength(1);
    const [firstIssue] = result.issues;
    expect(firstIssue?.createdBy?.id).toBe(primaryUser.id);
  });

  it("supports filtering by category and name", async () => {
    await createIssueRecord("Login bug", "bug", primaryUser);
    await createIssueRecord("Signup bug", "bug", primaryUser);
    await createIssueRecord("Perf issue", "performance", primaryUser);

    const bugResult = await issueService.getAllIssuesV2({
      projectId: "test-project",
      category: IssueCategory.Bug,
    });
    expect(bugResult.issues).toHaveLength(2);

    const nameResult = await issueService.getAllIssuesV2({
      projectId: "test-project",
      name: "Login",
    });
    expect(nameResult.issues).toHaveLength(1);
    const [loginIssue] = nameResult.issues;
    expect(loginIssue?.name).toBe("Login bug");
  });

  it("supports full CRUD workflow", async () => {
    const created = await createIssueRecord("CRUD Issue", "test", primaryUser);

    const fetched = await issueService.getIssueByIdV2(
      created.id,
      "test-project",
    );
    expect(fetched.name).toBe("CRUD Issue");

    await issueService.updateIssue(created.id, {
      name: "Updated CRUD Issue",
      category: "updated",
      updatedById: primaryUser.id,
    });

    const list = await issueService.getAllIssuesV2({
      projectId: "test-project",
    });
    expect(list.issues[0]?.name).toBe("Updated CRUD Issue");
  });

  it("maintains user context across operations", async () => {
    const secondUser = addUser("Second User", "second@ventionteams.com");

    const created = await createIssueRecord(
      "Ownership test",
      "test",
      primaryUser,
    );
    expect(created.createdById).toBe(primaryUser.id);

    const updated = await issueService.updateIssue(created.id, {
      description: "Updated by second user",
      updatedById: secondUser.id,
    });

    expect(updated.updatedById).toBe(secondUser.id);
    expect(updated.createdById).toBe(primaryUser.id);
  });

  it("returns statistics when requested", async () => {
    await createIssueRecord("Stat Issue", "bug", primaryUser);
    mockResultFindMany.mockResolvedValueOnce([
      {
        startTime: new Date("2024-01-01T10:00:00Z"),
        spec: { id: "spec-1" },
      },
      {
        startTime: new Date("2024-01-02T12:00:00Z"),
        spec: { id: "spec-2" },
      },
    ]);

    const result = await issueService.getAllIssuesWithStatsV2({
      projectId: "test-project",
    });

    expect(result.issues[0]?.statistics.occurrenceCount).toBe(2);
  });
});
