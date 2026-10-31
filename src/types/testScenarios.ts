// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestScenarioPriority } from "@prisma/client";

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
  folderId?: string | null;
  createdById: string;
  title: string;
  scenarioKey: string;
  details: string | null;
  preconditions: string | null;
  testData: string | null;
  priority: TestScenarioPriority;
  relatedIssueUrl: string | null;
  revision: number;
  createdBy: TestScenarioCreatorSummary;
  updatedBy: TestScenarioCreatorSummary | null;
  suites: Array<{ id: string; name: string }>;
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
  scenarioKey: string;
  details: string | null;
  createdBy: TestScenarioCreatorSummary;
  createdAt: Date;
  updatedAt: Date;
  folderId?: string | null;
  folderName?: string | null;
  matchedSuiteId?: string | null;
}

export interface RelatedTestScenarioSummary {
  id: string;
  title: string;
  scenarioKey: string;
  details: string | null;
  contentMd: string;
}

export interface CreateTestScenarioStepInput {
  action: string;
  expectedResult?: string | undefined;
}

export interface CreateTestScenarioParams {
  projectId: string;
  title: string;
  scenarioKey?: string | null | undefined;
  createdById: string;
  folderId?: string | null | undefined;
  /** @deprecated Markdown is generated; transport schemas reject this field. */
  contentMd?: string | undefined;
  details?: string | undefined;
  preconditions?: string | undefined;
  testData?: string | undefined;
  priority?: TestScenarioPriority | null | undefined;
  relatedIssueUrl?: string | null | undefined;
  steps?: CreateTestScenarioStepInput[] | undefined;
  suiteIds?: string[] | undefined;
  newSuites?: Array<{ name: string }> | undefined;
}

export interface UpdateTestScenarioParams {
  actorId?: string | undefined;
  expectedRevision?: number | undefined;
  steps?:
    | Array<{
        id?: string | undefined;
        action: string;
        expectedResult?: string | null | undefined;
      }>
    | undefined;
  suiteIds?: string[] | undefined;
  newSuites?: Array<{ name: string }> | undefined;
  scenarioId: string;
  projectId: string;
  folderId?: string | null | undefined;
  /** @deprecated Markdown is generated; transport schemas reject this field. */
  contentMd?: string | undefined;
  title?: string | undefined;
  scenarioKey?: string | null | undefined;
  details?: string | null | undefined;
  preconditions?: string | null | undefined;
  testData?: string | null | undefined;
  priority?: TestScenarioPriority | null | undefined;
  relatedIssueUrl?: string | null | undefined;
}

export interface AppendTestScenarioStepParams {
  actorId?: string | undefined;
  scenarioId: string;
  projectId: string;
  action: string;
  expectedResult?: string | undefined;
}

export interface UpdateTestScenarioStepParams {
  actorId?: string | undefined;
  scenarioId: string;
  projectId: string;
  stepId: string;
  action?: string | undefined;
  expectedResult?: string | null | undefined;
}

export interface DeleteTestScenarioStepParams {
  actorId?: string | undefined;
  scenarioId: string;
  projectId: string;
  stepId: string;
}

export interface ReorderTestScenarioStepsParams {
  actorId?: string | undefined;
  scenarioId: string;
  projectId: string;
  stepIds: string[];
}

export const TEST_SCENARIO_SORT_VALUES = [
  "recently_created",
  "recently_updated",
  "title_asc",
] as const;

export type TestScenarioSort = (typeof TEST_SCENARIO_SORT_VALUES)[number];

export const TEST_SCENARIO_SORT_FIELDS = [
  "scenarioKey",
  "title",
  "details",
  "folder",
  "createdBy",
  "createdAt",
  "updatedAt",
] as const;
export type TestScenarioSortField = (typeof TEST_SCENARIO_SORT_FIELDS)[number];
export type TestScenarioSortDirection = "asc" | "desc";

export interface ListTestScenariosParams {
  projectId: string;
  page?: number | undefined;
  limit?: number | undefined;
  search?: string | undefined;
  createdById?: string | undefined;
  sort?: TestScenarioSort | undefined;
  sortField?: TestScenarioSortField | undefined;
  sortDirection?: TestScenarioSortDirection | undefined;
  scenarioKey?: string | undefined;
  title?: string | undefined;
  details?: string | undefined;
  folder?: string | undefined;
  createdBy?: string | undefined;
  folderId?: string | undefined;
  includeDescendants?: boolean | undefined;
  suiteId?: string | undefined;
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

export class TestScenarioConflictError extends Error {
  readonly code = "TEST_SCENARIO_CONFLICT" as const;
  constructor(
    message = "Scenario changed since this draft was loaded. Reload explicitly before saving.",
  ) {
    super(message);
    this.name = "TestScenarioConflictError";
  }
}
