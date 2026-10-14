// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  writeEvaluationReport,
  type EvaluationReportPaths,
} from "./evaluation-report";
import type { TestCase } from "../v1.1.0/templates/types";
import {
  runTypeSafeStoredResultsAnalysis,
  type TypeSafeEvalResult,
} from "./typesafe-stored-results-analysis";

export type TypeSafeSuiteName = "smoke" | "regression";

export interface RunTypeSafeSuiteOptions {
  suite: TypeSafeSuiteName;
  cases: TestCase[];
  outputDirectory?: string;
}

export interface TypeSafeSuiteOutcome {
  result: TypeSafeEvalResult;
  reportPaths: EvaluationReportPaths;
}

/** Evaluate and report first, then enforce the suite's category threshold. */
export async function runTypeSafeSuite(
  options: RunTypeSafeSuiteOptions,
): Promise<TypeSafeSuiteOutcome> {
  if (options.cases.length === 0) {
    throw new Error(`TypeSafe ${options.suite} dataset must not be empty`);
  }

  const result = await runTypeSafeStoredResultsAnalysis({ cases: options.cases });
  const reportPaths = await writeEvaluationReport(
    {
      provider: "typesafe",
      model: result.model,
      suite: options.suite,
      durationMs: result.durationMs,
      requestCount: result.requestCount,
      usage: result.usage,
      cases: result.predictions.map((prediction) => ({
        id: prediction.id,
        name: prediction.name,
        expectedCategory: prediction.expectedCategory,
        actualCategory: prediction.actualCategory,
        correct: prediction.actualCategory === prediction.expectedCategory,
        confidence: prediction.confidence,
        probabilities: prediction.probabilities,
        inputTokens: prediction.inputTokens,
        outputTokens: prediction.outputTokens,
      })),
    },
    options.outputDirectory
      ? { outputDirectory: options.outputDirectory }
      : {},
  );

  if (options.suite === "smoke" && result.failures.length > 0) {
    throw new Error(
      `TypeSafe smoke evaluation expected all categories to match; accuracy was ${result.accuracy}. Report: ${reportPaths.latestReportPath}`,
    );
  }
  if (options.suite === "regression" && result.accuracy < 0.9) {
    throw new Error(
      `TypeSafe regression evaluation requires at least 90% category accuracy; got ${(result.accuracy * 100).toFixed(1)}%. Report: ${reportPaths.latestReportPath}`,
    );
  }

  return { result, reportPaths };
}
