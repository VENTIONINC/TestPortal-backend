// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { TestCase } from "../v1.1.0/templates/types";
import type { OpenRouterProfileId } from "./openrouter-profiles";
import type { OpenRouterEvalResult } from "./openrouter-stored-results-analysis";

export const OPENROUTER_REPORT_SCHEMA_VERSION = 1;
export const OPENROUTER_DATASET_VERSION = "v1.1.0";
export const OPENROUTER_ENDPOINT =
  "https://openrouter.ai/api/alpha/decisions";

export interface OpenRouterReportInput {
  suite: "smoke" | "regression";
  datasetVersion: string;
  datasetFingerprint: string;
  policyVersion: string;
  result: OpenRouterEvalResult;
}

export interface OpenRouterReportCase {
  id: string;
  name: string;
  expectedCategory: string;
  actualCategory: string;
  correct: boolean;
  rawAnswer: OpenRouterEvalResult["predictions"][number]["rawAnswer"];
  confidence: number;
  probabilities: Record<string, number>;
  requestedModel: string;
  returnedModel: string;
  upstreamProvider: string | null;
  upstreamRequestId: string | null;
  durationMs: number;
  attempts: number;
  usage: OpenRouterEvalResult["predictions"][number]["usage"];
}

export interface OpenRouterEvaluationReport {
  schemaVersion: number;
  generatedAt: string;
  gateway: "openrouter";
  endpoint: string;
  apiMode: "alpha.decisions";
  profile: OpenRouterEvalResult["profile"];
  requestedModel: string;
  suite: OpenRouterReportInput["suite"];
  datasetVersion: string;
  datasetFingerprint: string;
  policyVersion: string;
  complete: true;
  totalCases: number;
  correctCases: number;
  accuracy: number;
  durationMs: number;
  requestCount: number;
  attemptCount: number;
  usage: OpenRouterEvalResult["usage"];
  cases: OpenRouterReportCase[];
}

export interface OpenRouterReportPaths {
  timestampedReportPath: string;
  latestReportPath: string;
}

export interface WriteOpenRouterReportOptions {
  outputDirectory?: string;
  now?: Date;
}

export function resolveOpenRouterReportDirectory(
  profile: OpenRouterProfileId,
  suite: OpenRouterReportInput["suite"],
  root = process.cwd(),
): string {
  return path.resolve(
    root,
    "__prompts-tests__",
    "stored-results-analysis",
    "reports",
    "openrouter",
    profile,
    suite,
  );
}

/** Fingerprint the exact ordered dataset content used by a run. */
export function fingerprintOpenRouterDataset(cases: TestCase[]): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(cases)).digest("hex")}`;
}

/** Persist a complete OpenRouter run under its profile and suite directory. */
export async function writeOpenRouterEvaluationReport(
  input: OpenRouterReportInput,
  options: WriteOpenRouterReportOptions = {},
): Promise<OpenRouterReportPaths> {
  if (input.result.predictions.length === 0 || input.result.accuracy === null) {
    throw new Error("OpenRouter report requires a nonempty completed run");
  }

  const generatedAt = options.now ?? new Date();
  const cases: OpenRouterReportCase[] = input.result.predictions.map(
    (prediction) => ({
      id: prediction.id,
      name: prediction.name,
      expectedCategory: prediction.expectedCategory,
      actualCategory: prediction.actualCategory,
      correct: prediction.actualCategory === prediction.expectedCategory,
      rawAnswer: prediction.rawAnswer,
      confidence: prediction.confidence,
      probabilities: prediction.probabilities,
      requestedModel: prediction.requestedModel,
      returnedModel: prediction.returnedModel,
      upstreamProvider: prediction.provider,
      upstreamRequestId: prediction.upstreamRequestId,
      durationMs: prediction.durationMs,
      attempts: prediction.attempts,
      usage: prediction.usage,
    }),
  );
  const correctCases = cases.filter((testCase) => testCase.correct).length;
  const report: OpenRouterEvaluationReport = {
    schemaVersion: OPENROUTER_REPORT_SCHEMA_VERSION,
    generatedAt: generatedAt.toISOString(),
    gateway: "openrouter",
    endpoint: OPENROUTER_ENDPOINT,
    apiMode: "alpha.decisions",
    profile: input.result.profile,
    requestedModel: input.result.requestedModel,
    suite: input.suite,
    datasetVersion: input.datasetVersion,
    datasetFingerprint: input.datasetFingerprint,
    policyVersion: input.policyVersion,
    complete: true,
    totalCases: cases.length,
    correctCases,
    accuracy: correctCases / cases.length,
    durationMs: input.result.durationMs,
    requestCount: input.result.requestCount,
    attemptCount: input.result.attemptCount,
    usage: input.result.usage,
    cases,
  };

  const outputDirectory =
    options.outputDirectory ??
    resolveOpenRouterReportDirectory(report.profile, report.suite);
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
