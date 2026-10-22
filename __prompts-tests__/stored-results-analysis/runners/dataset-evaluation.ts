// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";

import type { TestCase } from "../v1.1.0/templates/types";
import { writeEvaluationReport } from "./evaluation-report";
import { runEval, type PromptVersion } from "./stored-results-analysis";

export async function runDatasetEvaluation(
  version: PromptVersion,
  suite: "smoke" | "regression",
) {
  const datasetPath = path.join(
    process.cwd(),
    "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis",
    `${suite}.json`,
  );
  const cases = JSON.parse(fs.readFileSync(datasetPath, "utf8")) as TestCase[];
  const result = await runEval({ cases, version });
  const byId = new Map(
    result.response.results.map((output) => [output.id, output]),
  );
  const reportCases = cases.map((testCase) => {
    const output = byId.get(testCase.input.id);
    if (!output) throw new Error(`Missing output for ${testCase.input.id}`);
    return {
      id: testCase.input.id,
      name: testCase.name,
      expected: testCase.expect.category,
      actual: output.category,
      correct: output.category === testCase.expect.category,
      confidence: output.confidence,
      details: output,
    };
  });
  const correctCount = reportCases.filter(({ correct }) => correct).length;
  const reportPaths = writeEvaluationReport({
    provider: "openai",
    model: result.model,
    settings: result.settings,
    metadata: result.metadata,
    promptVersion: version.version,
    suite,
    requestCount: result.requestCount,
    durationMs: result.durationMs,
    caseCount: cases.length,
    correctCount,
    accuracy: correctCount / cases.length,
    usage: result.usage,
    cases: reportCases,
  });
  console.log(
    `OpenAI ${version.version} ${suite}: ${correctCount}/${cases.length} categories correct; ${result.failures.length} expectation failures`,
  );
  console.log(`OpenAI report: ${reportPaths.archivedPath}`);
  if (result.failures.length > 0)
    console.error(JSON.stringify(result.failures, null, 2));
  return result;
}
