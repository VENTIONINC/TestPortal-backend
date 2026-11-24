// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpTestScenarioHandler } from "@/handlers/mcpTestScenarioHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import {
  createTestScenarioSchema,
  appendTestScenarioStepSchema,
  deleteTestScenarioStepSchema,
  deleteTestScenarioSchema,
  getTestScenarioSchema,
  listTestScenariosSchema,
  updateTestScenarioSchema,
  updateTestScenarioStepSchema,
  reorderTestScenarioStepsSchema,
} from "@/mcp/schemas/testScenarioSchemas";
import type {
  MCPToolResponse,
  MCPToolSchema,
  TestScenarioResponse,
  TestScenarioMcpDeleteParams,
  TestScenarioMcpGetParams,
  TestScenarioMcpListParams,
  TestScenarioMcpUpdateParams,
  AppendTestScenarioStepParams,
  UpdateTestScenarioStepParams,
  DeleteTestScenarioStepParams,
  ReorderTestScenarioStepsParams,
} from "@/types";

export const createTestScenarioTool = (createdById: string) =>
  createMcpTool(
    "create-test-scenario",
    "Create a project-scoped Test Scenario with optional initial steps, low/medium/high priority and an absolute HTTP(S) related issue URL. The authenticated user is the creator. Omitted priority defaults to medium. The response includes the generated project-local TMS-N key and ordered steps. Omit scenarioKey and supply a non-null priority if choosing one. Other omitted metadata defaults to null.",
    createTestScenarioSchema,
    async (
      params: import("@/schemas/testScenarioSchemas").CreateTestScenarioInput,
    ): Promise<MCPToolResponse> => {
      const input = createTestScenarioSchema.parse(params);
      const scenario = await mcpTestScenarioHandler.createTestScenario({
        ...input,
        createdById,
      });
      return createSuccessResponse(scenario);
    },
    "creating Test Scenario",
  );

export const listTestScenarios = createMcpTool(
  "list-test-scenarios",
  "List lightweight Test Scenario summaries for a project. Global search and the independent scenarioKey, title, details, folder-path, and creator-name/email filters are combined before sorting and pagination using case-insensitive literal substring matching. The folder text filter matches the complete displayed path or Unfiled; folderId accepts a UUID or unfiled, includes descendants by default, and includeDescendants=false restricts to direct assignments. suiteId selects suite members. Resolve author names using the createdBy text filter, then pass createdById or createdByIds. Use priority to match one or more comma-separated values. Whitespace-only text filters are ignored. sortField supports scenarioKey, title, details, folder, createdBy, createdAt, and updatedAt; sortDirection defaults to desc. With no new sort, default ordering is createdAt DESC then id DESC. Legacy sort presets remain supported but cannot be combined with sortField. Filtering happens before pagination and totals count all matches. Markdown is available from testportal-get-test-scenario.",
  listTestScenariosSchema,
  async (params: TestScenarioMcpListParams): Promise<MCPToolResponse> => {
    const scenarios = await mcpTestScenarioHandler.listTestScenarios(params);
    return createSuccessResponse(scenarios);
  },
  "listing Test Scenarios",
);

export const getTestScenario = createMcpTool(
  "get-test-scenario",
  "Retrieve a complete project-scoped Test Scenario with structured fields, ordered steps, revision, nullable updater identity, current folder and suite metadata, generated Markdown metadata, and independently paginated Result and observed-Issue evidence.",
  getTestScenarioSchema,
  async (params: TestScenarioMcpGetParams): Promise<MCPToolResponse> => {
    const scenario = await mcpTestScenarioHandler.getTestScenario(params);
    return createSuccessResponse(scenario);
  },
  "fetching Test Scenario",
);

export const createUpdateTestScenarioTool = (actorId?: string) =>
  createMcpTool(
    "update-test-scenario",
    "Partially update structured fields on a project-scoped Test Scenario. At least one editable field is required; Omission preserves fields. Use null only for nullable fields. Priority accepts low, medium, or high. Use dedicated actions to edit steps, and omit the generated scenarioKey and Markdown.",
    updateTestScenarioSchema,
    async (params: TestScenarioMcpUpdateParams): Promise<MCPToolResponse> => {
      const scenario = await mcpTestScenarioHandler.updateTestScenario({
        ...params,
        ...(actorId ? { actorId } : {}),
      });
      return createSuccessResponse(scenario);
    },
    "updating Test Scenario",
  );

export const deleteTestScenario = createMcpTool(
  "delete-test-scenario",
  "Delete a project-scoped Test Scenario and its links while preserving linked Specs and execution evidence.",
  deleteTestScenarioSchema,
  async (params: TestScenarioMcpDeleteParams): Promise<MCPToolResponse> => {
    const result = await mcpTestScenarioHandler.deleteTestScenario(params);
    return createSuccessResponse(result);
  },
  "deleting Test Scenario",
);

// Unbound definition retained for schema/documentation consumers; runtime binds auth.
export const updateTestScenario = createUpdateTestScenarioTool();

const stepAction = <T extends { actorId?: string | undefined }>(
  name: string,
  description: string,
  schema: MCPToolSchema,
  run: (input: T) => Promise<TestScenarioResponse>,
  operation: string,
  actorId?: string,
) =>
  createMcpTool(
    name,
    description,
    schema,
    async (input: T) =>
      createSuccessResponse(
        await run(actorId === undefined ? input : { ...input, actorId }),
      ),
    operation,
  );

export const createAppendTestScenarioStepTool = (actorId?: string) =>
  stepAction<AppendTestScenarioStepParams>(
    "append-test-scenario-step",
    "Append a trimmed nonblank step to a project-scoped Test Scenario. The step ID is generated and the complete updated scenario is returned. Each call is atomic.",
    appendTestScenarioStepSchema,
    mcpTestScenarioHandler.appendTestScenarioStep,
    "appending Test Scenario step",
    actorId,
  );

export const createUpdateTestScenarioStepTool = (actorId?: string) =>
  stepAction<UpdateTestScenarioStepParams>(
    "update-test-scenario-step",
    "Update one scenario step by its saved UUID. Provide action and/or expectedResult; omitted fields are preserved and expectedResult may be null to clear it. Returns the complete updated scenario with the authenticated updater.",
    updateTestScenarioStepSchema,
    mcpTestScenarioHandler.updateTestScenarioStep,
    "updating Test Scenario step",
    actorId,
  );

export const createDeleteTestScenarioStepTool = (actorId?: string) =>
  stepAction<DeleteTestScenarioStepParams>(
    "delete-test-scenario-step",
    "Delete one identified scenario step and compact remaining positions. Returns the complete updated scenario.",
    deleteTestScenarioStepSchema,
    mcpTestScenarioHandler.deleteTestScenarioStep,
    "deleting Test Scenario step",
    actorId,
  );

export const createReorderTestScenarioStepsTool = (actorId?: string) =>
  stepAction<ReorderTestScenarioStepsParams>(
    "reorder-test-scenario-steps",
    "Reorder a scenario by supplying every current step UUID exactly once. Stale membership is rejected atomically; retrieve the current scenario and resubmit a complete order. An empty array is valid only when the scenario has no steps. Returns the complete updated scenario.",
    reorderTestScenarioStepsSchema,
    mcpTestScenarioHandler.reorderTestScenarioSteps,
    "reordering Test Scenario steps",
    actorId,
  );

export const appendTestScenarioStep = createAppendTestScenarioStepTool();
export const updateTestScenarioStep = createUpdateTestScenarioStepTool();
export const deleteTestScenarioStep = createDeleteTestScenarioStepTool();
export const reorderTestScenarioSteps = createReorderTestScenarioStepsTool();
