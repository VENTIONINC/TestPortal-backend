// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import { lockSuites } from "@/models/testScenarioTransactions";
import {
  TestScenarioNotFoundError,
  TestScenarioValidationError,
} from "@/types/testScenarios";
import type { UpdateTestScenarioParams } from "@/types/testScenarios";

export async function validateScenarioActor(
  tx: Prisma.TransactionClient,
  actorId: string | undefined,
): Promise<void> {
  if (
    actorId !== undefined &&
    !(await tx.user.findUnique({
      where: { id: actorId },
      select: { id: true },
    }))
  ) {
    throw new TestScenarioNotFoundError("Updater not found");
  }
}

export async function validateScenarioFolder(
  tx: Prisma.TransactionClient,
  projectId: string,
  folderId: string | null | undefined,
): Promise<void> {
  if (
    folderId &&
    !(await tx.testScenarioFolder.findFirst({
      where: { id: folderId, projectId },
      select: { id: true },
    }))
  ) {
    throw new TestScenarioNotFoundError("Folder not found");
  }
}

/** Caller holds the scenario lock before acquiring any suite locks. */
export async function replaceScenarioSuites(
  tx: Prisma.TransactionClient,
  projectId: string,
  scenarioId: string,
  suiteIds: string[],
  newSuites: Array<{ name: string }>,
): Promise<void> {
  const previous = await tx.testSuiteMember.findMany({
    where: { testScenarioId: scenarioId },
    select: { suiteId: true },
  });
  await lockSuites(tx, projectId, [
    ...suiteIds,
    ...previous.map(({ suiteId }) => suiteId),
  ]);
  const resolvedIds = [...suiteIds];
  for (const { name } of newSuites) {
    const suite = await tx.testSuite.create({ data: { projectId, name } });
    resolvedIds.push(suite.id);
  }
  await tx.testSuiteMember.deleteMany({
    where: { testScenarioId: scenarioId, suiteId: { notIn: resolvedIds } },
  });
  for (const suiteId of resolvedIds) {
    if (previous.some((membership) => membership.suiteId === suiteId)) continue;
    const maximum = await tx.testSuiteMember.aggregate({
      where: { suiteId },
      _max: { position: true },
    });
    await tx.testSuiteMember.create({
      data: {
        suiteId,
        testScenarioId: scenarioId,
        position: (maximum._max.position ?? -1) + 1,
      },
    });
  }
}

export async function replaceScenarioSteps(
  tx: Prisma.TransactionClient,
  scenarioId: string,
  steps: NonNullable<UpdateTestScenarioParams["steps"]>,
): Promise<void> {
  const previous = await tx.testScenarioStep.findMany({
    where: { testScenarioId: scenarioId },
  });
  const retained = steps.flatMap((step) => (step.id ? [step.id] : []));
  if (new Set(retained).size !== retained.length)
    throw new TestScenarioValidationError("Duplicate step IDs");
  if (retained.some((id) => !previous.some((step) => step.id === id)))
    throw new TestScenarioNotFoundError("Step not found");
  // Vacate the unique positional range before deleting/reordering retained rows.
  const offset =
    previous.reduce((max, step) => Math.max(max, step.position), -1) +
    steps.length +
    2;
  await tx.testScenarioStep.updateMany({
    where: { testScenarioId: scenarioId },
    data: { position: { increment: offset } },
  });
  await tx.testScenarioStep.deleteMany({
    where: { testScenarioId: scenarioId, id: { notIn: retained } },
  });
  for (const [position, step] of steps.entries()) {
    const data = {
      position,
      action: step.action,
      expectedResult: step.expectedResult ?? null,
    };
    if (step.id)
      await tx.testScenarioStep.update({ where: { id: step.id }, data });
    else
      await tx.testScenarioStep.create({
        data: { testScenarioId: scenarioId, ...data },
      });
  }
}
