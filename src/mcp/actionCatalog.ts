// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { MCPToolSchema } from "@/types";
import { actionAreas } from "@/mcp/actionMetadata";
import { statusCheck } from "@/mcp/tools/status-check";
import { currentTime } from "@/mcp/tools/current-time";
import { getAvailableProjects } from "@/mcp/tools/projects";
import { getIssues, getIssueById, createIssue } from "@/mcp/tools/issues";
import {
  getResults,
  getResultById,
  getResultsStats,
} from "@/mcp/tools/results";
import {
  createAssumption,
  createUpdateAssumptionTool,
  getAssumptionById,
} from "@/mcp/tools/assumptions";
import { getExecutionById } from "@/mcp/tools/executions";
import {
  assignIssue,
  reviewError,
  bulkReview,
  getResultErrorById,
} from "@/mcp/tools/result-errors";
import { getSpecById } from "@/mcp/tools/specs";
import {
  createTestScenarioTool,
  listTestScenarios,
  getTestScenario,
  updateTestScenario,
  deleteTestScenario,
  appendTestScenarioStep,
  updateTestScenarioStep,
  deleteTestScenarioStep,
  reorderTestScenarioSteps,
} from "@/mcp/tools/test-scenarios";
import {
  createStartManualTestRunTool,
  manualTestRunTools,
} from "@/mcp/tools/manual-test-runs";
import {
  createProfileTool,
  profileTools,
} from "@/mcp/tools/manual-run-environment-profiles";

import { organizationTools } from "@/mcp/tools/test-scenario-organization";

export type ActionTool = readonly [
  string,
  string,
  MCPToolSchema,
  (input: never) => Promise<unknown>,
];

/** Explicit allowlist, created separately for each authenticated session. */
export const createActionCatalog = (
  userId: string,
): Map<string, ActionTool> => {
  const tools: ActionTool[] = [
    statusCheck,
    currentTime,
    getAvailableProjects,
    getIssues,
    getIssueById,
    createIssue,
    getResults,
    getResultById,
    getResultsStats,
    createAssumption,
    createUpdateAssumptionTool(userId),
    getAssumptionById,
    getExecutionById,
    assignIssue,
    reviewError,
    bulkReview,
    getResultErrorById,
    getSpecById,
    createTestScenarioTool(userId),
    listTestScenarios,
    getTestScenario,
    updateTestScenario,
    deleteTestScenario,
    appendTestScenarioStep,
    updateTestScenarioStep,
    deleteTestScenarioStep,
    reorderTestScenarioSteps,
    createStartManualTestRunTool(userId),
    ...manualTestRunTools,
    createProfileTool(userId),
    ...profileTools,
    ...organizationTools,
  ];
  const catalog = indexActions(tools);
  for (const id of catalog.keys()) actionAreas(id);
  return catalog;
};

export const indexActions = (
  tools: readonly ActionTool[],
): Map<string, ActionTool> => {
  const actions = new Map<string, ActionTool>();
  for (const tool of tools) {
    if (actions.has(tool[0]))
      throw new Error(`Duplicate MCP action: ${tool[0]}`);
    actions.set(tool[0], tool);
  }
  return actions;
};
