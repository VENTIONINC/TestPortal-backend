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
    "Create a project-scoped Test Scenario with optional initial steps, nullable low/medium/high priority and an absolute HTTP(S) related issue URL. The authenticated user is the creator. Omitted metadata defaults to null.",
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
  "List lightweight Test Scenario summaries for a project. Global search and the independent scenarioKey, title, details, folder-path, and creator-name/email filters are combined before sorting and pagination using case-insensitive literal substring matching. The folder text filter matches the complete displayed path or Unfiled; folderId accepts a UUID or unfiled, includes descendants by default, and includeDescendants=false restricts to direct assignments. suiteId selects suite members; whitespace-only filters are ignored. sortField supports scenarioKey, title, details, folder, createdBy, createdAt, and updatedAt; sortDirection defaults to desc. With no new sort, default ordering is createdAt DESC then id DESC. Legacy sort presets remain supported but cannot be combined with sortField. Filtering happens before pagination and totals count all matches. Markdown is available from testportal-get-test-scenario.",
  listTestScenariosSchema,
  async (params: TestScenarioMcpListParams): Promise<MCPToolResponse> => {
    const scenarios = await mcpTestScenarioHandler.listTestScenarios(params);
    return createSuccessResponse(scenarios);
  },
  "listing Test Scenarios",
);

export const getTestScenario = createMcpTool(
  "get-test-scenario",
  "Retrieve a complete project-scoped Test Scenario with structured fields, ordered steps, generated Markdown metadata, and independently paginated Result and observed-Issue evidence.",
  getTestScenarioSchema,
  async (params: TestScenarioMcpGetParams): Promise<MCPToolResponse> => {
    const scenario = await mcpTestScenarioHandler.getTestScenario(params);
    return createSuccessResponse(scenario);
  },
  "fetching Test Scenario",
);

export const updateTestScenario = createMcpTool(
  "update-test-scenario",
  "Partially update structured fields on a project-scoped Test Scenario. At least one editable field is required; optional fields are trimmed, null clears them, and omitted fields are preserved. Generated Markdown and steps are read-only here.",
  updateTestScenarioSchema,
  async (params: TestScenarioMcpUpdateParams): Promise<MCPToolResponse> => {
    const scenario = await mcpTestScenarioHandler.updateTestScenario(params);
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

export const appendTestScenarioStep = createMcpTool(
  "append-test-scenario-step",
  "Append a trimmed nonblank step to a project-scoped Test Scenario. The step ID is generated and the complete updated scenario is returned. Each call is atomic.",
  appendTestScenarioStepSchema,
  async (params: AppendTestScenarioStepParams): Promise<MCPToolResponse> =>
    createSuccessResponse(
      await mcpTestScenarioHandler.appendTestScenarioStep(params),
    ),
  "appending Test Scenario step",
);

export const updateTestScenarioStep = createMcpTool(
  "update-test-scenario-step",
  "Update one identified scenario step. Provide action and/or expectedResult; omitted fields are preserved and expectedResult may be null to clear it. Text must be nonblank after trimming. Returns the complete updated scenario.",
  updateTestScenarioStepSchema,
  async (params: UpdateTestScenarioStepParams): Promise<MCPToolResponse> =>
    createSuccessResponse(
      await mcpTestScenarioHandler.updateTestScenarioStep(params),
    ),
  "updating Test Scenario step",
);

export const deleteTestScenarioStep = createMcpTool(
  "delete-test-scenario-step",
  "Delete one identified scenario step and compact remaining positions. Returns the complete updated scenario.",
  deleteTestScenarioStepSchema,
  async (params: DeleteTestScenarioStepParams): Promise<MCPToolResponse> =>
    createSuccessResponse(
      await mcpTestScenarioHandler.deleteTestScenarioStep(params),
    ),
  "deleting Test Scenario step",
);

export const reorderTestScenarioSteps = createMcpTool(
  "reorder-test-scenario-steps",
  "Reorder a scenario by supplying every current step UUID exactly once. Stale membership is rejected atomically; retrieve the current scenario and resubmit a complete order. An empty array is valid only when the scenario has no steps. Returns the complete updated scenario.",
  reorderTestScenarioStepsSchema,
  async (params: ReorderTestScenarioStepsParams): Promise<MCPToolResponse> =>
    createSuccessResponse(
      await mcpTestScenarioHandler.reorderTestScenarioSteps(params),
    ),
  "reordering Test Scenario steps",
);
