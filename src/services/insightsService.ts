import { ChatOpenAI } from "@langchain/openai";
import getLogger from "@/lib/logger";
import { buildInsightsPrompt } from "@/prompts/insights/v1.0.0";
import { anomalyDetector } from "@/services/anomalyDetector";
import type {
  DashboardIssueMetrics,
  DashboardResponse,
  PdfExportFilters,
  PdfInsightAnomalyFlag,
  PdfKpiBlock,
} from "@/types/dashboard";

const logger = getLogger("insights-service");

const AI_INSIGHTS_TIMEOUT_MS = 8_000;

export const AI_INSIGHTS_FALLBACK_TEXT =
  "AI insights unavailable for this export.";

interface GenerateInsightsParams {
  filters: PdfExportFilters;
  dashboard: DashboardResponse;
  kpis: PdfKpiBlock;
  failureCauses: DashboardIssueMetrics;
}

type PassRateTrend = "improving" | "declining" | "stable" | "volatile";

function getAnomalyFlags(
  history: DashboardResponse["history"],
): PdfInsightAnomalyFlag[] {
  try {
    return anomalyDetector.detect(
      history.map((bucket) => ({
        date: bucket.date,
        total: bucket.metrics.total,
        passed: bucket.metrics.passed,
        failed: bucket.metrics.failed,
        skipped: bucket.metrics.skipped,
      })),
    );
  } catch (error) {
    logger.error("AI anomaly detection failed", error);
    return [];
  }
}

function extractTextContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }

      if (
        part &&
        typeof part === "object" &&
        "text" in part &&
        typeof part.text === "string"
      ) {
        return part.text;
      }

      return "";
    })
    .join(" ")
    .trim();
}

function calculateBucketPassRate(bucket: DashboardResponse["history"][number]): number {
  if (bucket.metrics.total <= 0) {
    return 0;
  }

  return (bucket.metrics.passed / bucket.metrics.total) * 100;
}

function getPassRateTrend(history: DashboardResponse["history"]): PassRateTrend {
  const passRates = history
    .filter((bucket) => bucket.metrics.total > 0)
    .map((bucket) => calculateBucketPassRate(bucket));

  if (passRates.length < 2) {
    return "stable";
  }

  const firstPassRate = passRates[0];
  const lastPassRate = passRates[passRates.length - 1];

  if (firstPassRate === undefined || lastPassRate === undefined) {
    return "stable";
  }

  const minPassRate = Math.min(...passRates);
  const maxPassRate = Math.max(...passRates);
  const netChange = lastPassRate - firstPassRate;
  const range = maxPassRate - minPassRate;

  if (range >= 20) {
    return "volatile";
  }

  if (netChange >= 5) {
    return "improving";
  }

  if (netChange <= -5) {
    return "declining";
  }

  return "stable";
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("AI_INSIGHTS_TIMEOUT"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

export const insightsService = {
  async generateInsights({
    filters,
    dashboard,
    kpis,
    failureCauses,
  }: GenerateInsightsParams): Promise<string> {
    const startedAt = Date.now();
    const anomalyFlags = getAnomalyFlags(dashboard.history);
    const passRateTrend = getPassRateTrend(dashboard.history);

    try {
      const model = new ChatOpenAI({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        maxTokens: 400,
        maxRetries: 1,
      });

      const promptMessages = await buildInsightsPrompt({
        filters,
        kpis,
        failureCauses,
        anomalyFlags,
        passRateTrend,
      });

      const response = await withTimeout(
        model.invoke(promptMessages),
        AI_INSIGHTS_TIMEOUT_MS,
      );

      const insightsText = extractTextContent(response.content);

      if (!insightsText) {
        throw new Error("AI_INSIGHTS_EMPTY_RESPONSE");
      }

      return insightsText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "UNKNOWN";

      logger.error("AI insights generation failed", {
        timestamp: new Date().toISOString(),
        error_type: errorMessage,
        duration_ms: Date.now() - startedAt,
        project: filters.project,
        period: `${filters.periodStart}:${filters.periodEnd}`,
      });

      return AI_INSIGHTS_FALLBACK_TEXT;
    }
  },
};

export { AI_INSIGHTS_TIMEOUT_MS };
