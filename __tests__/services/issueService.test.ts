// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { issueModel, type LinkedIssueResult } from "@/models/issueModel";
import { issueService } from "@/services/issueService";
import type { PrismaIssue, PrismaIssueWithUsers, PrismaUser } from "@/types";

jest.mock("@/models/issueModel");

const mockIssueModel = issueModel as jest.Mocked<typeof issueModel>;
const now = new Date("2026-07-28T10:00:00.000Z");

const user: PrismaUser = {
  id: "00000000-0000-4000-8000-000000000010",
  createdAt: now,
  updatedAt: now,
  name: "Reviewer",
  email: "reviewer@example.com",
  status: "active",
  role: "member",
  passwordHash: null,
  cognitoUserId: null,
  mcpToken: null,
  reportPortalUrl: null,
  reportPortalEnabled: false,
  monitoringPortalUrl: null,
  monitoringPortalEnabled: false,
  analyzeEnabled: false,
};

function makeIssue(id: string, name = `Issue ${id}`): PrismaIssue {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    name,
    description: null,
    portal: null,
    service: null,
    ticket: null,
    projectId: "00000000-0000-4000-8000-000000000001",
    createdById: user.id,
    updatedById: user.id,
  };
}

function withUsers(issue: PrismaIssue): PrismaIssueWithUsers {
  return {
    ...issue,
    createdBy: user,
    updatedBy: user,
  };
}

function linkedResult(
  id: string,
  issueIds: string[],
  analysisCategory: string | null,
  analysisFeedbackCategory: string | null = null,
  startTime = now,
  specId = `spec-${id}`,
): LinkedIssueResult {
  return {
    id,
    startTime,
    specId,
    analysisCategory,
    analysisFeedbackCategory,
    errors: [
      {
        assumptions: issueIds.map((issueId) => ({ issueId })),
      },
    ],
  };
}

describe("issueService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIssueModel.count.mockResolvedValue(0);
    mockIssueModel.findMany.mockResolvedValue([]);
    mockIssueModel.findManyWithUsers.mockResolvedValue([]);
    mockIssueModel.findLinkedResults.mockResolvedValue([]);
  });

  it("returns serialized reads with derived summaries using one batched query", async () => {
    const first = makeIssue("00000000-0000-4000-8000-000000000101", "Login");
    const second = makeIssue(
      "00000000-0000-4000-8000-000000000102",
      "Checkout",
    );
    mockIssueModel.findManyWithUsers.mockResolvedValue([
      withUsers(first),
      withUsers(second),
    ]);
    mockIssueModel.count.mockResolvedValue(2);
    mockIssueModel.findLinkedResults.mockResolvedValue([
      linkedResult("result-1", [first.id], "bug"),
      linkedResult("result-2", [first.id, second.id], "infra", "SCRIPT"),
    ]);

    const response = await issueService.getAllIssuesV2({
      projectId: first.projectId,
    });

    expect(mockIssueModel.findLinkedResults).toHaveBeenCalledTimes(1);
    expect(mockIssueModel.findLinkedResults).toHaveBeenCalledWith(
      [first.id, second.id],
      undefined,
      undefined,
    );
    expect(response.issues[0]).toMatchObject({
      name: "Login",
      categorySummary: {
        displayCategory: null,
        isMixed: true,
        distribution: { bug: 1, infra: 0, performance: 0, script: 1, other: 0 },
      },
      createdBy: { id: user.id },
    });
    expect(response.issues[1]?.categorySummary.displayCategory).toBe("script");
    expect(response.issues[0]).not.toHaveProperty("category");
  });

  it("forwards only supported issue list filters", async () => {
    await issueService.getAllIssuesV2({
      projectId: "project-1",
      name: "Login",
      page: 2,
      limit: 5,
    });

    expect(mockIssueModel.findManyWithUsers).toHaveBeenCalledWith(
      "project-1",
      "Login",
      2,
      5,
    );
    expect(mockIssueModel.count).toHaveBeenCalledWith("project-1", "Login");
  });

  it("adds a summary to issue detail reads", async () => {
    const issue = makeIssue("00000000-0000-4000-8000-000000000103");
    mockIssueModel.findByIdWithUsers.mockResolvedValue(withUsers(issue));
    mockIssueModel.findLinkedResults.mockResolvedValue([
      linkedResult("result-1", [issue.id], "environment"),
    ]);

    const response = await issueService.getIssueByIdV2(
      issue.id,
      issue.projectId,
    );

    expect(response.categorySummary.displayCategory).toBe("infra");
  });

  it("uses the same date-filtered distinct result set for stats and summary", async () => {
    const issue = makeIssue("00000000-0000-4000-8000-000000000104");
    const firstTime = new Date("2026-07-01T10:00:00.000Z");
    const secondTime = new Date("2026-07-02T10:00:00.000Z");
    mockIssueModel.findManyWithUsers.mockResolvedValue([withUsers(issue)]);
    mockIssueModel.count.mockResolvedValue(1);
    mockIssueModel.findLinkedResults.mockResolvedValue([
      linkedResult("result-1", [issue.id], "bug", null, firstTime, "spec-1"),
      linkedResult(
        "result-2",
        [issue.id],
        null,
        null,
        secondTime,
        "spec-1",
      ),
    ]);

    const response = await issueService.getAllIssuesWithStatsV2({
      projectId: issue.projectId,
      statFrom: "2026-07-01T00:00:00.000Z",
      statTo: "2026-07-02T00:00:00.000Z",
    });

    expect(mockIssueModel.findLinkedResults).toHaveBeenCalledWith(
      [issue.id],
      "2026-07-01T00:00:00.000Z",
      "2026-07-02T00:00:00.000Z",
    );
    expect(response.issues[0]).toMatchObject({
      categorySummary: {
        distribution: { bug: 1, infra: 0, performance: 0, script: 0, other: 0 },
        uncategorizedCount: 1,
      },
      statistics: {
        occurrenceCount: 2,
        impactedTestsCount: 1,
        firstOccurrence: firstTime,
        lastOccurrence: secondTime,
      },
    });
  });

  it("keeps mutation responses on the issue core shape", async () => {
    const issue = makeIssue("00000000-0000-4000-8000-000000000105");
    mockIssueModel.create.mockResolvedValue(issue);
    mockIssueModel.update.mockResolvedValue({
      ...issue,
      name: "Updated",
    });

    const created = await issueService.createIssue({
      name: issue.name,
      projectId: issue.projectId,
    });
    const updated = await issueService.updateIssue(issue.id, {
      name: "Updated",
    });

    expect(created).not.toHaveProperty("category");
    expect(created).not.toHaveProperty("categorySummary");
    expect(updated).not.toHaveProperty("category");
    expect(updated).not.toHaveProperty("categorySummary");
  });
});
