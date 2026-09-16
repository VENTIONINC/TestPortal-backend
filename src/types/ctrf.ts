// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export type TestStatus = "passed" | "failed" | "skipped" | "pending" | "other";

export interface CTRFTool {
  name: string;
  version?: string;
}

export interface CTRFSummary {
  tests: number;
  passed: number;
  failed: number;
  pending: number;
  skipped: number;
  other: number;
  start: number;
  stop: number;
}

export interface CTRFTest {
  name: string;
  status: TestStatus;
  duration: number;
  start?: number;
  stop?: number;
  message?: string;
  trace?: string;
  rawStatus?: string;
  type?: string;
  filePath?: string;
  retry?: number;
  retries?: number;
  retryAttempts?: CTRFRetryAttempt[];
  flaky?: boolean;
  suite?: string | string[];
  tags?: string[];
  snippet?: string;
  line?: number;
  stdout?: string[];
  stderr?: string[];
  extra?: Record<string, unknown>;
  meta?: Record<string, unknown>;
}

export interface CTRFRetryAttempt {
  attempt: number;
  status: TestStatus;
  duration?: number;
  message?: string;
  trace?: string;
  line?: number;
  snippet?: string;
  stdout?: string[];
  stderr?: string[];
  start?: number;
  stop?: number;
  extra?: Record<string, unknown>;
}

export interface CTRFEnvironment {
  appName?: string;
  buildName?: string;
  buildNumber?: string;
  buildUrl?: string;
  repositoryName?: string;
  repositoryUrl?: string;
  branchName?: string;
  testEnvironment?: string;
  executionType?: string;
  extra?: Record<string, unknown>;
}

export interface CTRFResults {
  tool: CTRFTool;
  summary: CTRFSummary;
  tests: CTRFTest[];
  environment?: CTRFEnvironment;
  extra?: Record<string, unknown>;
}

export interface CTRFReport {
  reportFormat?: "CTRF";
  specVersion?: "0.0.0";
  results: CTRFResults;
}
