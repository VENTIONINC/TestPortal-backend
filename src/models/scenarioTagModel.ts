// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";

const select = {
  id: true,
  name: true,
  description: true,
  _count: { select: { assignments: true } },
} as const;
type TagWithCount = Prisma.ScenarioTagGetPayload<{ select: typeof select }>;
function withUsage({ _count, ...tag }: TagWithCount) {
  return { ...tag, usageCount: _count.assignments };
}

export const scenarioTagModel = {
  async list(projectId: string) {
    const rows = await dbClient.scenarioTag.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      select,
    });
    return rows.map(withUsage);
  },
  async create(projectId: string, name: string, description: string) {
    return withUsage(
      await dbClient.scenarioTag.create({
        data: { projectId, name, description },
        select,
      }),
    );
  },
  async edit(
    projectId: string,
    id: string,
    name: string,
    description?: string,
  ) {
    return withUsage(
      await dbClient.scenarioTag.update({
        where: { projectId_id: { projectId, id } },
        data: { name, ...(description !== undefined && { description }) },
        select,
      }),
    );
  },
  async matchingName(projectId: string, name: string) {
    const rows = await dbClient.$queryRaw<{ name: string }[]>`
      SELECT name FROM "ScenarioTag" WHERE "projectId" = ${projectId}::uuid AND "normalizedName" = lower(${name})
    `;
    return rows[0]?.name;
  },
};
