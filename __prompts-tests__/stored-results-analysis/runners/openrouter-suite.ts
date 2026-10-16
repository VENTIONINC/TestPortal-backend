// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../v1.1.0/templates/types";
import {
  OPENROUTER_CATEGORY_POLICY_VERSION,
} from "./openrouter-policy";
import {
  fingerprintOpenRouterDataset,
  OPENROUTER_DATASET_VERSION,
  writeOpenRouterEvaluationReport,
  type OpenRouterReportPaths,
  type WriteOpenRouterReportOptions,
} from "./openrouter-report";
import {
  runOpenRouterStoredResultsAnalysis,
  type OpenRouterEvalResult,
  type RunOpenRouterEvalOptions,
} from "./openrouter-stored-results-analysis";

export type OpenRouterSuiteName = "smoke" | "regression";

export interface RunOpenRouterSuiteOptions
  extends Omit<RunOpenRouterEvalOptions, "cases"> {
  suite: OpenRouterSuiteName;
  cases: TestCase[];
  datasetVersion?: string;
  outputDirectory?: string;
  analysisRunner?: typeof runOpenRouterStoredResultsAnalysis;
  reportWriter?: typeof writeOpenRouterEvaluationReport;
}

export interface OpenRouterSuiteOutcome {
  result: OpenRouterEvalResult;
  reportPaths: OpenRouterReportPaths;
}

/** Write a complete-run report before applying the suite's accuracy threshold. */
export async function runOpenRouterSuite(
  options: RunOpenRouterSuiteOptions,
): Promise<OpenRouterSuiteOutcome> {
  if (options.cases.length === 0) {
    throw new Error(`OpenRouter ${options.suite} dataset must not be empty`);
  }

  const analysisRunner =
    options.analysisRunner ?? runOpenRouterStoredResultsAnalysis;
  const reportWriter = options.reportWriter ?? writeOpenRouterEvaluationReport;
  const result = await analysisRunner({
    cases: options.cases,
    profile: options.profile,
    ...(options.concurrency === undefined
      ? {}
      : { concurrency: options.concurrency }),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
    ...(options.apiKey === undefined ? {} : { apiKey: options.apiKey }),
    ...(options.fetchImpl === undefined ? {} : { fetchImpl: options.fetchImpl }),
    ...(options.submitRequest === undefined
      ? {}
      : { submitRequest: options.submitRequest }),
  });

  if (result.predictions.length !== options.cases.length || result.accuracy === null) {
    throw new Error("OpenRouter suite did not produce a complete prediction set");
  }

  const reportPaths = await reportWriter(
    {
      suite: options.suite,
      datasetVersion: options.datasetVersion ?? OPENROUTER_DATASET_VERSION,
      datasetFingerprint: fingerprintOpenRouterDataset(options.cases),
      policyVersion: OPENROUTER_CATEGORY_POLICY_VERSION,
      result,
    },
    options.outputDirectory
      ? ({ outputDirectory: options.outputDirectory } satisfies WriteOpenRouterReportOptions)
      : {},
  );

  if (options.suite === "smoke" && result.accuracy < 1) {
    throw new Error(
      `OpenRouter smoke evaluation expected all categories to match; accuracy was ${result.accuracy}. Report: ${reportPaths.latestReportPath}`,
    );
  }
  if (options.suite === "regression" && result.accuracy < 0.9) {
    throw new Error(
      `OpenRouter regression evaluation requires at least 90% category accuracy; got ${(result.accuracy * 100).toFixed(1)}%. Report: ${reportPaths.latestReportPath}`,
    );
  }

  return { result, reportPaths };
}
