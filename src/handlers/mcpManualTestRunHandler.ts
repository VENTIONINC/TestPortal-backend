// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { manualTestRunCreationService } from "@/services/manualTestRunCreationService";
import { manualTestRunHistoryService } from "@/services/manualTestRunHistoryService";
import { manualTestRunLifecycleService } from "@/services/manualTestRunLifecycleService";
import { manualTestRunMutationService } from "@/services/manualTestRunMutationService";
import { userService } from "@/services/userService";
import type {
  CompleteManualTestRunInput,
  GetManualTestRunInput,
  ListManualTestRunsInput,
  ListTestScenarioManualRunsInput,
  ReassignManualTestRunExecutorInput,
  StartManualTestRunInput,
  UpdateManualTestRunInput,
  UpdateManualTestRunResultInput,
  UpdateManualTestRunStepInput,
} from "@/mcp/schemas/manualTestRunSchemas";

export const mcpManualTestRunHandler = {
  async start(params: StartManualTestRunInput, executedById: string) {
    return await manualTestRunCreationService.createRun({
      ...params,
      executedById,
    });
  },
  async get(params: GetManualTestRunInput) {
    return await manualTestRunHistoryService.getRun(params);
  },
  async update(params: UpdateManualTestRunInput) {
    return await manualTestRunMutationService.updateDetails(params);
  },
  async updateStep({
    projectId,
    runId,
    scenarioId,
    stepId,
    ...evidence
  }: UpdateManualTestRunStepInput) {
    return await manualTestRunMutationService.updateScenarioEvidence({
      projectId,
      runId,
      scenarioId,
      steps: [{ id: stepId, ...evidence }],
    });
  },
  async updateResult(
    params: UpdateManualTestRunResultInput,
    resultById: string,
  ) {
    return await manualTestRunMutationService.updateResult({
      ...params,
      resultById,
    });
  },
  async complete(
    { requireAllMarked, ...scope }: CompleteManualTestRunInput,
    completedById: string,
  ) {
    return await manualTestRunLifecycleService.completeRun({
      ...scope,
      completedById,
      ...(requireAllMarked !== undefined ? { requireAllMarked } : {}),
    });
  },
  async list(params: ListManualTestRunsInput) {
    return await manualTestRunHistoryService.listRuns(params);
  },
  async listForScenario({
    scenarioId,
    ...params
  }: ListTestScenarioManualRunsInput) {
    return await manualTestRunHistoryService.listRuns({
      ...params,
      sourceScenarioId: scenarioId,
    });
  },
  async listActiveUsers() {
    return await userService.listActiveDirectory();
  },
  async reassignExecutor(params: ReassignManualTestRunExecutorInput) {
    return await manualTestRunMutationService.updateAssignee(params);
  },
};
