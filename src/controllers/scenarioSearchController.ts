// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Response } from "express";
import { z } from "zod";

import getLogger from "@/lib/logger";
import { ScenarioSearchUnavailableError } from "@/lib/scenarioSearchClient";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";
import { getRelatedScenarios } from "@/services/scenarioSearchService";
import { UserServiceError } from "@/services/userService";
import { TestScenarioNotFoundError } from "@/types/testScenarios";

const logger = getLogger("scenario-search-controller");
const relatedRequest = z
  .object({
    projectId: z.string().uuid(),
    sourceScenarioId: z.string().uuid(),
  })
  .strict();

export async function relatedScenarios(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const parsed = relatedRequest.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Expected projectId and sourceScenarioId UUIDs" });
    return;
  }

  const { projectId, sourceScenarioId } = parsed.data;
  try {
    const matches = await getRelatedScenarios(
      req.user,
      projectId,
      sourceScenarioId,
    );
    res.status(200).json(matches);
  } catch (error) {
    if (error instanceof TestScenarioNotFoundError) {
      res.status(404).json({ error: "Source scenario or project not found" });
      return;
    }
    if (error instanceof UserServiceError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    if (error instanceof ScenarioSearchUnavailableError) {
      logger.warn("Scenario search is unavailable", error.cause);
      res.status(503).json({ error: error.message });
      return;
    }
    logger.error("Failed to find related scenarios", error);
    res.status(500).json({ error: "Failed to find related scenarios" });
  }
}
