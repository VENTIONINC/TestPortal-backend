// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { runTypeSafeStoredResultsAnalysis } from "../../__prompts-tests__/stored-results-analysis/runners/typesafe-stored-results-analysis";
import { runTypeSafeSuite } from "../../__prompts-tests__/stored-results-analysis/runners/typesafe-suite";
import { hasTypeSafeCredentials } from "../../__prompts-tests__/stored-results-analysis/typesafeTestEnv";
import type { TestCase } from "../../__prompts-tests__/stored-results-analysis/v1.1.0/templates/types";
import type {
  TypeSafeEvalResult,
  TypeSafePrediction,
} from "../../__prompts-tests__/stored-results-analysis/runners/typesafe-stored-results-analysis";

jest.mock(
  "../../__prompts-tests__/stored-results-analysis/runners/typesafe-stored-results-analysis",
  () => ({ runTypeSafeStoredResultsAnalysis: jest.fn() }),
);

function makeCases(count: number): TestCase[] {
  return Array.from({ length: count }, (_, index) => ({
    name: `case ${index}`,
    input: {
      id: `id-${index}`,
      specKey: `spec-${index}`,
      specTitle: `title-${index}`,
      status: "failed" as const,
      duration: 100,
      retry: 0,
      executionName: "CI",
    },
    expect: {
      category: "infra" as const,
      status: "failed" as const,
      errorQuality: "required" as const,
    },
  }));
}

function makeResult(totalCases: number, correctCases: number): TypeSafeEvalResult {
  const predictions: TypeSafePrediction[] = Array.from(
    { length: totalCases },
    (_, index) => ({
      id: `id-${index}`,
      name: `case ${index}`,
      expectedCategory: "infra",
      actualCategory: index < correctCases ? "infra" : "bug",
      confidence: 0.8,
      probabilities: {
        infra: 0.8,
        performance: 0.05,
        script: 0.05,
        bug: 0.05,
        other: 0.05,
      },
      model: "jev-1.13.0",
      inputTokens: 10,
      outputTokens: 5,
    }),
  );
  const failures = predictions
    .filter((prediction) => prediction.expectedCategory !== prediction.actualCategory)
    .map((prediction) => ({
      testCaseName: prediction.name,
      expectedCategory: prediction.expectedCategory,
      actualCategory: prediction.actualCategory,
    }));

  return {
    provider: "typesafe",
    model: "jev-1.13.0",
    predictions,
    failures,
    accuracy: totalCases === 0 ? 1 : correctCases / totalCases,
    durationMs: 1250,
    requestCount: totalCases,
    usage: {
      inputTokens: totalCases * 10,
      outputTokens: totalCases * 5,
      totalTokens: totalCases * 15,
    },
  };
}

describe("runTypeSafeSuite", () => {
  let outputDirectory: string;

  beforeEach(async () => {
    outputDirectory = await mkdtemp(
      path.join(os.tmpdir(), "typesafe-suite-report-"),
    );
    jest.mocked(runTypeSafeStoredResultsAnalysis).mockReset();
  });

  afterEach(async () => {
    await rm(outputDirectory, { recursive: true, force: true });
  });

  test("accepts an all-correct smoke result and writes its report", async () => {
    jest
      .mocked(runTypeSafeStoredResultsAnalysis)
      .mockResolvedValue(makeResult(4, 4));

    const outcome = await runTypeSafeSuite({
      suite: "smoke",
      cases: makeCases(4),
      outputDirectory,
    });
    const report = JSON.parse(
      await readFile(outcome.reportPaths.latestReportPath, "utf8"),
    );

    expect(report).toMatchObject({
      suite: "smoke",
      totalCases: 4,
      correctCases: 4,
      accuracy: 1,
    });
    expect(outcome.result.failures).toEqual([]);
  });

  test("accepts regression at the 90% boundary", async () => {
    jest
      .mocked(runTypeSafeStoredResultsAnalysis)
      .mockResolvedValue(makeResult(10, 9));

    const outcome = await runTypeSafeSuite({
      suite: "regression",
      cases: makeCases(10),
      outputDirectory,
    });

    expect(outcome.result.accuracy).toBe(0.9);
    expect(outcome.result.failures).toHaveLength(1);
  });

  test("keeps a below-threshold regression report before rejecting acceptance", async () => {
    jest
      .mocked(runTypeSafeStoredResultsAnalysis)
      .mockResolvedValue(makeResult(10, 8));

    await expect(
      runTypeSafeSuite({
        suite: "regression",
        cases: makeCases(10),
        outputDirectory,
      }),
    ).rejects.toThrow("requires at least 90% category accuracy");

    const report = JSON.parse(
      await readFile(path.join(outputDirectory, "latest.json"), "utf8"),
    );
    expect(report).toMatchObject({
      totalCases: 10,
      correctCases: 8,
      accuracy: 0.8,
    });
  });

  test("rejects an empty dataset before calling the provider", async () => {
    await expect(
      runTypeSafeSuite({ suite: "smoke", cases: [], outputDirectory }),
    ).rejects.toThrow("dataset must not be empty");
    expect(runTypeSafeStoredResultsAnalysis).not.toHaveBeenCalled();
  });

  test.each([undefined, "", " \t "])(
    "does not enable live suites for a missing or blank key (%s)",
    (apiKey) => {
      const originalApiKey = process.env.TYPESAFE_API_KEY;
      delete process.env.TYPESAFE_API_KEY;
      try {
        expect(hasTypeSafeCredentials(apiKey)).toBe(false);
      } finally {
        if (originalApiKey === undefined) {
          delete process.env.TYPESAFE_API_KEY;
        } else {
          process.env.TYPESAFE_API_KEY = originalApiKey;
        }
      }
    },
  );

  test("enables live suites for a nonblank TypeSafe key without checking OpenAI", () => {
    expect(hasTypeSafeCredentials("typesafe-test-key")).toBe(true);
  });
});
