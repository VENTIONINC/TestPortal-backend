// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Category } from "../v1.1.0/templates/types";

export interface EvaluationUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface EvaluationCaseReport {
  id: string;
  name: string;
  expectedCategory: Category;
  actualCategory: Category;
  correct: boolean;
  confidence: number;
  probabilities: Record<Category, number>;
  inputTokens: number;
  outputTokens: number;
}

export interface EvaluationReportInput {
  provider: string;
  model: string;
  suite: string;
  durationMs: number;
  requestCount: number;
  usage: EvaluationUsage;
  cases: EvaluationCaseReport[];
}

export interface EvaluationReport extends EvaluationReportInput {
  generatedAt: string;
  totalCases: number;
  correctCases: number;
  accuracy: number;
}

export interface WriteEvaluationReportOptions {
  /** Override the default repository report directory, primarily for isolated tests. */
  outputDirectory?: string;
  /** Inject the report timestamp for deterministic tests. */
  now?: Date;
}

export interface EvaluationReportPaths {
  timestampedReportPath: string;
  latestReportPath: string;
}

/**
 * Write a completed evaluation report to a timestamped file and latest.json.
 * The report contains evaluation results only and never reads process.env.
 */
export async function writeEvaluationReport(
  input: EvaluationReportInput,
  options: WriteEvaluationReportOptions = {},
): Promise<EvaluationReportPaths> {
  const generatedAt = options.now ?? new Date();
  const correctCases = input.cases.filter((testCase) => testCase.correct).length;
  const report: EvaluationReport = {
    ...input,
    generatedAt: generatedAt.toISOString(),
    totalCases: input.cases.length,
    correctCases,
    accuracy: input.cases.length === 0 ? 1 : correctCases / input.cases.length,
  };

  const outputDirectory =
    options.outputDirectory ??
    path.resolve(
      process.cwd(),
      "__prompts-tests__",
      "stored-results-analysis",
      "reports",
      input.provider,
      input.suite,
    );
  await mkdir(outputDirectory, { recursive: true });

  const timestamp = generatedAt.toISOString().replace(/[:.]/g, "-");
  const timestampedReportPath = path.join(
    outputDirectory,
    `${timestamp}-${randomUUID()}.json`,
  );
  const latestReportPath = path.join(outputDirectory, "latest.json");
  const contents = `${JSON.stringify(report, null, 2)}\n`;

  await Promise.all([
    writeFile(timestampedReportPath, contents, "utf8"),
    writeFile(latestReportPath, contents, "utf8"),
  ]);

  return { timestampedReportPath, latestReportPath };
}
