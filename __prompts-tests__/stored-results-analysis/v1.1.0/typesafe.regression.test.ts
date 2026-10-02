// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "../typesafeTestEnv";
import fs from "node:fs";
import path from "node:path";

import { writeEvaluationReport } from "../runners/evaluation-report";
import { runTypeSafeEval } from "../runners/typesafe-stored-results-analysis";
import type { TestCase } from "./templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/regression.json",
);

describe("TypeSafe Evaluation - Regression Tests (jev-1.13.0)", () => {
  jest.setTimeout(300_000);

  it("classifies the regression dataset", async () => {
    const cases = JSON.parse(
      fs.readFileSync(datasetPath, "utf8"),
    ) as TestCase[];
    const result = await runTypeSafeEval({ cases });
    const correctCount = result.predictions.length - result.failures.length;
    const reportPaths = writeEvaluationReport({
      provider: "typesafe",
      model: result.predictions[0]?.model ?? "jev-1.13.0",
      suite: "regression",
      requestCount: result.predictions.length,
      durationMs: result.durationMs,
      caseCount: result.predictions.length,
      correctCount,
      accuracy: result.accuracy,
      usage: result.usage,
      cases: result.predictions.map((prediction) => ({
        id: prediction.id,
        name: prediction.name,
        expected: prediction.expected,
        actual: prediction.actual,
        correct: prediction.actual === prediction.expected,
        confidence: prediction.confidence,
        details: {
          probabilities: prediction.probabilities,
          inputTokens: prediction.inputTokens,
          outputTokens: prediction.outputTokens,
        },
      })),
    });

    console.log(
      `TypeSafe regression: ${(result.accuracy * 100).toFixed(1)}% accuracy, ${result.usage.inputTokens} input tokens, ${result.durationMs}ms`,
    );
    console.log(`TypeSafe report: ${reportPaths.latestPath}`);
    if (result.failures.length > 0) {
      console.log(
        JSON.stringify(
          result.predictions.filter(
            (prediction) => prediction.actual !== prediction.expected,
          ),
          null,
          2,
        ),
      );
    }

    expect(result.accuracy).toBeGreaterThanOrEqual(0.9);
  });
});
