// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { projectModel } from "@/models/projectModel";
import { testScenarioModel } from "@/models/testScenarioModel";
import {
  TestScenarioNotFoundError,
  TestScenarioValidationError,
  type AppendTestScenarioStepParams,
  type CreateTestScenarioParams,
  type DeleteTestScenarioStepParams,
  type ListTestScenariosParams,
  type ReorderTestScenarioStepsParams,
  TEST_SCENARIO_SORT_VALUES,
  type TestScenarioSort,
  type TestScenarioListResponse,
  type TestScenarioResponse,
  type UpdateTestScenarioParams,
  type UpdateTestScenarioStepParams,
} from "@/types/testScenarios";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCENARIO_FIELDS = [
  "title",
  "details",
  "objective",
  "preconditions",
  "testData",
  "expectedResult",
  "notes",
] as const;
const IDENTIFIER_FIELDS = ["scenarioId", "projectId"] as const;

function requireIdentifier(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TestScenarioValidationError(`${label} is required`);
  }
}

function normalizeNonBlank(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new TestScenarioValidationError(`${label} must not be blank`);
  }
  return value.trim();
}

function normalizeCreateOptional(value: unknown, label: string): string | null {
  if (value === undefined) {
    return null;
  }
  return normalizeNonBlank(value, label);
}

function normalizeUpdateOptional(value: unknown, label: string): string | null {
  if (value === null) {
    return null;
  }
  return normalizeNonBlank(value, label);
}

function validatePagination(page: number, limit: number): void {
  if (!Number.isInteger(page) || page < 1) {
    throw new TestScenarioValidationError("page must be a positive integer");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new TestScenarioValidationError(
      `limit must be a positive integer no greater than ${MAX_LIMIT}`,
    );
  }
}

function requireUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new TestScenarioValidationError(`${label} must be a valid UUID`);
  }
}

function normalizeSearch(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new TestScenarioValidationError("search must be a string");
  }

  const normalized = value.trim();
  return normalized || undefined;
}

function normalizeSort(value: unknown): TestScenarioSort {
  if (value === undefined) {
    return "recently_created";
  }
  if (
    typeof value !== "string" ||
    !(TEST_SCENARIO_SORT_VALUES as readonly string[]).includes(value)
  ) {
    throw new TestScenarioValidationError(
      `sort must be one of ${TEST_SCENARIO_SORT_VALUES.join(", ")}`,
    );
  }
  return value as TestScenarioSort;
}

function validateKeys(
  params: Record<string, unknown>,
  allowed: readonly string[],
): void {
  const unknownKey = Object.keys(params).find((key) => !allowed.includes(key));
  if (unknownKey) {
    throw new TestScenarioValidationError(`Unknown field '${unknownKey}'`);
  }
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function validateCreateSteps(
  steps: CreateTestScenarioParams["steps"],
): NonNullable<CreateTestScenarioParams["steps"]> {
  if (steps === undefined) {
    return [];
  }
  if (!Array.isArray(steps)) {
    throw new TestScenarioValidationError("steps must be an array");
  }

  return steps.map((step, index) => {
    if (step === null || typeof step !== "object") {
      throw new TestScenarioValidationError(
        `steps[${index}] must be an object`,
      );
    }
    validateKeys(step as unknown as Record<string, unknown>, [
      "action",
      "expectedResult",
    ]);
    const expectedResult = hasOwn(step, "expectedResult")
      ? normalizeNonBlank(step.expectedResult, `steps[${index}].expectedResult`)
      : undefined;
    return {
      action: normalizeNonBlank(step.action, `steps[${index}].action`),
      ...(expectedResult !== undefined ? { expectedResult } : {}),
    };
  });
}

function scenarioNotFound(scenarioId: string): TestScenarioNotFoundError {
  return new TestScenarioNotFoundError(
    `Test scenario with id '${scenarioId}' not found`,
  );
}

export const testScenarioService = {
  async createScenario(
    params: CreateTestScenarioParams,
  ): Promise<TestScenarioResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "projectId",
      "title",
      "createdById",
      ...SCENARIO_FIELDS.filter((field) => field !== "title"),
      "steps",
    ]);
    requireIdentifier(params.projectId, "Project ID");
    requireIdentifier(params.createdById, "Creator ID");

    const data: CreateTestScenarioParams = {
      projectId: params.projectId,
      createdById: params.createdById,
      title: normalizeNonBlank(params.title, "Title"),
      details: normalizeCreateOptional(params.details, "Details") ?? undefined,
      objective:
        normalizeCreateOptional(params.objective, "Objective") ?? undefined,
      preconditions:
        normalizeCreateOptional(params.preconditions, "Preconditions") ??
        undefined,
      testData:
        normalizeCreateOptional(params.testData, "Test data") ?? undefined,
      expectedResult:
        normalizeCreateOptional(params.expectedResult, "Expected result") ??
        undefined,
      notes: normalizeCreateOptional(params.notes, "Notes") ?? undefined,
      steps: validateCreateSteps(params.steps),
    };

    if (!(await projectModel.exists(data.projectId))) {
      throw new TestScenarioNotFoundError(
        `Project with id '${data.projectId}' not found`,
      );
    }

    const scenario = await testScenarioModel.create(data);
    if (!scenario) {
      throw new TestScenarioNotFoundError(
        `Project with id '${data.projectId}' not found`,
      );
    }
    return scenario;
  },

  async listScenarios(
    params: ListTestScenariosParams,
  ): Promise<TestScenarioListResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "projectId",
      "page",
      "limit",
      "search",
      "createdById",
      "sort",
    ]);
    requireIdentifier(params.projectId, "Project ID");
    const page = params.page ?? DEFAULT_PAGE;
    const limit = params.limit ?? DEFAULT_LIMIT;
    validatePagination(page, limit);
    const search = normalizeSearch(params.search);
    if (params.createdById !== undefined) {
      requireUuid(params.createdById, "Creator ID");
    }
    const sort = normalizeSort(params.sort);

    const { scenarios, total } = await testScenarioModel.listSummaries({
      projectId: params.projectId,
      page,
      limit,
      ...(search !== undefined ? { search } : {}),
      ...(params.createdById !== undefined
        ? { createdById: params.createdById }
        : {}),
      sort,
    });

    return {
      scenarios,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getScenarioById(
    scenarioId: string,
    projectId: string,
  ): Promise<TestScenarioResponse> {
    requireIdentifier(scenarioId, "Scenario ID");
    requireIdentifier(projectId, "Project ID");

    const scenario = await testScenarioModel.findById(scenarioId, projectId);
    if (!scenario) {
      throw scenarioNotFound(scenarioId);
    }

    return scenario;
  },

  async updateScenario(
    params: UpdateTestScenarioParams,
  ): Promise<TestScenarioResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      ...IDENTIFIER_FIELDS,
      ...SCENARIO_FIELDS,
    ]);
    requireIdentifier(params.scenarioId, "Scenario ID");
    requireIdentifier(params.projectId, "Project ID");

    const supplied = SCENARIO_FIELDS.filter((field) => hasOwn(params, field));
    if (supplied.length === 0) {
      throw new TestScenarioValidationError(
        "At least one editable field is required",
      );
    }

    const data: Omit<UpdateTestScenarioParams, "scenarioId" | "projectId"> = {};
    for (const field of supplied) {
      if (field === "title") {
        data.title = normalizeNonBlank(params.title, "Title");
      } else {
        data[field] = normalizeUpdateOptional(params[field], field);
      }
    }

    const scenario = await testScenarioModel.update(
      params.scenarioId,
      params.projectId,
      data,
    );
    if (!scenario) {
      throw scenarioNotFound(params.scenarioId);
    }
    return scenario;
  },

  async appendStep(
    params: AppendTestScenarioStepParams,
  ): Promise<TestScenarioResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "scenarioId",
      "projectId",
      "action",
      "expectedResult",
    ]);
    requireIdentifier(params.scenarioId, "Scenario ID");
    requireIdentifier(params.projectId, "Project ID");
    const action = normalizeNonBlank(params.action, "Action");
    const expectedResult =
      params.expectedResult === undefined
        ? undefined
        : normalizeNonBlank(params.expectedResult, "Expected result");

    const scenario = await testScenarioModel.appendStep({
      scenarioId: params.scenarioId,
      projectId: params.projectId,
      action,
      ...(expectedResult !== undefined ? { expectedResult } : {}),
    });
    if (!scenario) {
      throw scenarioNotFound(params.scenarioId);
    }
    return scenario;
  },

  async updateStep(
    params: UpdateTestScenarioStepParams,
  ): Promise<TestScenarioResponse> {
    validateKeys(params as unknown as Record<string, unknown>, [
      "scenarioId",
      "projectId",
      "stepId",
      "action",
      "expectedResult",
    ]);
    requireIdentifier(params.scenarioId, "Scenario ID");
    requireIdentifier(params.projectId, "Project ID");
    requireIdentifier(params.stepId, "Step ID");
    if (!hasOwn(params, "action") && !hasOwn(params, "expectedResult")) {
      throw new TestScenarioValidationError(
        "At least one step field is required",
      );
    }

    const action = hasOwn(params, "action")
      ? normalizeNonBlank(params.action, "Action")
      : undefined;
    const expectedResult = hasOwn(params, "expectedResult")
      ? normalizeUpdateOptional(params.expectedResult, "Expected result")
      : undefined;
    const scenario = await testScenarioModel.updateStep({
      scenarioId: params.scenarioId,
      projectId: params.projectId,
      stepId: params.stepId,
      ...(action !== undefined ? { action } : {}),
      ...(hasOwn(params, "expectedResult") ? { expectedResult } : {}),
    });
    if (!scenario) {
      throw scenarioNotFound(params.scenarioId);
    }
    return scenario;
  },

  async deleteStep(
    params: DeleteTestScenarioStepParams,
  ): Promise<TestScenarioResponse> {
    requireIdentifier(params.scenarioId, "Scenario ID");
    requireIdentifier(params.projectId, "Project ID");
    requireIdentifier(params.stepId, "Step ID");
    const scenario = await testScenarioModel.deleteStep({
      scenarioId: params.scenarioId,
      projectId: params.projectId,
      stepId: params.stepId,
    });
    if (!scenario) {
      throw scenarioNotFound(params.scenarioId);
    }
    return scenario;
  },

  async reorderSteps(
    params: ReorderTestScenarioStepsParams,
  ): Promise<TestScenarioResponse> {
    requireIdentifier(params.scenarioId, "Scenario ID");
    requireIdentifier(params.projectId, "Project ID");
    if (!Array.isArray(params.stepIds) || params.stepIds.some((id) => !id)) {
      throw new TestScenarioValidationError("stepIds must be an array of IDs");
    }

    const result = await testScenarioModel.reorderSteps(params);
    if (result.kind === "not-found") {
      throw scenarioNotFound(params.scenarioId);
    }
    if (result.kind === "invalid-order") {
      throw new TestScenarioValidationError(
        "stepIds must contain every current step exactly once",
      );
    }
    return result.scenario;
  },

  async deleteScenario(scenarioId: string, projectId: string): Promise<void> {
    requireIdentifier(scenarioId, "Scenario ID");
    requireIdentifier(projectId, "Project ID");
    const deletedCount = await testScenarioModel.delete(scenarioId, projectId);
    if (deletedCount === 0) {
      throw scenarioNotFound(scenarioId);
    }
  },
};
