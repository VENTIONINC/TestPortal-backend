// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mcpManualRunEnvironmentProfileHandler as handler } from "@/handlers/mcpManualRunEnvironmentProfileHandler";
import { createMcpTool, createSuccessResponse } from "@/mcp/helpers/mcpHelpers";
import { listProfileSchema, createProfileSchema, updateProfileSchema, deleteProfileSchema } from "@/mcp/schemas/manualRunEnvironmentProfileSchemas";
import type { ListProfileInput, CreateProfileInput, UpdateProfileInput, DeleteProfileInput } from "@/mcp/schemas/manualRunEnvironmentProfileSchemas";

export const createProfileTool = (ownerId: string) => createMcpTool("testportal-create-manual-run-environment-profile", "Create a shared project environment profile; creator comes from the authenticated session.", createProfileSchema, async (input: CreateProfileInput) => createSuccessResponse(await handler.create(input, ownerId)), "creating environment profile");
export const listProfileTool = createMcpTool("testportal-list-manual-run-environment-profiles", "List shared project environment profiles in newest-first order.", listProfileSchema, async (input: ListProfileInput) => createSuccessResponse(await handler.list(input)), "listing environment profiles");
export const updateProfileTool = createMcpTool("testportal-update-manual-run-environment-profile", "Partially update a shared project environment profile.", updateProfileSchema, async (input: UpdateProfileInput) => createSuccessResponse(await handler.update(input)), "updating environment profile");
export const deleteProfileTool = createMcpTool("testportal-delete-manual-run-environment-profile", "Delete a shared project environment profile without changing saved runs.", deleteProfileSchema, async (input: DeleteProfileInput) => createSuccessResponse(await handler.remove(input)), "deleting environment profile");
export const profileTools = [listProfileTool, updateProfileTool, deleteProfileTool] as const;

