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
  })
  .passthrough();

const comparisonReportSchema = z
  .object({
    schemaVersion: z.number().int().positive(),
    profile: z.enum(["jev", "openai"]),
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
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
    cost: number | null;
  };
}

export interface OpenRouterReportsComparison {
  datasetVersion: string;
  datasetFingerprint: string;
  policyVersion: string;
  suite: "smoke" | "regression";
  profiles: {
    jev: OpenRouterProfileComparison;
    openai: OpenRouterProfileComparison;
  };
  openaiMinusJev: {
    accuracy: number;
    durationMs: number;
    usage: {
      inputTokens: number | null;
      outputTokens: number | null;
      totalTokens: number | null;
      cost: number | null;
    };
  };
}

function parseReport(value: unknown, profile: "jev" | "openai"): ComparisonReport {
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

/** Compare only complete Jev/OpenAI reports with identical experiment identity. */
export function compareOpenRouterReports(
  jevInput: unknown,
  openaiInput: unknown,
): OpenRouterReportsComparison {
  const jev = parseReport(jevInput, "jev");
  const openai = parseReport(openaiInput, "openai");

  for (const key of ["suite", "datasetVersion", "datasetFingerprint", "policyVersion"] as const) {
    if (jev[key] !== openai[key]) {
      throw new OpenRouterReportComparisonError(
        `Reports have different ${key} values`,
      );
    }
  }

  const jevIdentities = jev.cases.map(caseIdentity).sort();
  const openaiIdentities = openai.cases.map(caseIdentity).sort();
  if (
    jevIdentities.length !== openaiIdentities.length ||
    jevIdentities.some((identity, index) => identity !== openaiIdentities[index])
  ) {
    throw new OpenRouterReportComparisonError(
      "Reports do not contain matching complete case identities",
    );
  }

  const jevSummary = toProfileComparison(jev);
  const openaiSummary = toProfileComparison(openai);
  return {
    datasetVersion: jev.datasetVersion,
    datasetFingerprint: jev.datasetFingerprint,
    policyVersion: jev.policyVersion,
    suite: jev.suite,
    profiles: { jev: jevSummary, openai: openaiSummary },
    openaiMinusJev: {
      accuracy: openai.accuracy - jev.accuracy,
      durationMs: openai.durationMs - jev.durationMs,
      usage: {
        inputTokens: metricDifference(
          openai.usage.inputTokens,
          jev.usage.inputTokens,
        ),
        outputTokens: metricDifference(
          openai.usage.outputTokens,
          jev.usage.outputTokens,
        ),
        totalTokens: metricDifference(
          openai.usage.totalTokens,
          jev.usage.totalTokens,
        ),
        cost: metricDifference(openai.usage.cost, jev.usage.cost),
      },
    },
  };
}

export async function compareOpenRouterReportFiles(
  jevReportPath: string,
  openaiReportPath: string,
): Promise<OpenRouterReportsComparison> {
  const [jevContents, openaiContents] = await Promise.all([
    readFile(jevReportPath, "utf8"),
    readFile(openaiReportPath, "utf8"),
  ]);
  let jevInput: unknown;
  let openaiInput: unknown;
  try {
    jevInput = JSON.parse(jevContents);
    openaiInput = JSON.parse(openaiContents);
  } catch {
    throw new OpenRouterReportComparisonError("A report file contains invalid JSON");
  }
  return compareOpenRouterReports(jevInput, openaiInput);
}

async function runCli(): Promise<void> {
  const [jevPath, openaiPath] = process.argv.slice(2);
  if (!jevPath || !openaiPath) {
    throw new Error(
      "Usage: npx tsx __prompts-tests__/stored-results-analysis/runners/compare-openrouter-reports.ts <jev-report.json> <openai-report.json>",
    );
  }
  const result = await compareOpenRouterReportFiles(jevPath, openaiPath);
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
