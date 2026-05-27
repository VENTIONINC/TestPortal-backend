// Copyright 2026 Vention
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
  message?: string;
  trace?: string;
  rawStatus?: string;
  type?: string;
  filePath?: string;
  retry?: number;
  flaky?: boolean;
  suite?: string;
  tags?: string[];
  meta?: Record<string, unknown>;
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
  results: CTRFResults;
}