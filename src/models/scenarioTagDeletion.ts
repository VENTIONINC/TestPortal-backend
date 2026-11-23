// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { withScenarioTransaction } from "@/models/testScenarioTransactions";
import { OrganizationError } from "@/models/testScenarioOrganizationErrors";

const tagSnapshot = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    position: z.number(),
    assignments: z.array(z.object({ scenarioId: z.string() })),
  }),
);
async function impact(
  tx: Prisma.TransactionClient,
  projectId: string,
  tagIds: string[],
) {
  const tags = await tx.scenarioTag.findMany({
    where: { projectId, id: { in: tagIds } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      position: true,
      assignments: {
        select: { scenarioId: true },
        orderBy: { scenarioId: "asc" },
      },
    },
  });
  if (tags.length !== new Set(tagIds).size)
    throw new OrganizationError("Tag not found", 404);
  const revision = createHash("sha256")
    .update(JSON.stringify(tagSnapshot.parse(tags)))
    .digest("hex");
  return {
    tags,
    revision,
    affectedCount: new Set(
      tags.flatMap((t) => t.assignments.map((a) => a.scenarioId)),
    ).size,
  };
}
export function previewTagDeletion(projectId: string, tagIds: string[]) {
  return withScenarioTransaction(async (tx) => {
    const { affectedCount, revision } = await impact(tx, projectId, tagIds);
    return { affectedCount, revision };
  });
}
export function deleteScenarioTags(
  projectId: string,
  actorId: string,
  tagIds: string[],
  revision: string,
  operationId: string,
) {
  return withScenarioTransaction(async (tx) => {
    // Claim the retry identifier before taking the snapshot. Concurrent repeats
    // reuse the committed operation even if its tags have already been removed.
    const claim = await tx.scenarioTagDeletion.createMany({
      data: [{ id: operationId, actorId, projectId, snapshot: [] }],
      skipDuplicates: true,
    });
    if (!claim.count) {
      const prior = await tx.scenarioTagDeletion.findUniqueOrThrow({
        where: { id: operationId },
      });
      const priorTags = tagSnapshot.parse(prior.snapshot);
      if (
        prior.projectId !== projectId ||
        prior.actorId !== actorId ||
        JSON.stringify(priorTags.map((t) => t.id)) !==
          JSON.stringify([...new Set(tagIds)].sort())
      ) {
        throw new OrganizationError("Deletion identifier already used", 409);
      }
      return { operationId };
    }
    const snapshot = await impact(tx, projectId, tagIds);
    if (snapshot.revision !== revision)
      throw new OrganizationError(
        "Tag deletion preview changed. Review the updated impact.",
        409,
      );
    await tx.scenarioTagDeletion.update({
      where: { id: operationId },
      data: { snapshot: snapshot.tags },
    });
    await tx.scenarioTag.deleteMany({
      where: { projectId, id: { in: tagIds } },
    });
    return { operationId };
  });
}
export async function undoScenarioTagDeletion(
  projectId: string,
  actorId: string,
  operationId: string,
) {
  try {
    await withScenarioTransaction(async (tx) => {
      const operation = await tx.scenarioTagDeletion.findFirst({
        where: { id: operationId, projectId, actorId },
      });
      if (!operation)
        throw new OrganizationError("Tag deletion not found", 404);
      if (operation.restoredAt) return;
      // Serialize concurrent Undo attempts before restoring their shared IDs.
      // Failure anywhere below rolls this marker back with the restored rows.
      await tx.scenarioTagDeletion.update({
        where: { id: operationId },
        data: { restoredAt: new Date() },
      });
      const tags = tagSnapshot.parse(operation.snapshot);
      const scenarioIds = tags.flatMap((t) =>
        t.assignments.map((a) => a.scenarioId),
      );
      const surviving = new Set(
        (
          await tx.testScenario.findMany({
            where: { projectId, id: { in: scenarioIds } },
            select: { id: true },
          })
        ).map((s) => s.id),
      );
      await tx.scenarioTag.createMany({
        data: tags.map(({ id, name, description, position }) => ({
          id,
          projectId,
          name,
          description,
          position,
        })),
      });
      await tx.scenarioTagAssignment.createMany({
        data: tags.flatMap((t) =>
          t.assignments
            .filter((a) => surviving.has(a.scenarioId))
            .map((a) => ({ ...a, projectId, tagId: t.id })),
        ),
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new OrganizationError(
        "A tag name is already in use. Undo could not restore the deletion.",
        409,
      );
    throw e;
  }
}
