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
}

const SYSTEM_PROMPT = `You are a QA analytics assistant. Analyze the provided test execution data and write a concise plain-language summary in no more than 300 words.

Rules:
- Describe the overall pass rate trend as improving, declining, stable, or volatile.
- Mention each anomaly flag explicitly with its date and direction when anomalies are present.
- If one failure category accounts for more than 50% of failures, call it out by name and percentage.
- Do not speculate beyond the data provided.
- Do not use markdown formatting.`;

const USER_PROMPT_TEMPLATE = `Project: {project} | Environment: {environment} | Execution Type: {executionType}
Period: {periodStart} to {periodEnd} | Granularity: {granularity}

Summary KPIs:
  Total Runs: {totalRuns}
  Failed Runs: {failedRuns}
  Pass Rate: {passRate}%

Anomalies detected:
{anomalyFlags}

Failure root-cause breakdown:
  Bug: {bugCount} ({bugPct}%)
  Environment: {environmentCount} ({environmentPct}%)
  Script: {scriptCount} ({scriptPct}%)
  Performance: {performanceCount} ({performancePct}%)
  Other: {otherCount} ({otherPct}%)`;

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
        `${flag.date}: ${flag.metric} ${flag.direction} (${flag.deviationPct.toFixed(2)}%)`,
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
