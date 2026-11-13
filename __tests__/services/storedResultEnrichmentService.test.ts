// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";
import type {
  AnalysisLastError,
  AnalysisMetadata,
} from "@/schemas/analysisMetadataSchemas";
import type { PersistAnalysisFailureInput } from "@/models/resultModel";
import type { DetailedStoredResultAnalysis } from "@/services/testAnalysisService";

const mockAnalyze = jest.fn<() => Promise<DetailedStoredResultAnalysis>>();
const mockPersist = jest.fn<() => Promise<void>>();
const mockRecordFailures =
  jest.fn<(input: PersistAnalysisFailureInput) => Promise<void>>();

jest.mock("@/services/testAnalysisService", () => ({
  testAnalysisService: { analyzeStoredResultsDetailed: mockAnalyze },
}));
jest.mock("@/models/resultModel", () => ({
  resultModel: {
    persistAnalysisBatch: mockPersist,
    recordAnalysisFailures: mockRecordFailures,
  },
}));

import { storedResultEnrichmentService } from "@/services/storedResultEnrichmentService";

const analyses = new Map<string, TestResultAnalysis>([
  [
    "result-1",
    {
      id: "result-1",
      status: "failed" as const,
      category: "bug" as const,
      confidence: 4,
      conclusion: "synthetic conclusion",
      errorQuality: 3,
      errorQualityConclusion: "synthetic quality",
    },
  ],
]);
const metadata = new Map<string, AnalysisMetadata>([
  [
    "result-1",
    {
      version: 1,
      strategy: "decisions",
      connection: "openai",
      requestedModel: "gpt-6-luna",
      returnedModel: "gpt-6-luna",
      analyzedAt: "2026-11-12T12:00:00.000Z",
      latencyMs: 20,
      attempts: 1,
      rawConfidence: 0.75,
      categoryProbabilities: {
        infra: 0.1,
        performance: 0.1,
        script: 0.1,
        bug: 0.6,
        other: 0.1,
      },
      categoryPolicyVersion: "stored-results-analysis-v1.1.0-category-v1",
      confidenceMappingVersion: "decisions-confidence-v1",
    },
  ],
]);
const detailed = { analyses, metadata };

const inputResult = (id: string, status: string) => ({
  id,
  status,
  duration: 100,
  startTime: new Date("2026-11-12T12:00:00.000Z"),
  retry: 0,
  spec: { key: "SPEC-1", title: "Synthetic test", file: "test.ts" },
  execution: { name: "run", environment: "test" },
  errors: [],
});

describe("storedResultEnrichmentService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs provider work before persistence and returns only after persistence", async () => {
    mockAnalyze.mockImplementationOnce(async () => {
      expect(mockPersist).not.toHaveBeenCalled();
      return detailed;
    });
    mockPersist.mockResolvedValueOnce(undefined);

    const result = await storedResultEnrichmentService.analyzeAndPersist(
      "project-1",
      [],
    );

    expect(mockPersist).toHaveBeenCalledWith({
      projectId: "project-1",
      analyses: Array.from(analyses.values()),
      metadata,
    });
    expect(result).toBe(analyses);
  });

  it("does not write when classification rejects invalid output", async () => {
    mockAnalyze.mockRejectedValueOnce(new Error("invalid response"));

    await expect(
      storedResultEnrichmentService.analyzeAndPersist("project-1", []),
    ).rejects.toThrow("invalid response");
    expect(mockPersist).not.toHaveBeenCalled();
  });

  it("does not return analyses when atomic persistence fails", async () => {
    mockAnalyze.mockResolvedValueOnce(detailed);
    mockPersist.mockRejectedValueOnce(
      new Error("Could not persist the complete analysis batch"),
    );

    await expect(
      storedResultEnrichmentService.analyzeAndPersist("project-1", [
        inputResult("result-1", "failed"),
      ]),
    ).rejects.toThrow("Could not persist the complete analysis batch");
    expect(mockRecordFailures).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project-1",
        failures: expect.any(Map),
      }),
    );
    const failureInput = mockRecordFailures.mock.calls[0]?.[0] as {
      failures: Map<string, { failure: AnalysisLastError }>;
    };
    expect(failureInput.failures.get("result-1")?.failure).toMatchObject({
      kind: "persistence",
      message: "Analysis results could not be saved.",
    });
  });

  it("records allowlisted failure data and preserves the original error", async () => {
    const originalError = new Error("sk-private secret upstream payload");
    mockAnalyze.mockRejectedValueOnce(originalError);
    mockRecordFailures.mockRejectedValueOnce(
      new Error("failure metadata write failed"),
    );

    await expect(
      storedResultEnrichmentService.analyzeAndPersist("project-1", [
        inputResult("failed-1", "failed"),
        inputResult("flaky-1", "flaky"),
        inputResult("passed-1", "passed"),
      ]),
    ).rejects.toBe(originalError);

    const failureInput = mockRecordFailures.mock.calls[0]?.[0] as {
      failures: Map<string, { failure: AnalysisLastError }>;
    };
    expect([...failureInput.failures.keys()]).toEqual(["failed-1", "flaky-1"]);
    expect(JSON.stringify(failureInput)).not.toMatch(
      /sk-private|secret|upstream payload/,
    );
  });
});
