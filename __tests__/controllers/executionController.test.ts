import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

import { executionController } from "@/controllers/executionController";
import { failureGroupingService } from "@/services/failureGroupingService";
import { executeController } from "@/test-utils/httpMocks";

jest.mock("@/services/failureGroupingService", () => ({
  failureGroupingService: {
    groupFailures: jest.fn(),
    acceptGroup: jest.fn(),
  },
}));

describe("executionController.groupFailures", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when category is invalid", async () => {
    const response = await executeController(
      executionController.groupFailures,
      {
        method: "POST",
        params: { executionId: "exec-1" },
        query: { projectId: "project-1" },
        body: { category: "Bug" },
      },
    );

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({
      error: "category must be one of: bug, infra, performance, script, other",
    });
  });

  it("returns 200 with grouped failures", async () => {
    jest.spyOn(failureGroupingService, "groupFailures").mockResolvedValue({
      groups: [
        {
          groupDescription: "Auth token failures affecting multiple tests.",
          confidence: 0.91,
          resultErrorIds: ["err-1", "err-2"],
          suggestedIssueQuery: "auth token",
        },
      ],
      source: "llm",
    });

    const response = await executeController(
      executionController.groupFailures,
      {
        method: "POST",
        params: { executionId: "exec-1" },
        query: { projectId: "project-1" },
        body: { category: "bug" },
      },
    );

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      groups: [
        {
          groupDescription: "Auth token failures affecting multiple tests.",
          confidence: 0.91,
          resultErrorIds: ["err-1", "err-2"],
          suggestedIssueQuery: "auth token",
        },
      ],
      source: "llm",
    });
  });
});

describe("executionController.acceptGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when issueId is missing", async () => {
    const response = await executeController(executionController.acceptGroup, {
      method: "POST",
      params: { executionId: "exec-1" },
      query: { projectId: "project-1" },
      body: { groupResultErrorIds: ["err-1"] },
    });

    expect(response.statusCode).toBe(400);
    expect(response.body).toEqual({ error: "Issue ID is required" });
  });

  it("returns 201 with created assumptions", async () => {
    jest.spyOn(failureGroupingService, "acceptGroup").mockResolvedValue({
      createdAssumptions: [
        {
          id: "assumption-1",
          createdAt: new Date("2026-03-11T10:00:00Z"),
          updatedAt: new Date("2026-03-11T10:00:00Z"),
          issueId: "issue-1",
          resultErrorId: "err-2",
          madeBy: "user",
          isConfirmed: true,
          score: 1,
        },
      ],
      skippedResultErrorIds: ["err-1"],
    });

    const response = await executeController(executionController.acceptGroup, {
      method: "POST",
      params: { executionId: "exec-1" },
      query: { projectId: "project-1" },
      body: {
        issueId: "issue-1",
        groupResultErrorIds: ["err-1", "err-2"],
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.body).toEqual({
      createdAssumptions: [
        expect.objectContaining({ id: "assumption-1", resultErrorId: "err-2" }),
      ],
      skippedResultErrorIds: ["err-1"],
    });
  });
});
