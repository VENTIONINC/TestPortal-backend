// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "../../testEnv";
import fs from "node:fs";
import path from "node:path";

import { writeEvaluationReport } from "../runners/evaluation-report";
import { runEval } from "../runners/stored-results-analysis";
import { PROMPT_VERSIONS } from "../runners/versions";
import type { TestCase } from "../v1.1.0/templates/types";

const datasetPath = path.join(
  process.cwd(),
  "__prompts-tests__/stored-results-analysis/datasets/stored-results-analysis/regression.json",
);
const version = PROMPT_VERSIONS["v1.2.0"];

describe("Prompt Evaluation - Regression Tests (v1.2.0)", () => {
  jest.setTimeout(300_000);

  it("should satisfy contract and expectations", async () => {
    const cases = JSON.parse(
      fs.readFileSync(datasetPath, "utf8"),
    ) as TestCase[];
    const result = await runEval({ cases, version });
    const { failures } = result;
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
      promptVersion: version.version,
      suite: "regression",
      requestCount: result.requestCount,
      durationMs: result.durationMs,
      caseCount: cases.length,
      correctCount,
      accuracy: correctCount / cases.length,
      usage: result.usage,
      cases: reportCases,
    });

    console.log(
      `OpenAI ${version.version} regression: ${cases.length - failures.length}/${cases.length} expectations satisfied`,
    );
    console.log(`OpenAI report: ${reportPaths.latestPath}`);

    if (failures.length > 0) {
      console.error(JSON.stringify(failures, null, 2));
    }

    expect(failures).toEqual([]);
  });
});
