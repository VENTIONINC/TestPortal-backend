// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { chartRendererService } from "@/services/chartRendererService";
import { dashboardService } from "@/services/dashboardService";
import { insightsService } from "@/services/insightsService";
import { pdfBuilderService } from "@/services/pdfBuilderService";
import { projectModel } from "@/models/projectModel";
import type {
  DashboardIssueMetrics,
  PdfExportFilters,
  PdfKpiBlock,
} from "@/types/dashboard";

export class ReportGenerationError extends Error {
  constructor(
    public readonly code:
      | "NOT_FOUND"
      | "DATA_FETCH_FAILED"
      | "CHART_RENDER_FAILED"
      | "PDF_BUILD_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "ReportGenerationError";
  }
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

async function resolveProject(project: string) {
  if (isUuid(project)) {
    const foundById = await projectModel.findById(project);
    if (foundById) {
      return foundById;
    }
  }

  return projectModel.findByName(project);
}

function getPeriodDays(periodStart: string, periodEnd: string): number {
  const start = new Date(`${periodStart}T00:00:00.000Z`);
  const end = new Date(`${periodEnd}T00:00:00.000Z`);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  return diffDays + 1;
}

function aggregateFailureCauses(
  history: Array<{ metrics: { issues: DashboardIssueMetrics } }>,
): DashboardIssueMetrics {
  const aggregated: DashboardIssueMetrics = {
    bug: 0,
    environment: 0,
    script: 0,
    performance: 0,
    other: 0,
  };

  for (const bucket of history) {
    aggregated.bug += bucket.metrics.issues.bug;
    aggregated.environment += bucket.metrics.issues.environment;
    aggregated.script += bucket.metrics.issues.script;
    aggregated.performance += bucket.metrics.issues.performance;
    aggregated.other += bucket.metrics.issues.other;
  }

  return aggregated;
}

export const reportService = {
  async generatePdf(filters: PdfExportFilters): Promise<PDFKit.PDFDocument> {
    const project = await resolveProject(filters.project);

    if (!project) {
      throw new ReportGenerationError(
        "NOT_FOUND",
        `Project '${filters.project}' not found`,
      );
    }

    const periodDays = getPeriodDays(filters.periodStart, filters.periodEnd);
    const executionTypeFilter =
      filters.executionType.toLowerCase() === "all"
        ? undefined
        : filters.executionType;

    let dashboard;
    try {
      dashboard = await dashboardService.getDashboard(
        project.id,
        filters.environment,
        periodDays,
        executionTypeFilter,
        filters.granularity,
        filters.periodStart,
        filters.periodEnd,
      );
    } catch (error) {
      throw new ReportGenerationError(
        "DATA_FETCH_FAILED",
        error instanceof Error
          ? error.message
          : "Failed to fetch dashboard data",
      );
    }

    const kpis: PdfKpiBlock = {
      totalRuns: dashboard.summary.totalRuns,
      failedRuns: dashboard.summary.failures,
      passRate: dashboard.summary.passRate,
    };

    const failureCauses = aggregateFailureCauses(dashboard.history);

    let regressionRunsChartBuffer: Buffer;
    let issuesCategoriesChartBuffer: Buffer;
    let passRateChartBuffer: Buffer;
    let testRunsDonutBuffer: Buffer;
    let insightsText: string | null;
    try {
      [
        regressionRunsChartBuffer,
        issuesCategoriesChartBuffer,
        passRateChartBuffer,
        testRunsDonutBuffer,
        insightsText,
      ] = await Promise.all([
        chartRendererService.renderRegressionRunsChart(dashboard.history),
        chartRendererService.renderIssuesCategoriesChart(dashboard.history),
        chartRendererService.renderPassRateChart(dashboard.history),
        chartRendererService.renderRunsDonut(
          dashboard.summary.totalRuns,
          dashboard.summary.failures,
        ),
        filters.includeAiInsights
          ? insightsService.generateInsights({
              filters,
              dashboard,
              kpis,
              failureCauses,
            })
          : Promise.resolve(null),
      ]);
    } catch (error) {
      throw new ReportGenerationError(
        "CHART_RENDER_FAILED",
        error instanceof Error ? error.message : "Failed to render trend chart",
      );
    }

    try {
      return pdfBuilderService.buildPdf({
        regressionRunsChartBuffer,
        issuesCategoriesChartBuffer,
        passRateChartBuffer,
        testRunsDonutBuffer,
        kpis,
        failureCauses,
        insightsText,
        filters: {
          ...filters,
          project: project.name,
        },
      });
    } catch (error) {
      throw new ReportGenerationError(
        "PDF_BUILD_FAILED",
        error instanceof Error ? error.message : "Failed to build PDF",
      );
    }
  },
};
