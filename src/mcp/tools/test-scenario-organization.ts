// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { z } from "zod/v3";
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

export const createOrganizationTools = (updatedById?: string) => [
  action(
    "list-test-scenario-folders",
    "List the project folder tree with saved descriptions and direct scenario counts. Resolve the full path to a folder UUID before moving scenarios.",
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
    "Delete a folder and all its descendants. Scenarios from the deleted tree move to Unfiled with the authenticated updater. Suite memberships and run history are preserved.",
    schemas.deleteFolderSchema,
    (input: z.infer<typeof schemas.deleteFolderSchema>) =>
      handler.deleteFolder({
        ...input,
        ...(updatedById === undefined ? {} : { updatedById }),
      }),
  ),
  action(
    "move-test-scenarios-to-folder",
    "Atomically move 1–100 distinct scenarios to an existing folder UUID or null for Unfiled. Read scenario detail to verify the saved folder, revision, and authenticated updater.",
    schemas.moveScenariosSchema,
    (input: z.infer<typeof schemas.moveScenariosSchema>) =>
      handler.moveScenarios({
        ...input,
        ...(updatedById === undefined ? {} : { updatedById }),
      }),
  ),
  action(
    "list-test-suites",
    "List project suites and their ordered members. Names may repeat; use metadata and suite UUIDs to identify the intended suite.",
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
    (input: z.infer<typeof schemas.getSuiteSchema>) =>
      handler.deleteSuite(input, updatedById),
  ),
  action(
    "add-test-suite-members",
    "Atomically add 1–100 distinct project scenario IDs; existing members are unchanged.",
    schemas.mutateMembersSchema,
    (input: z.infer<typeof schemas.mutateMembersSchema>) =>
      handler.addMembers({
        ...input,
        ...(updatedById === undefined ? {} : { updatedById }),
      }),
  ),
  action(
    "remove-test-suite-members",
    "Atomically remove 1–100 distinct project scenario IDs; non-members are unchanged.",
    schemas.mutateMembersSchema,
    (input: z.infer<typeof schemas.mutateMembersSchema>) =>
      handler.removeMembers({
        ...input,
        ...(updatedById === undefined ? {} : { updatedById }),
      }),
  ),
  action(
    "reorder-test-suite-members",
    "Supply every current member scenario ID exactly once in the desired order; an empty suite accepts an empty array.",
    schemas.reorderMembersSchema,
    handler.reorderMembers,
  ),
];

export const organizationTools = createOrganizationTools();
