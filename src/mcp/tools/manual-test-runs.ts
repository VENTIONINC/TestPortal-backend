// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpManualTestRunHandler as handler } from "@/handlers/mcpManualTestRunHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import * as schemas from "@/mcp/schemas/manualTestRunSchemas";
import type { MCPToolSchema } from "@/types";

const action = <T>(
  name: string,
  description: string,
  schema: MCPToolSchema,
  run: (params: T) => Promise<unknown>,
) =>
  createMcpTool(
    name,
    description,
    schema,
    async (params: T) => createSuccessResponse(await run(params)),
    name,
  );

export const createStartManualTestRunTool = (actorId: string) =>
  action(
    "testportal-start-manual-test-run",
    "Start a project-scoped manual run from scenarioIds or a suiteId. The session user starts the run. Returns saved scenario and step snapshots.",
    schemas.startManualTestRunSchema,
    (params: schemas.StartManualTestRunInput) => handler.start(params, actorId),
  );

export const createCompleteManualTestRunTool = (actorId: string) =>
  action(
    "testportal-complete-manual-test-run",
    "Complete an active run. Untested scenarios become skipped unless requireAllMarked is true. The session user is recorded as closer.",
    schemas.completeManualTestRunSchema,
    (params: schemas.CompleteManualTestRunInput) =>
      handler.complete(params, actorId),
  );

export const createUpdateManualTestRunResultTool = (actorId: string) =>
  action(
    "testportal-update-manual-test-run-scenario-result",
    "Record a result on an identified run scenario snapshot. The session user is attributed in result history.",
    schemas.updateManualTestRunResultSchema,
    (params: schemas.UpdateManualTestRunResultInput) =>
      handler.updateResult(params, actorId),
  );

export const manualTestRunTools = [
  action(
    "testportal-get-manual-test-run",
    "Read the saved run and its scenario and step snapshots.",
    schemas.getManualTestRunSchema,
    handler.get,
  ),
  action(
    "testportal-update-manual-test-run",
    "Update the run title, source scenario IDs and environment properties. Supply the full desired sets. Omitting an existing source ID removes its saved snapshot.",
    schemas.updateManualTestRunSchema,
    handler.update,
  ),
  action(
    "testportal-update-manual-test-run-step",
    "Record evidence on one run scenario step using comments and failure or blocked flags. Supply run snapshot IDs.",
    schemas.updateManualTestRunStepSchema,
    handler.updateStep,
  ),
  action(
    "testportal-list-manual-test-runs",
    "List project-scoped run history with search, status, period, time zone and pagination.",
    schemas.listManualTestRunsSchema,
    handler.list,
  ),
  action(
    "testportal-list-test-scenario-manual-runs",
    "List paginated run history containing snapshots of the supplied source scenario UUID.",
    schemas.listTestScenarioManualRunsSchema,
    handler.listForScenario,
  ),
  action(
    "testportal-list-active-users",
    "List active assignee candidates with id, name and email.",
    schemas.listActiveUsersSchema,
    () => handler.listActiveUsers(),
  ),
  action(
    "testportal-reassign-manual-test-run-executor",
    "Change the assignee of one run scenario snapshot. Use a live user UUID or null to clear.",
    schemas.reassignManualTestRunExecutorSchema,
    handler.reassignExecutor,
  ),
] as const;
