import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

const mockInvoke = jest.fn<(...args: unknown[]) => Promise<unknown>>();

jest.mock("@langchain/openai", () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    withStructuredOutput: jest.fn(() => ({
      invoke: mockInvoke,
    })),
  })),
}));

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

import { assumptionModel } from "@/models/assumptionModel";
import { executionModel } from "@/models/executionModel";
import { issueModel } from "@/models/issueModel";
import { resultErrorModel } from "@/models/resultErrorModel";
import { failureGroupingService } from "@/services/failureGroupingService";
import { assumptionService } from "@/services/assumptionService";

const makeResultError = (
  overrides: Partial<{
    id: string;
    resultId: string;
    message: string;
    callLog: string | null;
    callStack: string;
    analysisCategory: string | null;
    analysisConclusion: string | null;
    status: string;
  }> = {},
) => {
  const hasAnalysisConclusion = Object.prototype.hasOwnProperty.call(
    overrides,
    "analysisConclusion",
  );

  return {
    id: overrides.id ?? "err-1",
    createdAt: new Date("2026-03-11T10:00:00Z"),
    updatedAt: new Date("2026-03-11T10:00:00Z"),
    type: "assertion",
    message: overrides.message ?? "Auth token expired before request finished",
    callLog:
      overrides.callLog ?? JSON.stringify(["auth middleware", "api client"]),
    callStack:
      overrides.callStack ??
      JSON.stringify(["at auth.ts:10:5", "at client.ts:22:1"]),
    testAssertion: null,
    expectedPattern: null,
    receivedString: null,
    location: "spec.ts:10",
    resultId: overrides.resultId ?? "res-1",
    result: {
      id: overrides.resultId ?? "res-1",
      status: overrides.status ?? "failed",
      retry: 0,
      analysisCategory: overrides.analysisCategory ?? "bug",
      analysisConclusion: hasAnalysisConclusion
        ? (overrides.analysisConclusion ?? null)
        : "Auth token expired and downstream requests started returning 401.",
      executionId: "exec-1",
    },
  };
};

describe("failureGroupingService.groupFailures", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(executionModel, "findById").mockResolvedValue({
      id: "exec-1",
      createdAt: new Date("2026-03-11T10:00:00Z"),
      updatedAt: new Date("2026-03-11T10:00:00Z"),
      type: "nightly",
      name: "Nightly",
      environment: "staging",
      version: "1.0.0",
      startedAt: new Date("2026-03-11T10:00:00Z"),
      projectId: "project-1",
    });
  });

  it("returns insufficient_failures when fewer than two matching errors exist", async () => {
    jest
      .spyOn(resultErrorModel, "findManyForExecutionContext")
      .mockResolvedValue([makeResultError()]);

    await expect(
      failureGroupingService.groupFailures("exec-1", "project-1", "bug"),
    ).resolves.toEqual({
      groups: [],
      source: "none",
      reason: "insufficient_failures",
    });

    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("returns analysis_not_complete when any matching error lacks semantic analysis", async () => {
    jest
      .spyOn(resultErrorModel, "findManyForExecutionContext")
      .mockResolvedValue([
        makeResultError({ id: "err-1" }),
        makeResultError({ id: "err-2", analysisConclusion: null }),
      ]);

    await expect(
      failureGroupingService.groupFailures("exec-1", "project-1", "bug"),
    ).resolves.toEqual({
      groups: [],
      source: "none",
      reason: "analysis_not_complete",
    });
  });

  it("returns llm groups when structured output succeeds", async () => {
    jest
      .spyOn(resultErrorModel, "findManyForExecutionContext")
      .mockResolvedValue([
        makeResultError({ id: "err-1" }),
        makeResultError({
          id: "err-2",
          resultId: "res-2",
          analysisConclusion:
            "Auth token validation failed in middleware and requests returned 401.",
        }),
      ]);
    mockInvoke.mockResolvedValue({
      groups: [
        {
          resultErrorIds: ["err-1", "err-2"],
          groupDescription: "Auth token failures affecting multiple tests.",
          confidence: 0.92,
          suggestedIssueQuery: "auth token",
        },
      ],
    });

    await expect(
      failureGroupingService.groupFailures("exec-1", "project-1", "bug"),
    ).resolves.toEqual({
      groups: [
        {
          resultErrorIds: ["err-1", "err-2"],
          groupDescription: "Auth token failures affecting multiple tests.",
          confidence: 0.92,
          suggestedIssueQuery: "auth token",
        },
      ],
      source: "llm",
    });
  });

  it("falls back to algorithmic groups when the LLM call fails", async () => {
    jest
      .spyOn(resultErrorModel, "findManyForExecutionContext")
      .mockResolvedValue([
        makeResultError({ id: "err-1" }),
        makeResultError({
          id: "err-2",
          message: "Auth token expired before request finished",
          analysisConclusion:
            "Auth token expired and downstream requests started returning 401.",
        }),
        makeResultError({
          id: "err-3",
          message: "Checkout page timed out waiting for render",
          callLog: JSON.stringify(["ui render", "checkout page"]),
          callStack: JSON.stringify(["at checkout.ts:90:2", "at wait.ts:5:1"]),
          analysisConclusion:
            "Checkout page render exceeded the timeout and the page never stabilized.",
        }),
      ]);
    mockInvoke.mockRejectedValue(new Error("FAILURE_GROUPING_TIMEOUT"));

    const response = await failureGroupingService.groupFailures(
      "exec-1",
      "project-1",
      "bug",
    );

    expect(response.source).toBe("algorithmic");
    expect(response.groups).toHaveLength(2);
    expect(response.groups[0]?.resultErrorIds).toEqual(["err-1", "err-2"]);
    expect(response.groups[1]?.resultErrorIds).toEqual(["err-3"]);
  });

  it("returns too_many_failures when the execution slice exceeds the cap", async () => {
    jest
      .spyOn(resultErrorModel, "findManyForExecutionContext")
      .mockResolvedValue(
        Array.from({ length: 26 }, (_, index) =>
          makeResultError({
            id: `err-${index + 1}`,
            resultId: `res-${index + 1}`,
          }),
        ),
      );

    await expect(
      failureGroupingService.groupFailures("exec-1", "project-1", "bug"),
    ).resolves.toEqual({
      groups: [],
      source: "none",
      reason: "too_many_failures",
    });
  });
});

describe("failureGroupingService.acceptGroup", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(executionModel, "findById").mockResolvedValue({
      id: "exec-1",
      createdAt: new Date("2026-03-11T10:00:00Z"),
      updatedAt: new Date("2026-03-11T10:00:00Z"),
      type: "nightly",
      name: "Nightly",
      environment: "staging",
      version: "1.0.0",
      startedAt: new Date("2026-03-11T10:00:00Z"),
      projectId: "project-1",
    });
    jest.spyOn(issueModel, "findById").mockResolvedValue({
      id: "issue-1",
      createdAt: new Date("2026-03-11T10:00:00Z"),
      updatedAt: new Date("2026-03-11T10:00:00Z"),
      name: "Known auth issue",
      category: "bug",
      description: null,
      portal: null,
      service: null,
      ticket: null,
      projectId: "project-1",
      createdById: null,
      updatedById: null,
    });
  });

  it("creates confirmed assumptions only for missing issue links", async () => {
    jest
      .spyOn(resultErrorModel, "findManyForExecutionContext")
      .mockResolvedValue([
        makeResultError({ id: "err-1" }),
        makeResultError({ id: "err-2", resultId: "res-2" } as never),
      ]);
    jest
      .spyOn(assumptionModel, "findManyByIssueAndResultErrorIds")
      .mockResolvedValue([
        {
          id: "assumption-existing",
          createdAt: new Date("2026-03-11T10:00:00Z"),
          updatedAt: new Date("2026-03-11T10:00:00Z"),
          issueId: "issue-1",
          resultErrorId: "err-1",
          madeBy: "user",
          isConfirmed: true,
          score: 1,
        },
      ]);
    jest.spyOn(assumptionService, "createAssumption").mockResolvedValue({
      id: "assumption-new",
      createdAt: new Date("2026-03-11T10:00:00Z"),
      updatedAt: new Date("2026-03-11T10:00:00Z"),
      issueId: "issue-1",
      resultErrorId: "err-2",
      madeBy: "user",
      isConfirmed: true,
      score: 1,
    });

    const response = await failureGroupingService.acceptGroup(
      "exec-1",
      "project-1",
      "issue-1",
      ["err-1", "err-2"],
    );

    expect(assumptionService.createAssumption).toHaveBeenCalledTimes(1);
    expect(assumptionService.createAssumption).toHaveBeenCalledWith({
      issueId: "issue-1",
      resultErrorId: "err-2",
      madeBy: "user",
      isConfirmed: true,
      score: 1,
    });
    expect(response).toEqual({
      createdAssumptions: [
        expect.objectContaining({
          id: "assumption-new",
          resultErrorId: "err-2",
        }),
      ],
      skippedResultErrorIds: ["err-1"],
    });
  });

  it("rejects issue IDs that do not belong to the requested project", async () => {
    jest.spyOn(issueModel, "findById").mockResolvedValue(null);

    await expect(
      failureGroupingService.acceptGroup(
        "exec-1",
        "project-1",
        "issue-foreign",
        ["err-1"],
      ),
    ).rejects.toThrow("Issue with ID issue-foreign not found");

    expect(resultErrorModel.findManyForExecutionContext).not.toHaveBeenCalled();
    expect(assumptionService.createAssumption).not.toHaveBeenCalled();
  });
});
