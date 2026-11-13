// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { manualTestRunLifecycleModel } from "@/models/manualTestRunLifecycleModel";
import {
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
  type CompleteManualTestRunParams,
  type ManualTestRunResponse,
  type ReopenManualTestRunParams,
} from "@/types/manualTestRuns";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateIds(
  projectId: string,
  runId: string,
  actorId: string,
  actorLabel: string,
): void {
  if (!UUID_PATTERN.test(projectId)) {
    throw new ManualTestRunValidationError("Project ID must be a valid UUID");
  }
  if (!UUID_PATTERN.test(runId)) {
    throw new ManualTestRunValidationError("Run ID must be a valid UUID");
  }
  if (!UUID_PATTERN.test(actorId)) {
    throw new ManualTestRunValidationError(
      `${actorLabel} must be a valid UUID`,
    );
  }
}

async function requireRun(
  promise: Promise<ManualTestRunResponse | null>,
  runId: string,
): Promise<ManualTestRunResponse> {
  const run = await promise;
  if (!run) {
    throw new ManualTestRunNotFoundError(
      `Manual test run with id '${runId}' not found in the requested project`,
    );
  }
  return run;
}

export const manualTestRunLifecycleService = {
  async deleteRun(params: {
    projectId: string;
    runId: string;
    userId: string;
  }): Promise<void> {
    validateIds(params.projectId, params.runId, params.userId, "User ID");
    if (
      !(await manualTestRunLifecycleModel.delete({
        projectId: params.projectId,
        runId: params.runId,
      }))
    ) {
      throw new ManualTestRunNotFoundError(
        `Manual test run with id '${params.runId}' not found in the requested project`,
      );
    }
  },

  async completeRun(
    params: CompleteManualTestRunParams,
  ): Promise<ManualTestRunResponse> {
    validateIds(
      params.projectId,
      params.runId,
      params.completedById,
      "Completing user ID",
    );
    return await requireRun(
      manualTestRunLifecycleModel.complete(params),
      params.runId,
    );
  },

  async reopenRun(
    params: ReopenManualTestRunParams,
  ): Promise<ManualTestRunResponse> {
    validateIds(
      params.projectId,
      params.runId,
      params.reopenedById,
      "Reopening user ID",
    );
    return await requireRun(
      manualTestRunLifecycleModel.reopen(params),
      params.runId,
    );
  },
};
