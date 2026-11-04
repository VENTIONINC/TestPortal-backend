// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpManualTestRunHandler } from "@/handlers/mcpManualTestRunHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import {
  completeManualTestRunSchema, getManualTestRunSchema, listActiveUsersSchema,
  listManualTestRunsSchema, listTestScenarioManualRunsSchema,
  reassignManualTestRunExecutorSchema, startManualTestRunSchema,
  updateManualTestRunSchema, updateManualTestRunStepSchema,
} from "@/mcp/schemas/manualTestRunSchemas";
import type { MCPToolResponse } from "@/types";
import type {
  CompleteManualTestRunInput, GetManualTestRunInput, ListManualTestRunsInput,
  ListTestScenarioManualRunsInput, ReassignManualTestRunExecutorInput,
  StartManualTestRunInput, UpdateManualTestRunInput, UpdateManualTestRunStepInput,
} from "@/mcp/schemas/manualTestRunSchemas";

export const createStartManualTestRunTool = (executedById: string) => createMcpTool(
  "testportal-start-manual-test-run",
  "Start a new project-scoped manual run from a saved Test Scenario. Executor identity comes from the authenticated session. Returns the authoritative snapshot and independent run-step IDs; this records human execution and does not execute browser/API tests.",
  startManualTestRunSchema,
  async (params: StartManualTestRunInput): Promise<MCPToolResponse> => createSuccessResponse(await mcpManualTestRunHandler.start(params, executedById)),
  "starting manual test run",
);

export const getManualTestRun = createMcpTool("testportal-get-manual-test-run", "Get authoritative saved run snapshot, step outcomes, environment and safe nullable executor details within a project.", getManualTestRunSchema, async (params: GetManualTestRunInput) => createSuccessResponse(await mcpManualTestRunHandler.get(params)), "fetching manual test run");
export const updateManualTestRun = createMcpTool("testportal-update-manual-test-run", "Update notes and/or runKey on an active run. Status is not accepted; use the dedicated completion tool. Completed runs allow runKey-only updates.", updateManualTestRunSchema, async (params: UpdateManualTestRunInput) => createSuccessResponse(await mcpManualTestRunHandler.update(params)), "updating manual test run");
export const updateManualTestRunStep = createMcpTool("testportal-update-manual-test-run-step", "Record a status and/or notes for a step identified by its ID in the run snapshot. Returns complete updated run detail.", updateManualTestRunStepSchema, async (params: UpdateManualTestRunStepInput) => createSuccessResponse(await mcpManualTestRunHandler.updateStep(params)), "updating manual test run step");
export const completeManualTestRun = createMcpTool("testportal-complete-manual-test-run", "Explicitly complete an active run as passed, failed, blocked or skipped. Passing completion validates recorded steps; completion freezes execution data.", completeManualTestRunSchema, async (params: CompleteManualTestRunInput) => createSuccessResponse(await mcpManualTestRunHandler.complete(params)), "completing manual test run");
export const listManualTestRuns = createMcpTool("testportal-list-manual-test-runs", "List lightweight project-scoped run history with optional source scenario/key, status and date filters. Numeric page/limit default to 1/30 and limit is capped at 100.", listManualTestRunsSchema, async (params: ListManualTestRunsInput) => createSuccessResponse(await mcpManualTestRunHandler.list(params)), "listing manual test runs");
export const listTestScenarioManualRuns = createMcpTool("testportal-list-test-scenario-manual-runs", "List lightweight history for a live project-scoped Test Scenario with status/date filters and numeric pagination.", listTestScenarioManualRunsSchema, async (params: ListTestScenarioManualRunsInput) => createSuccessResponse(await mcpManualTestRunHandler.listForScenario(params)), "listing Test Scenario manual runs");
export const listActiveUsers = createMcpTool("testportal-list-active-users", "List active executor candidates with only id, name and email in deterministic order. Requires no project ID.", listActiveUsersSchema, async () => createSuccessResponse(await mcpManualTestRunHandler.listActiveUsers()), "listing active users");
export const reassignManualTestRunExecutor = createMcpTool("testportal-reassign-manual-test-run-executor", "Reassign a project-scoped run to an existing active user. Updates executor and run updatedAt only; this is not executor-only authorization.", reassignManualTestRunExecutorSchema, async (params: ReassignManualTestRunExecutorInput) => createSuccessResponse(await mcpManualTestRunHandler.reassignExecutor(params)), "reassigning manual test run executor");

export const manualTestRunTools = [getManualTestRun, updateManualTestRun, updateManualTestRunStep, completeManualTestRun, listManualTestRuns, listTestScenarioManualRuns, listActiveUsers, reassignManualTestRunExecutor] as const;
