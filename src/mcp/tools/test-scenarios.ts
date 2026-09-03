// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpTestScenarioHandler } from "@/handlers/mcpTestScenarioHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import {
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

export const listTestScenarios = createMcpTool(
  "list-test-scenarios",
  "List compact Test Scenario summaries for a project. Markdown is available from get-test-scenario.",
  listTestScenariosSchema,
  async (params: TestScenarioMcpListParams): Promise<MCPToolResponse> => {
    const scenarios = await mcpTestScenarioHandler.listTestScenarios(params);
    return createSuccessResponse(scenarios);
  },
  "listing Test Scenarios",
);

export const getTestScenario = createMcpTool(
  "get-test-scenario",
  "Retrieve a complete project-scoped Test Scenario with raw Markdown and independently paginated Result and observed-Issue evidence.",
  getTestScenarioSchema,
  async (params: TestScenarioMcpGetParams): Promise<MCPToolResponse> => {
    const scenario = await mcpTestScenarioHandler.getTestScenario(params);
    return createSuccessResponse(scenario);
  },
  "fetching Test Scenario",
);

export const updateTestScenario = createMcpTool(
  "update-test-scenario",
  "Partially update a project-scoped Test Scenario title, Markdown, or both. At least one editable field is required.",
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
