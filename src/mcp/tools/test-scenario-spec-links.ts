// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpTestScenarioSpecLinkHandler as handler } from "@/handlers/mcpTestScenarioSpecLinkHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import {
  listSpecLinksSchema,
  mutateSpecLinkSchema,
  type ListSpecLinksActionInput,
  type MutateSpecLinkActionInput,
} from "@/mcp/schemas/testScenarioSpecLinkSchemas";

export const listTestScenarioSpecLinks = createMcpTool(
  "list-test-scenario-spec-links",
  "List the Specs explicitly linked to a project scenario.",
  listSpecLinksSchema,
  async (input: ListSpecLinksActionInput) =>
    createSuccessResponse(await handler.list(input)),
  "listing scenario Spec links",
);
export const addTestScenarioSpecLink = createMcpTool(
  "add-test-scenario-spec-link",
  "Link an existing project Spec to a scenario; duplicate links fail.",
  mutateSpecLinkSchema,
  async (input: MutateSpecLinkActionInput) =>
    createSuccessResponse(await handler.add(input)),
  "adding scenario Spec link",
);
export const removeTestScenarioSpecLink = createMcpTool(
  "remove-test-scenario-spec-link",
  "Remove one scenario–Spec association while preserving Specs and execution evidence.",
  mutateSpecLinkSchema,
  async (input: MutateSpecLinkActionInput) =>
    createSuccessResponse(await handler.remove(input)),
  "removing scenario Spec link",
);
