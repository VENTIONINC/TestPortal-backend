// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  scenarioSearchClient,
  type RelatedScenarioMatch,
} from "@/lib/scenarioSearchClient";
import { projectModel } from "@/models/projectModel";
import { testScenarioService } from "@/services/testScenarioService";
import {
  UserServiceError,
  type UserLifecycleStatus,
} from "@/services/userService";
import { TestScenarioNotFoundError } from "@/types/testScenarios";

export async function getRelatedScenarios(
  caller: { status: UserLifecycleStatus } | undefined,
  projectId: string,
  sourceScenarioId: string,
): Promise<RelatedScenarioMatch[]> {
  if (!caller) throw new UserServiceError("User is not authenticated", 401);
  if (caller.status !== "active")
    throw new UserServiceError("User is not active", 403);
  if (!(await projectModel.exists(projectId))) {
    throw new TestScenarioNotFoundError("Project not found");
  }

  await testScenarioService.getScenarioById(sourceScenarioId, projectId);
  return scenarioSearchClient.related(projectId, sourceScenarioId);
}
