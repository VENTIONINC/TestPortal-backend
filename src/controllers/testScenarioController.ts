// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  createTestScenarioSchema,
  testScenarioIdParamsSchema,
  testScenarioListQuerySchema,
  testScenarioProjectQuerySchema,
  updateTestScenarioSchema,
} from "@/schemas/testScenarioSchemas";
import {
  testScenarioEvidenceParamsSchema as integrationEvidenceParamsSchema,
  testScenarioEvidenceQuerySchema as integrationEvidenceQuerySchema,
  testScenarioSpecLinkBodySchema as integrationSpecLinkBodySchema,
  testScenarioSpecLinkDeleteParamsSchema as integrationSpecLinkDeleteParamsSchema,
  testScenarioSpecLinkListQuerySchema as integrationSpecLinkListQuerySchema,
  testScenarioSpecLinkParamsSchema as integrationSpecLinkParamsSchema,
  testScenarioSpecLinkQuerySchema as integrationSpecLinkQuerySchema,
} from "@/schemas/testScenarioIntegrationSchemas";
import { testScenarioService } from "@/services/testScenarioService";
import { testScenarioIntegrationService } from "@/services/testScenarioIntegrationService";
import {
  TestScenarioNotFoundError,
  TestScenarioValidationError,
} from "@/types/testScenarios";
import {
  TestScenarioIntegrationValidationError,
  TestScenarioSpecLinkConflictError,
  TestScenarioSpecLinkNotFoundError,
} from "@/types/testScenarioIntegration";

function validationMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid request";
}

function sendValidationError(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

function sendServiceError(res: Response, error: unknown, operation: string): void {
  if (
    error instanceof TestScenarioValidationError ||
    error instanceof TestScenarioIntegrationValidationError
  ) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (
    error instanceof TestScenarioNotFoundError ||
    error instanceof TestScenarioSpecLinkNotFoundError
  ) {
    res.status(404).json({ error: error.message });
    return;
  }

  if (error instanceof TestScenarioSpecLinkConflictError) {
    res.status(409).json({ error: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : "Unknown error";
  res.status(500).json({ error: `Failed to ${operation}. ${message}` });
}

export const testScenarioController = {
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const parsed = createTestScenarioSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, validationMessage(parsed.error));
      return;
    }

    try {
      const scenario = await testScenarioService.createScenario({
        ...parsed.data,
        createdById: req.user.id,
      });
      res.status(201).json(scenario);
    } catch (error) {
      sendServiceError(res, error, "create test scenario");
    }
  },

  async list(req: Request, res: Response): Promise<void> {
    const parsed = testScenarioListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      sendValidationError(res, validationMessage(parsed.error));
      return;
    }

    try {
      const response = await testScenarioService.listScenarios(parsed.data);
      res.status(200).json(response);
    } catch (error) {
      sendServiceError(res, error, "list test scenarios");
    }
  },

  async getById(
    req: Request<{ scenarioId: string }>,
    res: Response,
  ): Promise<void> {
    const params = testScenarioIdParamsSchema.safeParse(req.params);
    const query = testScenarioProjectQuerySchema.safeParse(req.query);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }

    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      const scenario = await testScenarioService.getScenarioById(
        params.data.scenarioId,
        query.data.projectId,
      );
      res.status(200).json(scenario);
    } catch (error) {
      sendServiceError(res, error, "fetch test scenario");
    }
  },

  async update(
    req: Request<{ scenarioId: string }>,
    res: Response,
  ): Promise<void> {
    const params = testScenarioIdParamsSchema.safeParse(req.params);
    const query = testScenarioProjectQuerySchema.safeParse(req.query);
    const body = updateTestScenarioSchema.safeParse(req.body);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }

    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    if (!body.success) {
      sendValidationError(res, validationMessage(body.error));
      return;
    }

    try {
      const scenario = await testScenarioService.updateScenario({
        scenarioId: params.data.scenarioId,
        projectId: query.data.projectId,
        ...body.data,
      });
      res.status(200).json(scenario);
    } catch (error) {
      sendServiceError(res, error, "update test scenario");
    }
  },

  async delete(
    req: Request<{ scenarioId: string }>,
    res: Response,
  ): Promise<void> {
    const params = testScenarioIdParamsSchema.safeParse(req.params);
    const query = testScenarioProjectQuerySchema.safeParse(req.query);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }

    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      await testScenarioService.deleteScenario(
        params.data.scenarioId,
        query.data.projectId,
      );
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, "delete test scenario");
    }
  },

  async addSpecLink(req: Request, res: Response): Promise<void> {
    const params = integrationSpecLinkParamsSchema.safeParse(req.params);
    const query = integrationSpecLinkQuerySchema.safeParse(req.query);
    const body = integrationSpecLinkBodySchema.safeParse(req.body);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }

    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    if (!body.success) {
      sendValidationError(res, validationMessage(body.error));
      return;
    }

    try {
      const link = await testScenarioIntegrationService.addSpecLink({
        scenarioId: params.data.scenarioId,
        projectId: query.data.projectId,
        specId: body.data.specId,
      });
      res.status(201).json(link);
    } catch (error) {
      sendServiceError(res, error, "link Spec to test scenario");
    }
  },

  async listSpecLinks(req: Request, res: Response): Promise<void> {
    const params = integrationSpecLinkParamsSchema.safeParse(req.params);
    const query = integrationSpecLinkListQuerySchema.safeParse(req.query);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }

    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      const links = await testScenarioIntegrationService.listSpecLinks({
        scenarioId: params.data.scenarioId,
        ...query.data,
      });
      res.status(200).json(links);
    } catch (error) {
      sendServiceError(res, error, "list test scenario Spec links");
    }
  },

  async removeSpecLink(req: Request, res: Response): Promise<void> {
    const params = integrationSpecLinkDeleteParamsSchema.safeParse(req.params);
    const query = integrationSpecLinkQuerySchema.safeParse(req.query);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }

    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      await testScenarioIntegrationService.removeSpecLink({
        scenarioId: params.data.scenarioId,
        specId: params.data.specId,
        projectId: query.data.projectId,
      });
      res.status(204).send();
    } catch (error) {
      sendServiceError(res, error, "remove test scenario Spec link");
    }
  },

  async getResults(req: Request, res: Response): Promise<void> {
    const params = integrationEvidenceParamsSchema.safeParse(req.params);
    const query = integrationEvidenceQuerySchema.safeParse(req.query);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }

    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      const results = await testScenarioIntegrationService.getResults({
        scenarioId: params.data.scenarioId,
        ...query.data,
      });
      res.status(200).json(results);
    } catch (error) {
      sendServiceError(res, error, "list test scenario Results");
    }
  },

  async getIssues(req: Request, res: Response): Promise<void> {
    const params = integrationEvidenceParamsSchema.safeParse(req.params);
    const query = integrationEvidenceQuerySchema.safeParse(req.query);
    if (!params.success) {
      sendValidationError(res, validationMessage(params.error));
      return;
    }

    if (!query.success) {
      sendValidationError(res, validationMessage(query.error));
      return;
    }

    try {
      const issues = await testScenarioIntegrationService.getIssues({
        scenarioId: params.data.scenarioId,
        ...query.data,
      });
      res.status(200).json(issues);
    } catch (error) {
      sendServiceError(res, error, "list test scenario Issues");
    }
  },
};
