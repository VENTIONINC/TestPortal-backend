// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export interface TestScenarioResponse {
  id: string;
  projectId: string;
  createdById: string;
  title: string;
  contentMd: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TestScenarioRecord = TestScenarioResponse;

export interface CreateTestScenarioParams {
  projectId: string;
  title: string;
  contentMd: string;
  createdById: string;
}

export interface ListTestScenariosParams {
  projectId: string;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface TestScenarioListResponse {
  scenarios: TestScenarioResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
