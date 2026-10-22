// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0


import { manualRunEnvironmentProfileModel } from "@/models/manualRunEnvironmentProfileModel";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/schemas/manualRunEnvironmentProfileSchemas";

export class ProfileNotFoundError extends Error {}

async function assertProject(projectId: string): Promise<void> {
  if (!(await manualRunEnvironmentProfileModel.projectAccessible(projectId))) {
    throw new ProfileNotFoundError("Project not found");
  }
}

export const manualRunEnvironmentProfileService = {
  async list(projectId: string) {
    await assertProject(projectId);
    return manualRunEnvironmentProfileModel.list(projectId);
  },
  async create(projectId: string, ownerId: string, data: ProfileCreateInput) {
    await assertProject(projectId);
    return manualRunEnvironmentProfileModel.create(projectId, ownerId, data);
  },
  async update(projectId: string, profileId: string, data: ProfileUpdateInput) {
    await assertProject(projectId);
    const profile = await manualRunEnvironmentProfileModel.update(projectId, profileId, data);
    if (!profile) throw new ProfileNotFoundError("Profile not found");
    return profile;
  },
  async remove(projectId: string, profileId: string) {
    await assertProject(projectId);
    if (!(await manualRunEnvironmentProfileModel.remove(projectId, profileId))) {
      throw new ProfileNotFoundError("Profile not found");
    }
  },
};
