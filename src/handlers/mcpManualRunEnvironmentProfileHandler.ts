// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { manualRunEnvironmentProfileService } from "@/services/manualRunEnvironmentProfileService";
import type { ListProfileInput, CreateProfileInput, UpdateProfileInput, DeleteProfileInput } from "@/mcp/schemas/manualRunEnvironmentProfileSchemas";

export const mcpManualRunEnvironmentProfileHandler = {
  async list({ projectId }: ListProfileInput) { return await manualRunEnvironmentProfileService.list(projectId); },
  async create({ projectId, ...data }: CreateProfileInput, ownerId: string) { return await manualRunEnvironmentProfileService.create(projectId, ownerId, data); },
  async update({ projectId, profileId, ...data }: UpdateProfileInput) { return await manualRunEnvironmentProfileService.update(projectId, profileId, data); },
  async remove({ projectId, profileId }: DeleteProfileInput) {
    await manualRunEnvironmentProfileService.remove(projectId, profileId);
    return { projectId, profileId, deleted: true as const };
  },
};

