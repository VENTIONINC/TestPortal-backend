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
      await tx.$executeRaw`
        INSERT INTO "ScenarioTagAssignment" ("projectId", "scenarioId", "tagId")
        SELECT ${projectId}::uuid, id, ${tag.id}::uuid FROM unnest(${scenarioIds}::uuid[]) AS selected(id)
        ON CONFLICT ("scenarioId", "tagId") DO NOTHING
      `;
    } else {
      await tx.$executeRaw`
        DELETE FROM "ScenarioTagAssignment"
        WHERE "projectId" = ${projectId}::uuid AND "tagId" = ${tag.id}::uuid
          AND "scenarioId" = ANY(${scenarioIds}::uuid[])
      `;
    }
    return tag;
  });
}

export function selectionTagCounts(projectId: string, scenarioIds: string[]) {
  return withScenarioTransaction(async (tx) => {
    const ids = [...new Set(scenarioIds)];
    const [selection] = await tx.$queryRaw<Array<{ count: number }>>`
      SELECT count(*)::int AS count FROM "TestScenario"
      WHERE "projectId" = ${projectId}::uuid AND id = ANY(${ids}::uuid[])
    `;
    if (selection?.count !== ids.length)
      throw new OrganizationError("Scenario not found in project", 404);
    const counts = await tx.$queryRaw<Array<{ tagId: string; count: number }>>`
      SELECT "tagId", count(*)::int AS count FROM "ScenarioTagAssignment"
      WHERE "projectId" = ${projectId}::uuid AND "scenarioId" = ANY(${ids}::uuid[])
      GROUP BY "tagId"
    `;
    return Object.fromEntries(counts.map(({ tagId, count }) => [tagId, count]));
  });
}
