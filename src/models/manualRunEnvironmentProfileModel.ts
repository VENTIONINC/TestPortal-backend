// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0


import type { ManualRunEnvironmentProfile } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import type { ProfileCreateInput, ProfileUpdateInput } from "@/schemas/manualRunEnvironmentProfileSchemas";

export const manualRunEnvironmentProfileModel = {
  projectAccessible(projectId: string): Promise<boolean> {
    return dbClient.project.findUnique({ where: { id: projectId }, select: { id: true } }).then(Boolean);
  },
  list(projectId: string): Promise<ManualRunEnvironmentProfile[]> {
    return dbClient.manualRunEnvironmentProfile.findMany({ where: { projectId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  },
  create(projectId: string, ownerId: string, data: ProfileCreateInput): Promise<ManualRunEnvironmentProfile> {
    return dbClient.manualRunEnvironmentProfile.create({ data: { name: data.name, projectId, ownerId,
      ...(data.browser !== undefined ? { browser: data.browser } : {}),
      ...(data.operatingSystem !== undefined ? { operatingSystem: data.operatingSystem } : {}),
      ...(data.device !== undefined ? { device: data.device } : {}),
      ...(data.apiEnvironment !== undefined ? { apiEnvironment: data.apiEnvironment } : {}),
    } });
  },
  update(projectId: string, profileId: string, data: ProfileUpdateInput): Promise<ManualRunEnvironmentProfile | null> {
    return dbClient.manualRunEnvironmentProfile.updateManyAndReturn({ where: { id: profileId, projectId }, data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.browser !== undefined ? { browser: data.browser } : {}),
      ...(data.operatingSystem !== undefined ? { operatingSystem: data.operatingSystem } : {}),
      ...(data.device !== undefined ? { device: data.device } : {}),
      ...(data.apiEnvironment !== undefined ? { apiEnvironment: data.apiEnvironment } : {}),
    } }).then((rows) => rows[0] ?? null);
  },
  async remove(projectId: string, profileId: string): Promise<boolean> {
    const result = await dbClient.manualRunEnvironmentProfile.deleteMany({ where: { id: profileId, projectId } });
    return result.count > 0;
  },
};
