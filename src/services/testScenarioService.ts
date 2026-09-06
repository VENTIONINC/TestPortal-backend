// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { projectModel } from "@/models/projectModel";
import { testScenarioModel } from "@/models/testScenarioModel";
import {
  TestScenarioNotFoundError,
  TestScenarioValidationError,
  type CreateTestScenarioParams,
  type ListTestScenariosParams,
  type TestScenarioListResponse,
  type TestScenarioResponse,
  type UpdateTestScenarioParams,
} from "@/types/testScenarios";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function normalizeDetails(details: unknown): string {
  if (typeof details !== "string" || !details.trim()) {
    throw new TestScenarioValidationError("Details is required");
  }

  return details.trim();
}

function validatePagination(page: number, limit: number): void {
  if (!Number.isInteger(page) || page < 1) {
    throw new TestScenarioValidationError(
      "page must be a positive integer",
    );
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new TestScenarioValidationError(
      `limit must be a positive integer no greater than ${MAX_LIMIT}`,
    );
  }
}

export const testScenarioService = {
  async createScenario(
    params: CreateTestScenarioParams,
  ): Promise<TestScenarioResponse> {
    if (typeof params.title !== "string" || !params.title.trim()) {
      throw new TestScenarioValidationError("Title is required");
    }

    if (typeof params.contentMd !== "string" || params.contentMd.length === 0) {
      throw new TestScenarioValidationError("contentMd is required");
    }

    const details =
      params.details === undefined ? null : normalizeDetails(params.details);

    if (!(await projectModel.exists(params.projectId))) {
      throw new TestScenarioNotFoundError(
        `Project with id '${params.projectId}' not found`,
      );
    }

    return await testScenarioModel.create({
      projectId: params.projectId,
      title: params.title.trim(),
      contentMd: params.contentMd,
      createdById: params.createdById,
      details,
    });
  },

  async listScenarios(
    params: ListTestScenariosParams,
  ): Promise<TestScenarioListResponse> {
    const page = params.page ?? DEFAULT_PAGE;
    const limit = params.limit ?? DEFAULT_LIMIT;
    validatePagination(page, limit);

    const [scenarios, total] = await Promise.all([
      testScenarioModel.findManySummaries(params.projectId, page, limit),
      testScenarioModel.count(params.projectId),
    ]);

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
    if (!scenarioId) {
      throw new TestScenarioValidationError("Scenario ID is required");
    }

    if (!projectId) {
      throw new TestScenarioValidationError("Project ID is required");
    }

    const scenario = await testScenarioModel.findById(scenarioId, projectId);
    if (!scenario) {
      throw new TestScenarioNotFoundError(
        `Test scenario with id '${scenarioId}' not found`,
      );
    }

    return scenario;
  },

  async updateScenario(
    params: UpdateTestScenarioParams,
  ): Promise<TestScenarioResponse> {
    if (!params.scenarioId) {
      throw new TestScenarioValidationError("Scenario ID is required");
    }

    if (!params.projectId) {
      throw new TestScenarioValidationError("Project ID is required");
    }

    if (
      params.title === undefined &&
      params.contentMd === undefined &&
      params.details === undefined
    ) {
      throw new TestScenarioValidationError(
        "At least one of title, contentMd, or details is required",
      );
    }

    if (
      params.title !== undefined &&
      (typeof params.title !== "string" || !params.title.trim())
    ) {
      throw new TestScenarioValidationError("Title is required");
    }

    if (
      params.contentMd !== undefined &&
      (typeof params.contentMd !== "string" || params.contentMd.length === 0)
    ) {
      throw new TestScenarioValidationError("contentMd is required");
    }

    const details =
      params.details === undefined
        ? undefined
        : params.details === null
          ? null
          : normalizeDetails(params.details);

    const scenario = await testScenarioModel.update(
      params.scenarioId,
      params.projectId,
      {
        ...(params.title !== undefined ? { title: params.title.trim() } : {}),
        ...(params.contentMd !== undefined
          ? { contentMd: params.contentMd }
          : {}),
        ...(details !== undefined ? { details } : {}),
      },
    );

    if (!scenario) {
      throw new TestScenarioNotFoundError(
        `Test scenario with id '${params.scenarioId}' not found`,
      );
    }

    return scenario;
  },

  async deleteScenario(scenarioId: string, projectId: string): Promise<void> {
    if (!scenarioId) {
      throw new TestScenarioValidationError("Scenario ID is required");
    }

    if (!projectId) {
      throw new TestScenarioValidationError("Project ID is required");
    }

    const deletedCount = await testScenarioModel.delete(scenarioId, projectId);
    if (deletedCount === 0) {
      throw new TestScenarioNotFoundError(
        `Test scenario with id '${scenarioId}' not found`,
      );
    }
  },
};
