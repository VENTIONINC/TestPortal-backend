// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type {
  TestScenarioIssuesResponse,
  TestScenarioResultsResponse,
} from "@/types/testScenarioIntegration";

export interface TestScenarioResponse {
  id: string;
  projectId: string;
  createdById: string;
  title: string;
  contentMd: string;
  details: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type TestScenarioRecord = TestScenarioResponse;

export interface TestScenarioCreatorSummary {
  id: string;
  name: string;
  email: string;
}

export interface TestScenarioSummary {
  id: string;
  projectId: string;
  createdById: string;
  title: string;
  details: string | null;
  createdBy: TestScenarioCreatorSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTestScenarioParams {
  projectId: string;
  title: string;
  contentMd: string;
  createdById: string;
  details?: string | undefined;
}

export interface UpdateTestScenarioParams {
  scenarioId: string;
  projectId: string;
  title?: string | undefined;
  contentMd?: string | undefined;
  details?: string | null | undefined;
}

export interface ListTestScenariosParams {
  projectId: string;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface TestScenarioListResponse {
  scenarios: TestScenarioSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TestScenarioSummaryListResponse = TestScenarioListResponse;

export type TestScenarioMcpListParams = ListTestScenariosParams;

export interface TestScenarioMcpGetParams {
  scenarioId: string;
  projectId: string;
  resultPage?: number | undefined;
  resultLimit?: number | undefined;
  issuePage?: number | undefined;
  issueLimit?: number | undefined;
}

export type TestScenarioMcpUpdateParams = UpdateTestScenarioParams;

export interface TestScenarioMcpDeleteParams {
  scenarioId: string;
  projectId: string;
}

export interface TestScenarioMcpDetailResponse {
  scenario: TestScenarioResponse;
  resultEvidence: TestScenarioResultsResponse;
  issueEvidence: TestScenarioIssuesResponse;
}

export interface TestScenarioMcpDeleteResponse {
  scenarioId: string;
  projectId: string;
  deleted: true;
}

export class TestScenarioValidationError extends Error {
  readonly code = "TEST_SCENARIO_VALIDATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "TestScenarioValidationError";
  }
}

export class TestScenarioNotFoundError extends Error {
  readonly code = "TEST_SCENARIO_NOT_FOUND" as const;

  constructor(message: string) {
    super(message);
    this.name = "TestScenarioNotFoundError";
  }
}
