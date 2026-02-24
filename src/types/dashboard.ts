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
