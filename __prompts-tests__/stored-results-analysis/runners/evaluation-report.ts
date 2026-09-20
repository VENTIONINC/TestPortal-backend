// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";

import type { Category } from "../v1.1.0/templates/types";

export interface EvaluationTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
}

export interface EvaluationCaseResult {
  id: string;
  name: string;
  expected: Category;
  actual: Category;
  correct: boolean;
  confidence: number;
  details?: unknown;
}

export interface EvaluationReport {
  schemaVersion: 1;
  createdAt: string;
  provider: "openai" | "typesafe";
  model: string;
  promptVersion?: string;
  suite: "smoke" | "regression";
  requestCount: number;
  durationMs: number;
  caseCount: number;
  correctCount: number;
  accuracy: number;
  usage: EvaluationTokenUsage | null;
  cases: EvaluationCaseResult[];
}

export function writeEvaluationReport(
  report: Omit<EvaluationReport, "schemaVersion" | "createdAt">,
): { archivedPath: string; latestPath: string } {
  const createdAt = new Date().toISOString();
  const output: EvaluationReport = {
    schemaVersion: 1,
    createdAt,
    ...report,
  };
  const reportDir = path.join(
    process.cwd(),
    "__prompts-tests__/stored-results-analysis/reports",
    report.provider,
    report.suite,
  );
  fs.mkdirSync(reportDir, { recursive: true });

  const timestamp = createdAt.replace(/[:.]/g, "-");
  const archivedPath = path.join(reportDir, `${timestamp}.json`);
  const latestPath = path.join(reportDir, "latest.json");
  const serialized = `${JSON.stringify(output, null, 2)}\n`;

  fs.writeFileSync(archivedPath, serialized, "utf8");
  fs.writeFileSync(latestPath, serialized, "utf8");

  return { archivedPath, latestPath };
}
