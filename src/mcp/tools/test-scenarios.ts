// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpTestScenarioHandler } from "@/handlers/mcpTestScenarioHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import {
  createTestScenarioSchema,
  deleteTestScenarioSchema,
  getTestScenarioSchema,
  listTestScenariosSchema,
  updateTestScenarioSchema,
} from "@/mcp/schemas/testScenarioSchemas";
import type {
  MCPToolResponse,
  TestScenarioMcpDeleteParams,
  TestScenarioMcpGetParams,
  TestScenarioMcpListParams,
  TestScenarioMcpUpdateParams,
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
  "List lightweight Test Scenario summaries for a project. Global search and the independent scenarioKey, title, details, folder-path, and creator-name/email filters are combined before sorting and pagination using case-insensitive literal substring matching. Folder filters match the complete displayed path or Unfiled; whitespace-only filters are ignored. sortField supports scenarioKey, title, details, folder, createdBy, createdAt, and updatedAt; sortDirection defaults to desc. With no new sort, default ordering is createdAt DESC then id DESC. Legacy sort presets remain supported but cannot be combined with sortField. Filtering happens before pagination and totals count all matches. Markdown is available from get-test-scenario.",
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
