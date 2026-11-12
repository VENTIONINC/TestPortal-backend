// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";

import type { AiOperationConfig } from "@/config/aiConfigSchema";
import { writePromptEvaluationReport } from "../../helpers/evaluation";
import type { EvaluationTokenUsage } from "../../helpers/evaluation";
import type { Category } from "../v1.1.0/templates/types";

export type { EvaluationTokenUsage } from "../../helpers/evaluation";

export interface EvaluationCaseResult {
  id: string;
  name: string;
  expected: Category;
  actual: Category | null;
  correct: boolean;
  confidence: number | null;
  details?: unknown;
  failures: string[];
}

export interface EvaluationReport {
  schemaVersion: 1;
  createdAt: string;
  provider: "openai" | "typesafe";
  model: string;
  settings: AiOperationConfig & { maxRetries: number; sdkMaxRetries: 0 };
  mode: "baseline" | "comparison";
  connection: "openai" | "custom";
  returnedModels: string[];
  overrides: Partial<AiOperationConfig>;
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
