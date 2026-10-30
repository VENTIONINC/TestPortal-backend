// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpTestScenarioOrganizationHandler as handler } from "@/handlers/mcpTestScenarioOrganizationHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import * as schemas from "@/mcp/schemas/testScenarioOrganizationSchemas";

const action = <T>(
  name: string,
  description: string,
  schema: import("@/types").MCPToolSchema,
  run: (input: T) => Promise<unknown>,
) =>
  createMcpTool(
    name,
    description,
    schema,
    async (input: T) => createSuccessResponse(await run(input)),
    name,
  );

export const organizationTools = [
  action(
    "list-test-scenario-folders",
    "List the project folder tree with direct scenario counts.",
    schemas.listOrganizationSchema,
    handler.listFolders,
  ),
  action(
    "create-test-scenario-folder",
    "Create a root or child folder; names are 1–200 characters and position is nonnegative.",
    schemas.createFolderSchema,
    handler.createFolder,
  ),
  action(
    "update-test-scenario-folder",
    "Rename, move or reorder a folder; provide at least one editable field. Null parentId moves to root.",
    schemas.updateFolderSchema,
    handler.updateFolder,
  ),
  action(
    "delete-test-scenario-folder",
    "Delete a folder, promote children and reassign direct scenarios to parent or unfiled as specified by disposition.",
    schemas.deleteFolderSchema,
    handler.deleteFolder,
  ),
  action(
    "move-test-scenarios-to-folder",
    "Atomically move 1–100 distinct scenarios to a folder or null for Unfiled.",
    schemas.moveScenariosSchema,
    handler.moveScenarios,
  ),
  action(
    "list-test-suites",
    "List project suites and their ordered members.",
    schemas.listOrganizationSchema,
    handler.listSuites,
  ),
  action(
    "get-test-suite",
    "Get a project suite and its ordered members.",
    schemas.getSuiteSchema,
    handler.getSuite,
  ),
  action(
    "create-test-suite",
    "Create a suite with optional nullable description, purpose and current release label.",
    schemas.createSuiteSchema,
    handler.createSuite,
  ),
  action(
    "update-test-suite",
    "Update suite metadata; omitted fields remain unchanged and null clears optional metadata.",
    schemas.updateSuiteSchema,
    handler.updateSuite,
  ),
  action(
    "delete-test-suite",
    "Delete a suite and memberships while preserving scenarios.",
    schemas.getSuiteSchema,
    handler.deleteSuite,
  ),
  action(
    "add-test-suite-members",
    "Atomically add 1–100 distinct project scenario IDs; existing members are unchanged.",
    schemas.mutateMembersSchema,
    handler.addMembers,
  ),
  action(
    "remove-test-suite-members",
    "Atomically remove 1–100 distinct project scenario IDs; non-members are unchanged.",
    schemas.mutateMembersSchema,
    handler.removeMembers,
  ),
  action(
    "reorder-test-suite-members",
    "Supply every current member scenario ID exactly once in the desired order; an empty suite accepts an empty array.",
    schemas.reorderMembersSchema,
    handler.reorderMembers,
  ),
];
