// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";

import type { ResolvedAiSettings } from "@/config/serverAiConfig";
import type { EvalMetadata } from "./types";
import { writePromptEvaluationReport } from "../../helpers/evaluation";
import type { EvaluationTokenUsage } from "../../helpers/evaluation";
import type { Category } from "../v1.1.0/templates/types";

export type { EvaluationTokenUsage } from "../../helpers/evaluation";

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
  settings?: ResolvedAiSettings;
  metadata?: EvalMetadata;
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
  const reportDir = path.join(
    process.cwd(),
    "__prompts-tests__/stored-results-analysis/reports",
    report.provider,
    report.suite,
  );
  return writePromptEvaluationReport(reportDir, report);
}
