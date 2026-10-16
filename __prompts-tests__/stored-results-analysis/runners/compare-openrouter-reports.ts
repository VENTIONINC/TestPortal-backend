// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const nullableMetric = z.number().finite().nonnegative().nullable();
const categorySchema = z.enum(["infra", "performance", "script", "bug", "other"]);
const comparisonCaseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    expectedCategory: categorySchema,
    actualCategory: categorySchema,
    correct: z.boolean(),
    durationMs: nullableMetric.optional(),
    attempts: z.number().int().positive().optional(),
    requestedModel: z.string().min(1).optional(),
    returnedModel: z.string().min(1).optional(),
    usage: z
      .object({
        inputTokens: nullableMetric,
        outputTokens: nullableMetric,
        totalTokens: nullableMetric,
        cost: nullableMetric,
      })
      .optional(),
  })
  .passthrough();

const comparisonReportSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    generatedAt: z.string().optional(),
    gateway: z.string().optional(),
    endpoint: z.string().optional(),
    apiMode: z.string().optional(),
    profile: z.enum(["jev", "openai", "microsoft"]),
    requestedModel: z.string().min(1),
    suite: z.enum(["smoke", "regression"]),
    datasetVersion: z.string().min(1),
    datasetFingerprint: z.string().min(1),
    policyVersion: z.string().min(1),
    complete: z.literal(true),
    totalCases: z.number().int().positive(),
    correctCases: z.number().int().nonnegative(),
    accuracy: z.number().finite().min(0).max(1),
    durationMs: z.number().finite().nonnegative(),
    requestCount: z.number().int().nonnegative(),
    attemptCount: z.number().int().nonnegative(),
    usage: z
      .object({
        inputTokens: nullableMetric,
        outputTokens: nullableMetric,
        totalTokens: nullableMetric,
        cost: nullableMetric,
      })
      .passthrough(),
    cases: z.array(comparisonCaseSchema),
  })
  .passthrough();

type ComparisonReport = z.infer<typeof comparisonReportSchema>;
type ComparisonCase = z.infer<typeof comparisonCaseSchema>;
type ProfileId = "jev" | "openai" | "microsoft";
type Usage = ComparisonReport["usage"];

export class OpenRouterReportComparisonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterReportComparisonError";
  }
}

export interface OpenRouterProfileComparison {
  requestedModel: string;
  accuracy: number;
  totalCases: number;
  correctCases: number;
  mismatches: Array<{
    id: string;
    name: string;
    expectedCategory: string;
    actualCategory: string;
  }>;
  durationMs: number;
  requestCount: number;
  attemptCount: number;
  usage: Usage;
  generatedAt?: string;
  returnedModels?: string[];
  meanCaseLatencyMs?: number;
}

export interface OpenRouterReportsComparison {
  datasetVersion: string;
  datasetFingerprint: string;
  policyVersion: string;
  suite: "smoke" | "regression";
  profiles: {
    jev: OpenRouterProfileComparison;
    openai: OpenRouterProfileComparison;
    microsoft?: OpenRouterProfileComparison;
  };
  openaiMinusJev: {
    accuracy: number;
    durationMs: number;
    usage: Usage;
  };
  microsoftMinusJev?: ComparisonDifference;
  microsoftMinusOpenai?: ComparisonDifference;
}

interface ComparisonDifference {
  accuracy: number;
  durationMs: number;
  meanCaseLatencyMs: number | null;
  usage: Usage;
}

function parseReport(value: unknown, profile: ProfileId): ComparisonReport {
  const parsed = comparisonReportSchema.safeParse(value);
  if (!parsed.success) {
    throw new OpenRouterReportComparisonError(
      `The ${profile} report is invalid or incomplete`,
    );
  }
  if (parsed.data.profile !== profile) {
    throw new OpenRouterReportComparisonError(
      `Expected a '${profile}' report, received '${parsed.data.profile}'`,
    );
  }
  if (parsed.data.cases.length !== parsed.data.totalCases) {
    throw new OpenRouterReportComparisonError(
      `The ${profile} report does not contain a complete prediction set`,
    );
  }
  if (
    parsed.data.cases.some(
      (testCase) =>
        testCase.correct !== (testCase.expectedCategory === testCase.actualCategory),
    )
  ) {
    throw new OpenRouterReportComparisonError(
      `The ${profile} report contains inconsistent case correctness values`,
    );
  }
  const correctCases = parsed.data.cases.filter((testCase) => testCase.correct).length;
  const accuracy = correctCases / parsed.data.totalCases;
  if (
    parsed.data.correctCases !== correctCases ||
    parsed.data.accuracy !== accuracy
  ) {
    throw new OpenRouterReportComparisonError(
      `The ${profile} report has aggregate correctness values that do not match its cases`,
    );
  }
  const ids = parsed.data.cases.map((testCase) => testCase.id);
  if (new Set(ids).size !== ids.length) {
    throw new OpenRouterReportComparisonError(
      `The ${profile} report contains duplicate case identities`,
    );
  }
  return parsed.data;
}

function caseIdentity(testCase: ComparisonCase): string {
  return JSON.stringify([
    testCase.id,
    testCase.name,
    testCase.expectedCategory,
  ]);
}

function toProfileComparison(report: ComparisonReport): OpenRouterProfileComparison {
  return {
    requestedModel: report.requestedModel,
    accuracy: report.accuracy,
    totalCases: report.totalCases,
    correctCases: report.correctCases,
    mismatches: report.cases
      .filter((testCase) => !testCase.correct)
      .map((testCase) => ({
        id: testCase.id,
        name: testCase.name,
        expectedCategory: testCase.expectedCategory,
        actualCategory: testCase.actualCategory,
      })),
    durationMs: report.durationMs,
    requestCount: report.requestCount,
    attemptCount: report.attemptCount,
    usage: report.usage,
  };
}

function metricDifference(first: number | null, second: number | null): number | null {
  return first === null || second === null ? null : first - second;
}

function usageDifference(first: Usage, second: Usage): Usage {
  return {
    inputTokens: metricDifference(first.inputTokens, second.inputTokens),
    outputTokens: metricDifference(first.outputTokens, second.outputTokens),
    totalTokens: metricDifference(first.totalTokens, second.totalTokens),
    cost: metricDifference(first.cost, second.cost),
  };
}

function validateThreeModelProvenance(
  report: ComparisonReport,
  profile: ProfileId,
): void {
  const expectedModels: Record<ProfileId, string> = {
    jev: "typesafe/jev-1.13",
    openai: "openai/gpt-6-luna-decisions",
    microsoft: "microsoft/microsoft-decision-1",
  };
  if (
    report.schemaVersion !== 1 ||
    report.gateway !== "openrouter" ||
    report.endpoint !== "https://openrouter.ai/api/alpha/decisions" ||
    report.apiMode !== "alpha.decisions" ||
    report.requestedModel !== expectedModels[profile] ||
    !report.generatedAt ||
    !Number.isFinite(Date.parse(report.generatedAt))
  ) {
    throw new OpenRouterReportComparisonError(
      `The ${profile} report has unsupported schema or OpenRouter provenance`,
    );
  }
  if (new Set(report.cases.map((testCase) => testCase.name)).size !== report.totalCases) {
    throw new OpenRouterReportComparisonError(
      `The ${profile} report contains duplicate case labels`,
    );
  }
  if (
    report.requestCount !== report.totalCases ||
    report.attemptCount < report.requestCount ||
    report.cases.some(
      (testCase) =>
        testCase.durationMs === undefined ||
        testCase.attempts === undefined ||
        testCase.requestedModel !== expectedModels[profile] ||
        testCase.returnedModel === undefined,
    )
  ) {
    throw new OpenRouterReportComparisonError(
      `The ${profile} report is missing complete request and latency provenance`,
    );
  }
}

function validateMatchingCases(reports: ComparisonReport[]): void {
  const reference = reports[0];
  if (!reference) return;
  const identities = reference.cases.map(caseIdentity).sort();
  for (const report of reports.slice(1)) {
    for (const key of ["suite", "datasetVersion", "datasetFingerprint", "policyVersion"] as const) {
      if (reference[key] !== report[key]) {
        throw new OpenRouterReportComparisonError(
          `Reports have different ${key} values`,
        );
      }
    }
    const candidate = report.cases.map(caseIdentity).sort();
    if (
      identities.length !== candidate.length ||
      identities.some((identity, index) => identity !== candidate[index])
    ) {
      throw new OpenRouterReportComparisonError(
        "Reports do not contain matching complete case identities",
      );
    }
  }
}

/** Compare a Jev/OpenAI pair or a fully-provenanced Jev/OpenAI/Microsoft triple. */
export function compareOpenRouterReports(
  jevInput: unknown,
  openaiInput: unknown,
  microsoftInput?: unknown,
): OpenRouterReportsComparison {
  const jev = parseReport(jevInput, "jev");
  const openai = parseReport(openaiInput, "openai");
  const reports = microsoftInput === undefined
    ? [jev, openai]
    : [jev, openai, parseReport(microsoftInput, "microsoft")];

  validateMatchingCases(reports);

  const jevSummary = toProfileComparison(jev);
  const openaiSummary = toProfileComparison(openai);
  const result: OpenRouterReportsComparison = {
    datasetVersion: jev.datasetVersion,
    datasetFingerprint: jev.datasetFingerprint,
    policyVersion: jev.policyVersion,
    suite: jev.suite,
    profiles: { jev: jevSummary, openai: openaiSummary },
    openaiMinusJev: {
      accuracy: openai.accuracy - jev.accuracy,
      durationMs: openai.durationMs - jev.durationMs,
      usage: usageDifference(openai.usage, jev.usage),
    },
  };
  if (microsoftInput === undefined) return result;

  const microsoft = reports[2];
  if (!microsoft) {
    throw new OpenRouterReportComparisonError("Microsoft report is missing");
  }
  for (const [profile, report] of [["jev", jev], ["openai", openai], ["microsoft", microsoft]] as const) {
    validateThreeModelProvenance(report, profile);
  }

  const microsoftSummary = toProfileComparison(microsoft);
  microsoftSummary.generatedAt = microsoft.generatedAt as string;
  microsoftSummary.returnedModels = [...new Set(microsoft.cases.map((testCase) => testCase.returnedModel as string))];
  microsoftSummary.meanCaseLatencyMs = microsoft.cases.reduce(
    (sum, testCase) => sum + (testCase.durationMs ?? 0),
    0,
  ) / microsoft.totalCases;
  result.profiles.microsoft = microsoftSummary;

  const tripleDifference = (other: ComparisonReport): ComparisonDifference => ({
    accuracy: microsoft.accuracy - other.accuracy,
    durationMs: microsoft.durationMs - other.durationMs,
    meanCaseLatencyMs: metricDifference(
      microsoft.cases.reduce((sum, testCase) => sum + (testCase.durationMs ?? 0), 0) /
        microsoft.totalCases,
      other.cases.reduce((sum, testCase) => sum + (testCase.durationMs ?? 0), 0) /
        other.totalCases,
    ),
    usage: usageDifference(microsoft.usage, other.usage),
  });
  result.microsoftMinusJev = tripleDifference(jev);
  result.microsoftMinusOpenai = tripleDifference(openai);
  for (const report of [jev, openai]) {
    const summary = result.profiles[report.profile];
    if (!summary) {
      throw new OpenRouterReportComparisonError(
        `The ${report.profile} summary is missing`,
      );
    }
    summary.generatedAt = report.generatedAt as string;
    summary.returnedModels = [...new Set(report.cases.map((testCase) => testCase.returnedModel as string))];
    summary.meanCaseLatencyMs = report.cases.reduce(
      (sum, testCase) => sum + (testCase.durationMs ?? 0),
      0,
    ) / report.totalCases;
  }
  return result;
}

export async function compareOpenRouterReportFiles(
  jevReportPath: string,
  openaiReportPath: string,
  microsoftReportPath?: string,
): Promise<OpenRouterReportsComparison> {
  const paths = [jevReportPath, openaiReportPath, ...(microsoftReportPath ? [microsoftReportPath] : [])];
  let contents: string[];
  try {
    contents = await Promise.all(paths.map((reportPath) => readFile(reportPath, "utf8")));
  } catch {
    throw new OpenRouterReportComparisonError("A report file could not be read");
  }
  let inputs: unknown[];
  try {
    inputs = contents.map((content) => JSON.parse(content) as unknown);
  } catch {
    throw new OpenRouterReportComparisonError("A report file contains invalid JSON");
  }
  return compareOpenRouterReports(inputs[0], inputs[1], inputs[2]);
}

async function runCli(): Promise<void> {
  const paths = process.argv.slice(2);
  if (paths.length !== 2 && paths.length !== 3) {
    throw new Error(
      "Usage: npx tsx __prompts-tests__/stored-results-analysis/runners/compare-openrouter-reports.ts <jev-report.json> <openai-report.json> [microsoft-report.json]",
    );
  }
  const jevPath = paths[0];
  const openaiPath = paths[1];
  if (!jevPath || !openaiPath) {
    throw new Error("Two or three report paths are required");
  }
  const result = await compareOpenRouterReportFiles(jevPath, openaiPath, paths[2]);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (
  process.argv[1] &&
  path.basename(process.argv[1]) === "compare-openrouter-reports.ts"
) {
  runCli().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "OpenRouter report comparison failed"}\n`,
    );
    process.exitCode = 1;
  });
}
