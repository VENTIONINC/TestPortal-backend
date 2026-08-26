// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import { issueService } from "@/services/issueService";
import { resultService } from "@/services/resultService";
import { testScenarioSpecLinkModel } from "@/models/testScenarioSpecLinkModel";
import { specModel } from "@/models/specModel";
import { testScenarioModel } from "@/models/testScenarioModel";
import { normalizeSpecPayload } from "@/lib/jsonPayloads";
import {
  TestScenarioNotFoundError,
} from "@/types/testScenarios";
import {
  TestScenarioIntegrationValidationError,
  TestScenarioSpecLinkConflictError,
  TestScenarioSpecLinkNotFoundError,
  type AddTestScenarioSpecLinkParams,
  type ListTestScenarioSpecLinksParams,
  type TestScenarioEvidenceParams,
  type TestScenarioIssuesResponse,
  type TestScenarioResultsResponse,
  type TestScenarioSpecLinkResponse,
  type TestScenarioSpecLinksResponse,
} from "@/types/testScenarioIntegration";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function validateContext(scenarioId: string, projectId: string): void {
  if (!scenarioId) {
    throw new TestScenarioIntegrationValidationError(
      "Scenario ID is required",
    );
  }

  if (!projectId) {
    throw new TestScenarioIntegrationValidationError("Project ID is required");
  }
}

function resolvePagination(
  page: number | undefined,
  limit: number | undefined,
): { page: number; limit: number } {
  const resolvedPage = page ?? DEFAULT_PAGE;
  const resolvedLimit = limit ?? DEFAULT_LIMIT;

  if (!Number.isInteger(resolvedPage) || resolvedPage < 1) {
    throw new TestScenarioIntegrationValidationError(
      "page must be a positive integer",
    );
  }

  if (
    !Number.isInteger(resolvedLimit) ||
    resolvedLimit < 1 ||
    resolvedLimit > MAX_LIMIT
  ) {
    throw new TestScenarioIntegrationValidationError(
      `limit must be a positive integer no greater than ${MAX_LIMIT}`,
    );
  }

  return { page: resolvedPage, limit: resolvedLimit };
}

function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002";
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code?: unknown }).code === "P2002";
  }

  return false;
}

async function requireScenario(
  scenarioId: string,
  projectId: string,
): Promise<void> {
  validateContext(scenarioId, projectId);

  const scenario = await testScenarioModel.findById(scenarioId, projectId);
  if (!scenario) {
    throw new TestScenarioNotFoundError(
      `Test scenario with id '${scenarioId}' not found`,
    );
  }
}

async function resolveLinkedSpecIds(
  scenarioId: string,
  projectId: string,
): Promise<{ specIds: string[]; count: number }> {
  const [specIds, count] = await Promise.all([
    testScenarioSpecLinkModel.findLinkedSpecIds(scenarioId, projectId),
    testScenarioSpecLinkModel.countLinkedSpecs(scenarioId, projectId),
  ]);

  return {
    specIds: [...new Set(specIds)],
    count,
  };
}

export const testScenarioIntegrationService = {
  async addSpecLink(
    params: AddTestScenarioSpecLinkParams,
  ): Promise<TestScenarioSpecLinkResponse> {
    validateContext(params.scenarioId, params.projectId);
    if (!params.specId) {
      throw new TestScenarioIntegrationValidationError("Spec ID is required");
    }

    const [scenario, spec] = await Promise.all([
      testScenarioModel.findById(params.scenarioId, params.projectId),
      specModel.findById(params.specId, params.projectId),
    ]);
    if (!scenario || !spec) {
      throw new TestScenarioSpecLinkNotFoundError(
        "Test scenario or Spec not found in the requested project",
      );
    }

    try {
      await testScenarioSpecLinkModel.create({
        testScenarioId: params.scenarioId,
        specId: params.specId,
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new TestScenarioSpecLinkConflictError(
          "The Test Scenario is already linked to this Spec",
        );
      }
      throw error;
    }

    return {
      scenarioId: params.scenarioId,
      specId: params.specId,
    };
  },

  async listSpecLinks(
    params: ListTestScenarioSpecLinksParams,
  ): Promise<TestScenarioSpecLinksResponse> {
    const { page, limit } = resolvePagination(params.page, params.limit);
    await requireScenario(params.scenarioId, params.projectId);

    const [links, total] = await Promise.all([
      testScenarioSpecLinkModel.findLinkedSpecs(
        params.scenarioId,
        params.projectId,
        page,
        limit,
      ),
      testScenarioSpecLinkModel.countLinkedSpecs(
        params.scenarioId,
        params.projectId,
      ),
    ]);

    return {
      scenarioId: params.scenarioId,
      projectId: params.projectId,
      specs: links.map(({ spec }) => normalizeSpecPayload(spec)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async removeSpecLink(params: AddTestScenarioSpecLinkParams): Promise<void> {
    validateContext(params.scenarioId, params.projectId);
    if (!params.specId) {
      throw new TestScenarioIntegrationValidationError("Spec ID is required");
    }

    const [scenario, spec] = await Promise.all([
      testScenarioModel.findById(params.scenarioId, params.projectId),
      specModel.findById(params.specId, params.projectId),
    ]);
    if (!scenario || !spec) {
      throw new TestScenarioSpecLinkNotFoundError(
        "Test scenario or Spec not found in the requested project",
      );
    }

    const deletedCount = await testScenarioSpecLinkModel.delete(
      params.scenarioId,
      params.specId,
    );
    if (deletedCount === 0) {
      throw new TestScenarioSpecLinkNotFoundError(
        "Test scenario and Spec link not found",
      );
    }
  },

  async getResults(
    params: TestScenarioEvidenceParams,
  ): Promise<TestScenarioResultsResponse> {
    const { page, limit } = resolvePagination(params.page, params.limit);
    await requireScenario(params.scenarioId, params.projectId);
    const { specIds, count: linkedSpecCount } = await resolveLinkedSpecIds(
      params.scenarioId,
      params.projectId,
    );
    const evidence = await resultService.getResultsBySpecRecordIds({
      projectId: params.projectId,
      specRecordIds: specIds,
      page,
      limit,
    });

    return {
      scenarioId: params.scenarioId,
      projectId: params.projectId,
      linkedSpecCount,
      results: evidence.results,
      total: evidence.total,
      page,
      limit,
      totalPages: Math.ceil(evidence.total / limit),
    };
  },

  async getIssues(
    params: TestScenarioEvidenceParams,
  ): Promise<TestScenarioIssuesResponse> {
    const { page, limit } = resolvePagination(params.page, params.limit);
    await requireScenario(params.scenarioId, params.projectId);
    const { specIds, count: linkedSpecCount } = await resolveLinkedSpecIds(
      params.scenarioId,
      params.projectId,
    );
    const evidence = await issueService.getObservedIssuesBySpecRecordIds({
      projectId: params.projectId,
      specRecordIds: specIds,
      page,
      limit,
    });

    return {
      scenarioId: params.scenarioId,
      projectId: params.projectId,
      linkedSpecCount,
      issues: evidence.issues,
      total: evidence.total,
      page,
      limit,
      totalPages: Math.ceil(evidence.total / limit),
    };
  },
};
