// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { manualTestRunService } from "@/services/manualTestRunService";
import { userService } from "@/services/userService";
import type {
  CompleteManualTestRunInput, GetManualTestRunInput, ListManualTestRunsInput,
  ListTestScenarioManualRunsInput, ReassignManualTestRunExecutorInput,
  StartManualTestRunInput, UpdateManualTestRunInput, UpdateManualTestRunStepInput,
} from "@/mcp/schemas/manualTestRunSchemas";

export const mcpManualTestRunHandler = {
  async start(params: StartManualTestRunInput, executedById: string) {
    return await manualTestRunService.startRun({
      ...params,
      projectId: params.projectId,
      scenarioId: params.scenarioId,
      executedById,
    });
  },
  async get(params: GetManualTestRunInput) { return await manualTestRunService.getRun(params); },
  async update(params: UpdateManualTestRunInput) {
    return await manualTestRunService.updateRun({
      projectId: params.projectId,
      runId: params.runId,
      ...(params.notes !== undefined ? { notes: params.notes } : {}),
      ...(params.runKey !== undefined ? { runKey: params.runKey } : {}),
    });
  },
  async updateStep(params: UpdateManualTestRunStepInput) { return await manualTestRunService.updateStep(params); },
  async complete(params: CompleteManualTestRunInput) { return await manualTestRunService.completeRun(params); },
  async list(params: ListManualTestRunsInput) { return await manualTestRunService.listRuns(params); },
  async listForScenario(params: ListTestScenarioManualRunsInput) { return await manualTestRunService.listRuns(params); },
  async listActiveUsers() { return await userService.listActiveDirectory(); },
  async reassignExecutor(params: ReassignManualTestRunExecutorInput) { return await manualTestRunService.reassignExecutor(params); },
};
