// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { resultModel } from "@/models/resultModel";
import { resultService } from "@/services/resultService";

jest.mock("@/models/resultModel");

jest.mock("@/prisma/client", () => ({
  dbClient: {},
}));

const mockResultModel = resultModel as jest.Mocked<typeof resultModel>;

describe("resultService JSON payload normalization", () => {
  const now = new Date("2025-01-01T10:00:00Z");

  const buildRawResult = () => ({
    id: "result-1",
    createdAt: now,
    updatedAt: now,
    reportPortalLink: null,
    retry: 0,
    status: "failed",
    duration: 1200,
    startTime: now,
    specId: "spec-1",
    executionId: "exec-1",
    analysisStatus: null,
    analysisCategory: null,
    analysisConfidence: null,
    analysisConclusion: null,
    analysisErrorQuality: null,
    analysisErrorQualityConclusion: null,
    analysisReviewedAt: null,
    analysisReviewedById: null,
    analysisFeedbackCategory: null,
    analysisFeedbackConfidence: null,
    analysisFeedbackConclusion: null,
    spec: {
      id: "spec-1",
      createdAt: now,
      updatedAt: now,
      key: "SPEC-1",
      file: "spec.ts",
      title: "Spec title",
      tags: ["smoke", "ui"],
      annotations: ["owner:qa"],
      projectId: "project-1",
    },
    execution: {
      id: "exec-1",
      createdAt: now,
      updatedAt: now,
      type: "e2e",
      name: "Nightly",
      environment: "staging",
      version: "1.0.0",
      startedAt: now,
      projectId: "project-1",
    },
    errors: [
      {
        id: "err-1",
        createdAt: now,
        updatedAt: now,
        type: "assertion",
        message: "Boom",
        callLog: ["step 1", "step 2"],
        callStack: ["frame 1", "frame 2"],
        testAssertion: null,
        expectedPattern: null,
        receivedString: null,
        location: "spec.ts:12",
        resultId: "result-1",
        result: null,
        assumptions: [],
      },
      {
        id: "err-2",
        createdAt: now,
        updatedAt: now,
        type: "assertion",
        message: "Malformed",
        callLog: "{bad json",
        callStack: { bad: true },
        testAssertion: null,
        expectedPattern: null,
        receivedString: null,
        location: "spec.ts:22",
        resultId: "result-1",
        result: null,
        assumptions: [],
      },
    ],
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockResultModel.findSpecTags.mockResolvedValue([]);
  });

  it("normalizes getResults payloads into array-shaped fields", async () => {
    mockResultModel.findMany
      .mockResolvedValueOnce([buildRawResult()])
      .mockResolvedValueOnce([buildRawResult()]);
    mockResultModel.count.mockResolvedValueOnce(1);

    const response = await resultService.getResults({
      projectId: "project-1",
    });

    expect(response.results[0]).toMatchObject({
      spec: {
        tags: ["smoke", "ui"],
        annotations: ["owner:qa"],
      },
      errors: [
        {
          callLog: ["step 1", "step 2"],
          callStack: ["frame 1", "frame 2"],
        },
        {
          callLog: [],
          callStack: [],
        },
      ],
    });
    expect(response.rawResults[0]).toMatchObject({
      spec: {
        tags: ["smoke", "ui"],
        annotations: ["owner:qa"],
      },
    });
    expect(response.rawTotal).toBe(1);
  });

  it("limits raw results to unique specs from the filtered page", async () => {
    const secondFilteredResult = buildRawResult();
    secondFilteredResult.id = "result-2";
    secondFilteredResult.specId = "spec-1";
    mockResultModel.findMany
      .mockResolvedValueOnce([buildRawResult(), secondFilteredResult])
      .mockResolvedValueOnce([buildRawResult()]);
    mockResultModel.count.mockResolvedValue(0);

    await resultService.getResults({
      projectId: "project-1",
      from: "2026-07-01",
      to: "2026-07-07",
      dates: ["2026-07-02", "2026-07-04"],
      status: "failed",
      tag: "smoke",
      page: 2,
      limit: 25,
    });

    expect(mockResultModel.findMany).toHaveBeenNthCalledWith(
      1,
      {
        projectId: "project-1",
        from: "2026-07-01",
        to: "2026-07-07",
        dates: ["2026-07-02", "2026-07-04"],
        status: "failed",
        tag: "smoke",
      },
      2,
      25,
    );
    expect(mockResultModel.findMany).toHaveBeenNthCalledWith(2, {
      projectId: "project-1",
      from: "2026-07-01",
      to: "2026-07-07",
      specRecordIds: ["spec-1"],
    });
    expect(mockResultModel.count).toHaveBeenCalledWith({
      projectId: "project-1",
      from: "2026-07-01",
      to: "2026-07-07",
      dates: ["2026-07-02", "2026-07-04"],
      status: "failed",
      tag: "smoke",
    });
    expect(mockResultModel.count).toHaveBeenCalledTimes(1);
  });

  it("skips the raw query when no cards match the filters", async () => {
    mockResultModel.findMany.mockResolvedValue([]);
    mockResultModel.count.mockResolvedValue(0);

    const response = await resultService.getResults({
      projectId: "project-1",
      from: "2026-07-01",
      to: "2026-07-07",
      dates: ["2026-07-02"],
      status: "failed",
    });

    expect(mockResultModel.findMany).toHaveBeenCalledTimes(1);
    expect(mockResultModel.count).toHaveBeenCalledTimes(1);
    expect(response.rawResults).toEqual([]);
    expect(response.rawTotal).toBe(0);
  });

  it("returns normalized available tags from filters that exclude tag", async () => {
    mockResultModel.findMany.mockResolvedValue([]);
    mockResultModel.count.mockResolvedValue(0);
    mockResultModel.findSpecTags.mockResolvedValue([
      ["L2", "L1"],
      '["L3","L1"]',
      ["L4", 7],
      { invalid: true },
    ]);

    const response = await resultService.getResults({
      projectId: "project-1",
      from: "2026-07-01",
      to: "2026-07-07",
      dates: ["2026-07-02"],
      status: "failed",
      reviewStatus: "completed",
      errorMessage: "timeout",
      issueName: "Checkout",
      specFile: "checkout.spec.ts",
      environment: "staging",
      type: "e2e",
      tag: "L1,L2",
    });

    expect(response).toMatchObject({
      results: [],
      rawResults: [],
      availableTags: ["L1", "L2", "L3", "L4"],
      total: 0,
      rawTotal: 0,
    });
    expect(mockResultModel.findSpecTags).toHaveBeenCalledWith({
      projectId: "project-1",
      from: "2026-07-01",
      to: "2026-07-07",
      dates: ["2026-07-02"],
      status: "failed",
      reviewStatus: "completed",
      errorMessage: "timeout",
      issueName: "Checkout",
      specFile: "checkout.spec.ts",
      environment: "staging",
      type: "e2e",
    });
  });

  it("normalizes getResultById payloads into array-shaped fields", async () => {
    mockResultModel.findById.mockResolvedValue(buildRawResult());

    const result = await resultService.getResultById("result-1", "project-1");

    expect(result.spec.tags).toEqual(["smoke", "ui"]);
    expect(result.errors[0]?.callStack).toEqual(["frame 1", "frame 2"]);
    expect(result.errors[1]?.callLog).toEqual([]);
  });
});
