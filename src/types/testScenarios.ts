// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type {
  TestScenarioIssuesResponse,
  TestScenarioResultsResponse,
} from "@/types/testScenarioIntegration";

export interface TestScenarioStepResponse {
  id: string;
  position: number;
  action: string;
  expectedResult: string | null;
}

export interface TestScenarioResponse {
  id: string;
  projectId: string;
  createdById: string;
  title: string;
  details: string | null;
  objective: string | null;
  preconditions: string | null;
  testData: string | null;
  expectedResult: string | null;
  notes: string | null;
  steps: TestScenarioStepResponse[];
  contentMd: string;
  contentMdHash: string;
  contentMdFormatVersion: number;
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

export interface CreateTestScenarioStepInput {
  action: string;
  expectedResult?: string | undefined;
}

export interface CreateTestScenarioParams {
  projectId: string;
  title: string;
  createdById: string;
  /** @deprecated Markdown is generated; transport schemas reject this field. */
  contentMd?: string | undefined;
  details?: string | undefined;
  objective?: string | undefined;
  preconditions?: string | undefined;
  testData?: string | undefined;
  expectedResult?: string | undefined;
  notes?: string | undefined;
  steps?: CreateTestScenarioStepInput[] | undefined;
}

export interface UpdateTestScenarioParams {
  scenarioId: string;
  projectId: string;
  /** @deprecated Markdown is generated; transport schemas reject this field. */
  contentMd?: string | undefined;
  title?: string | undefined;
  details?: string | null | undefined;
  objective?: string | null | undefined;
  preconditions?: string | null | undefined;
  testData?: string | null | undefined;
  expectedResult?: string | null | undefined;
  notes?: string | null | undefined;
}

export interface AppendTestScenarioStepParams {
  scenarioId: string;
  projectId: string;
  action: string;
  expectedResult?: string | undefined;
}

export interface UpdateTestScenarioStepParams {
  scenarioId: string;
  projectId: string;
  stepId: string;
  action?: string | undefined;
  expectedResult?: string | null | undefined;
}

export interface DeleteTestScenarioStepParams {
  scenarioId: string;
  projectId: string;
  stepId: string;
}

export interface ReorderTestScenarioStepsParams {
  scenarioId: string;
  projectId: string;
  stepIds: string[];
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
