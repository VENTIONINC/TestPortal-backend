// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import {
  createTestScenarioSchema,
  testScenarioIdParamsSchema,
  testScenarioListQuerySchema,
  testScenarioProjectQuerySchema,
} from "@/schemas/testScenarioSchemas";
import { testScenarioService } from "@/services/testScenarioService";
import {
  TestScenarioNotFoundError,
  TestScenarioValidationError,
} from "@/types/testScenarios";

function validationMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid request";
}

function sendValidationError(res: Response, message: string): void {
  res.status(400).json({ error: message });
}

function sendServiceError(res: Response, error: unknown, operation: string): void {
  if (error instanceof TestScenarioValidationError) {
    res.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof TestScenarioNotFoundError) {
    res.status(404).json({ error: error.message });
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
};
