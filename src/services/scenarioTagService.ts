// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import type { z } from "zod";
import { projectModel } from "@/models/projectModel";
import { scenarioTagModel } from "@/models/scenarioTagModel";
import { OrganizationError } from "@/models/testScenarioOrganizationErrors";
import type { tagFields } from "@/schemas/scenarioTagSchemas";

export async function listProjectTags(projectId: string) {
  if (!(await projectModel.exists(projectId)))
    throw new OrganizationError("Project not found", 404);
  return scenarioTagModel.list(projectId);
}

export async function saveProjectTag(
  projectId: string,
  fields: z.infer<typeof tagFields>,
  tagId?: string,
) {
  const { name, description } = fields;
  try {
    if (tagId)
      return await scenarioTagModel.edit(projectId, tagId, name, description);
    return await scenarioTagModel.create(projectId, name, description ?? "");
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
    if (error.code === "P2002") {
      const duplicate = await scenarioTagModel.matchingName(projectId, name);
      throw new OrganizationError(
        `A tag named "${duplicate ?? name}" already exists. Tag names are not case-sensitive.`,
        409,
      );
    }
    if (error.code === "P2025" || error.code === "P2003")
      throw new OrganizationError("Project or tag not found", 404);
    throw error;
  }
}
