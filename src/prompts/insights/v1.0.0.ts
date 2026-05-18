// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import type { BaseMessage } from "@langchain/core/messages";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import type {
  DashboardIssueMetrics,
  PdfExportFilters,
  PdfInsightAnomalyFlag,
  PdfKpiBlock,
} from "@/types/dashboard";

interface BuildInsightsPromptParams {
  filters: PdfExportFilters;
  kpis: PdfKpiBlock;
  failureCauses: DashboardIssueMetrics;
  anomalyFlags: PdfInsightAnomalyFlag[];
  passRateTrend: "improving" | "declining" | "stable" | "volatile";
}

const SYSTEM_PROMPT = `You are a QA analytics assistant. Analyze the provided test execution data and write a concise plain-language summary in no more than 300 words.

Rules:
- Use the provided computed pass rate trend signal exactly as given. Do not infer a different trend.
- Mention each anomaly flag explicitly with its date, metric, direction, and that the percentage is relative to the period average.
- If one failure category accounts for more than 50% of failures, call it out by name and percentage.
- If the dominant category is Other, describe it as uncategorized or other failures rather than implying a concrete root cause.
- Do not speculate beyond the data provided.
- Do not use markdown formatting.`;

const USER_PROMPT_TEMPLATE = `Project: {project} | Environment: {environment} | Execution Type: {executionType}
Period: {periodStart} to {periodEnd} | Granularity: {granularity}

Summary KPIs:
  Total Runs: {totalRuns}
  Failed Runs: {failedRuns}
  Pass Rate: {passRate}%

Computed pass rate trend signal:
  {passRateTrend}

Anomalies detected (percentages are deviations from the period average, not absolute percentages):
{anomalyFlags}

Failure root-cause breakdown:
  Bug: {bugCount} ({bugPct}%)
  Environment: {environmentCount} ({environmentPct}%)
  Script: {scriptCount} ({scriptPct}%)
  Performance: {performanceCount} ({performancePct}%)
  Other / Uncategorized: {otherCount} ({otherPct}%)`;

const insightsPromptTemplate = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  ["human", USER_PROMPT_TEMPLATE],
]);

function formatPercent(value: number, total: number): string {
  if (total <= 0) {
    return "0.00";
  }

  return ((value / total) * 100).toFixed(2);
}

function formatAnomalyFlags(anomalyFlags: PdfInsightAnomalyFlag[]): string {
  if (anomalyFlags.length === 0) {
    return "None";
  }

  return anomalyFlags
    .map(
      (flag) =>
        `${flag.date}: ${flag.metric === "total_runs" ? "total runs" : "pass rate"} ${flag.direction}, ${flag.deviationPct.toFixed(2)}% ${flag.direction === "spike" ? "above" : "below"} the period average`,
    )
    .join("\n");
}

export function buildInsightsPrompt(
  params: BuildInsightsPromptParams,
): Promise<BaseMessage[]> {
  const totalFailures =
    params.failureCauses.bug +
    params.failureCauses.environment +
    params.failureCauses.script +
    params.failureCauses.performance +
    params.failureCauses.other;

  return insightsPromptTemplate.formatMessages({
    project: params.filters.project,
    environment: params.filters.environment,
    executionType: params.filters.executionType,
    periodStart: params.filters.periodStart,
    periodEnd: params.filters.periodEnd,
    granularity: params.filters.granularity,
    totalRuns: String(params.kpis.totalRuns),
    failedRuns: String(params.kpis.failedRuns),
    passRate: params.kpis.passRate.toFixed(2),
    passRateTrend: params.passRateTrend,
    anomalyFlags: formatAnomalyFlags(params.anomalyFlags),
    bugCount: String(params.failureCauses.bug),
    bugPct: formatPercent(params.failureCauses.bug, totalFailures),
    environmentCount: String(params.failureCauses.environment),
    environmentPct: formatPercent(
      params.failureCauses.environment,
      totalFailures,
    ),
    scriptCount: String(params.failureCauses.script),
    scriptPct: formatPercent(params.failureCauses.script, totalFailures),
    performanceCount: String(params.failureCauses.performance),
    performancePct: formatPercent(
      params.failureCauses.performance,
      totalFailures,
    ),
    otherCount: String(params.failureCauses.other),
    otherPct: formatPercent(params.failureCauses.other, totalFailures),
  });
}
