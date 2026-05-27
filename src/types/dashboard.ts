// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

// src/types/dashboard.ts

export type ExecutionType = "Nightly" | "Release" | "OnDemand" | "Other";

export type DashboardGranularity = "daily" | "weekly" | "monthly";

export interface DashboardIssueMetrics {
  bug: number;
  environment: number;
  script: number;
  performance: number;
  other: number;
}

export interface DailyExecutionMetrics {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // Total duration in ms
  issues: DashboardIssueMetrics;
}

export interface ExecutionSummary {
  id: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "running";
  startedAt: string; // ISO date
  duration: number;
  type: string;
  environment: string;
  metrics?: {
    total: number;
    passed: number;
    failed: number;
  };
}

export interface PdfExportFilters {
  project: string;
  environment: string;
  executionType: string;
  periodStart: string;
  periodEnd: string;
  granularity: DashboardGranularity;
  includeAiInsights: boolean;
}

export type PdfInsightMetric = "total_runs" | "pass_rate";

export type PdfInsightDirection = "spike" | "drop";

export interface PdfInsightAnomalyFlag {
  date: string;
  metric: PdfInsightMetric;
  direction: PdfInsightDirection;
  deviationPct: number;
}

export interface PdfKpiBlock {
  totalRuns: number;
  failedRuns: number;
  passRate: number;
}

export interface DashboardResponse {
  summary: {
    totalRuns: number;
    failures: number;
    passRate: number;
    passRateTrend?: number;
  };
  history: Array<{
    date: string;
    metrics: DailyExecutionMetrics; // Sum of all types for that day
  }>;
  recentExecutions: ExecutionSummary[];
}
