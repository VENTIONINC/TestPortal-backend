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
  });

  it("normalizes getResults payloads into array-shaped fields", async () => {
    mockResultModel.findMany.mockResolvedValue([buildRawResult()]);
    mockResultModel.count.mockResolvedValue(1);

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
  });

  it("normalizes getResultById payloads into array-shaped fields", async () => {
    mockResultModel.findById.mockResolvedValue(buildRawResult());

    const result = await resultService.getResultById("result-1", "project-1");

    expect(result.spec.tags).toEqual(["smoke", "ui"]);
    expect(result.errors[0]?.callStack).toEqual(["frame 1", "frame 2"]);
    expect(result.errors[1]?.callLog).toEqual([]);
  });
});
