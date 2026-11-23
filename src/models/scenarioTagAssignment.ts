// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { z } from "zod";
import type { assignmentBody } from "@/schemas/scenarioTagSchemas";
import {
  lockScenarios,
  withScenarioTransaction,
} from "@/models/testScenarioTransactions";
import { OrganizationError } from "@/models/testScenarioOrganizationErrors";

import type { ScenarioTagSummary } from "@/types/testScenarios";

async function createOrReuse(
  tx: Prisma.TransactionClient,
  projectId: string,
  name: string,
): Promise<ScenarioTagSummary> {
  const rows = await tx.$queryRaw<ScenarioTagSummary[]>(Prisma.sql`
    INSERT INTO "ScenarioTag" (id,"projectId",name) VALUES (${randomUUID()}::uuid,${projectId}::uuid,${name})
    ON CONFLICT ("projectId","normalizedName") DO UPDATE SET name = "ScenarioTag".name
    RETURNING id,name,description
  `);
  const tag = rows[0];
  if (!tag) throw new Error("Tag upsert returned no row");
  return tag;
}
export function inlineScenarioTag(projectId: string, name: string) {
  return withScenarioTransaction(async (tx) => {
    if (
      !(await tx.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      }))
    )
      throw new OrganizationError("Project not found", 404);
    return createOrReuse(tx, projectId, name);
  });
}
export function assignScenarioTag(
  projectId: string,
  input: z.infer<typeof assignmentBody>,
) {
  return withScenarioTransaction(async (tx) => {
    const scenarioIds = [...new Set(input.scenarioIds)];
    await lockScenarios(tx, projectId, scenarioIds);
    const tag =
      "name" in input
        ? await createOrReuse(tx, projectId, input.name)
        : await tx.scenarioTag.findFirst({
            where: { projectId, id: input.tagId },
            select: { id: true, name: true, description: true },
          });
    if (!tag) throw new OrganizationError("Tag not found", 404);
    if (input.present) {
      await tx.scenarioTagAssignment.createMany({
        data: scenarioIds.map((scenarioId) => ({
          scenarioId,
          projectId,
          tagId: tag.id,
        })),
        skipDuplicates: true,
      });
    } else {
      await tx.scenarioTagAssignment.deleteMany({
        where: { projectId, tagId: tag.id, scenarioId: { in: scenarioIds } },
      });
    }
    return tag;
  });
}

export function selectionTagCounts(projectId: string, scenarioIds: string[]) {
  return withScenarioTransaction(async (tx) => {
    const ids = [...new Set(scenarioIds)];
    if (
      (await tx.testScenario.count({
        where: { projectId, id: { in: ids } },
      })) !== ids.length
    )
      throw new OrganizationError("Scenario not found in project", 404);
    const counts = await tx.scenarioTagAssignment.groupBy({
      by: ["tagId"],
      where: { projectId, scenarioId: { in: ids } },
      _count: true,
    });
    return Object.fromEntries(counts.map((row) => [row.tagId, row._count]));
  });
}
