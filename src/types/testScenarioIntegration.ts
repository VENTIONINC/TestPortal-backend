// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type {
  SerializedIssue,
  StructuredResultWithRelations,
  StructuredSpec,
} from "@/types/database";

export interface AddTestScenarioSpecLinkParams {
  scenarioId: string;
  specId: string;
  projectId: string;
}

export interface ListTestScenarioSpecLinksParams {
  scenarioId: string;
  projectId: string;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface TestScenarioEvidenceParams {
  scenarioId: string;
  projectId: string;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface TestScenarioSpecLinkResponse {
  scenarioId: string;
  specId: string;
}

export interface TestScenarioSpecLinksResponse {
  scenarioId: string;
  projectId: string;
  specs: StructuredSpec[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TestScenarioResultsResponse {
  scenarioId: string;
  projectId: string;
  linkedSpecCount: number;
  results: StructuredResultWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TestScenarioIssuesResponse {
  scenarioId: string;
  projectId: string;
  linkedSpecCount: number;
  issues: SerializedIssue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class TestScenarioIntegrationValidationError extends Error {
  readonly code = "TEST_SCENARIO_INTEGRATION_VALIDATION_ERROR" as const;

  constructor(message: string) {
    super(message);
    this.name = "TestScenarioIntegrationValidationError";
  }
}

export class TestScenarioSpecLinkNotFoundError extends Error {
  readonly code = "TEST_SCENARIO_SPEC_LINK_NOT_FOUND" as const;

  constructor(message: string) {
    super(message);
    this.name = "TestScenarioSpecLinkNotFoundError";
  }
}

export class TestScenarioSpecLinkConflictError extends Error {
  readonly code = "TEST_SCENARIO_SPEC_LINK_CONFLICT" as const;

  constructor(message: string) {
    super(message);
    this.name = "TestScenarioSpecLinkConflictError";
  }
}
