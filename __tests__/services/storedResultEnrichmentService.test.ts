// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { TestResultAnalysis } from "@/schemas/testAnalysisSchemas";

const mockAnalyze = jest.fn<
  () => Promise<Map<string, TestResultAnalysis>>
>();
const mockPersist = jest.fn<() => Promise<void>>();

jest.mock("@/services/testAnalysisService", () => ({
  testAnalysisService: { analyzeStoredResults: mockAnalyze },
}));
jest.mock("@/models/resultModel", () => ({
  resultModel: { persistAnalysisBatch: mockPersist },
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

describe("storedResultEnrichmentService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("runs provider work before persistence and returns only after persistence", async () => {
    mockAnalyze.mockImplementationOnce(async () => {
      expect(mockPersist).not.toHaveBeenCalled();
      return analyses;
    });
    mockPersist.mockResolvedValueOnce(undefined);

    const result = await storedResultEnrichmentService.analyzeAndPersist(
      "project-1",
      [],
    );

    expect(mockPersist).toHaveBeenCalledWith({
      projectId: "project-1",
      analyses: Array.from(analyses.values()),
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
    mockAnalyze.mockResolvedValueOnce(analyses);
    mockPersist.mockRejectedValueOnce(
      new Error("Could not persist the complete analysis batch"),
    );

    await expect(
      storedResultEnrichmentService.analyzeAndPersist("project-1", []),
    ).rejects.toThrow("Could not persist the complete analysis batch");
  });
});
