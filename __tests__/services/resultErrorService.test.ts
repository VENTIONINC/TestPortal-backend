// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { resultErrorService } from "@/services/resultErrorService";
import { resultErrorModel } from "@/models/resultErrorModel";
import { testAnalysisService } from "@/services/testAnalysisService";
import { dashboardService } from "@/services/dashboardService";
import { dbClient } from "@/prisma/client";
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock("@/prisma/client", () => ({
  dbClient: {
    result: {
      update: jest.fn(),
    },
  },
}));

describe("resultErrorService.analyzeErrors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when projectId is missing", async () => {
    await expect(
      resultErrorService.analyzeErrors("", ["err-1"]),
    ).rejects.toThrow("Project ID is required");
  });

  it("throws when errorIds is empty", async () => {
    await expect(
      resultErrorService.analyzeErrors("project-1", []),
    ).rejects.toThrow("Error IDs array is required and must not be empty");
  });

  it("throws when errorIds contains empty strings", async () => {
    await expect(
      resultErrorService.analyzeErrors("project-1", [""]),
    ).rejects.toThrow("Error IDs must be non-empty strings");
  });

  it("analyzes deduped results and updates stats", async () => {
    const now = new Date("2025-01-01T10:00:00Z");
    const mockErrorResults = [
      {
        id: "err-1",
        createdAt: now,
        updatedAt: now,
        type: "assertion",
        message: "Error one",
        callStack: "stack-1",
        location: "loc-1",
        resultId: "res-1",
        result: {
          id: "res-1",
          status: "failed",
          duration: 1200,
          startTime: now,
          retry: 0,
          executionId: "exec-1",
          spec: { key: "SPEC-1", title: "Spec title", file: "spec.ts" },
          execution: { name: "Run 1", environment: "staging" },
        },
      },
      {
        id: "err-2",
        createdAt: now,
        updatedAt: now,
        type: "assertion",
        message: "Error two",
        callStack: "stack-2",
        location: "loc-2",
        resultId: "res-1",
        result: {
          id: "res-1",
          status: "failed",
          duration: 1200,
          startTime: now,
          retry: 0,
          executionId: "exec-1",
          spec: { key: "SPEC-1", title: "Spec title", file: "spec.ts" },
          execution: { name: "Run 1", environment: "staging" },
        },
      },
      {
        id: "err-3",
        createdAt: now,
        updatedAt: now,
        type: "assertion",
        message: "Error three",
        callStack: "stack-3",
        location: "loc-3",
        resultId: null,
        result: null,
      },
    ];

    jest
      .spyOn(resultErrorModel, "findManyForAnalysis")
      .mockResolvedValue(mockErrorResults);

    const mockAnalysis = new Map();
    mockAnalysis.set("res-1", {
      status: "failed",
      category: "bug",
      confidence: 4,
      conclusion: "analysis",
      errorQuality: 3,
      errorQualityConclusion: "quality",
    });

    jest
      .spyOn(testAnalysisService, "analyzeStoredResults")
      .mockResolvedValue(mockAnalysis);
    jest
      .spyOn(dashboardService, "updateStats")
      .mockResolvedValue(undefined);

    const result = await resultErrorService.analyzeErrors("project-1", [
      "err-1",
      "err-2",
      "err-3",
      "err-4",
    ]);

    expect(resultErrorModel.findManyForAnalysis).toHaveBeenCalledWith(
      ["err-1", "err-2", "err-3", "err-4"],
      "project-1",
    );

    expect(testAnalysisService.analyzeStoredResults).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "res-1",
        status: "failed",
        execution: { name: "Run 1", environment: "staging" },
        spec: { key: "SPEC-1", title: "Spec title", file: "spec.ts" },
        errors: [
          {
            message: "Error one",
            callStack: "stack-1",
            location: "loc-1",
          },
        ],
      }),
    ]);

    expect(dbClient.result.update).toHaveBeenCalledWith({
      where: { id: "res-1" },
      data: expect.objectContaining({
        analysisStatus: "failed",
        analysisCategory: "bug",
        analysisConfidence: 4,
      }),
    });

    expect(dashboardService.updateStats).toHaveBeenCalledWith(
      "exec-1",
      "project-1",
      dbClient,
    );

    expect(result).toEqual({
      analyzedResults: 1,
      updatedResultIds: ["res-1"],
      skippedErrorIds: expect.arrayContaining(["err-3", "err-4"]),
      totalErrors: 4,
    });
  });

  it("propagates analysis errors", async () => {
    const now = new Date("2025-01-01T10:00:00Z");
    jest.spyOn(resultErrorModel, "findManyForAnalysis").mockResolvedValue([
      {
        id: "err-1",
        createdAt: now,
        updatedAt: now,
        type: "assertion",
        message: "Error one",
        callStack: "stack-1",
        location: "loc-1",
        resultId: "res-1",
        result: {
          id: "res-1",
          status: "failed",
          duration: 1200,
          startTime: now,
          retry: 0,
          executionId: "exec-1",
          spec: { key: "SPEC-1", title: "Spec title", file: "spec.ts" },
          execution: { name: "Run 1", environment: "staging" },
        },
      },
    ]);

    jest
      .spyOn(testAnalysisService, "analyzeStoredResults")
      .mockRejectedValue(new Error("Analysis failed"));

    await expect(
      resultErrorService.analyzeErrors("project-1", ["err-1"]),
    ).rejects.toThrow("Analysis failed");
  });
});
