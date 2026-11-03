// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { setTimeout as delay } from "node:timers/promises";
import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import { TestScenarioNotFoundError } from "@/types/testScenarios";

/** Roll back discovery that expanded after acquiring ordered aggregate locks. */
export class ScenarioTransactionRetryError extends Error {}

/** Serializable snapshots detect folder/member discovery phantoms. Retry only failed
 * transactions at most five times (six total attempts), with exponential jittered
 * backoff; editor revision/validation/name conflicts are never replayed.
 * Lock order is project allocation, sorted scenarios, then sorted suites.
 * New-scenario allocation may use ReadCommitted: its project row mutex protects
 * allocation and folder deletion; it has no preexisting editor snapshot to replace.
 */
const MAX_TRANSACTION_RETRIES = 5;

export async function withScenarioTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
  isolationLevel: Prisma.TransactionIsolationLevel = Prisma
    .TransactionIsolationLevel.Serializable,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await dbClient.$transaction(callback, {
        isolationLevel,
      });
    } catch (error) {
      const retry =
        error instanceof ScenarioTransactionRetryError ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === "P2034" ||
            (error.code === "P2010" &&
              (error.meta?.code === "40001" || error.meta?.code === "40P01"))));
      if (!retry || attempt >= MAX_TRANSACTION_RETRIES) throw error;
      // Wait outside the rolled-back transaction so contenders do not retry in lockstep.
      await delay(
        Math.min(10 * 2 ** attempt, 160) + Math.floor(Math.random() * 10),
      );
    }
  }
}

export async function lockScenarios(
  tx: Prisma.TransactionClient,
  projectId: string,
  scenarioIds: string[],
): Promise<void> {
  const ids = [...new Set(scenarioIds)].sort();
  if (!ids.length) return;
  const rows = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "TestScenario" WHERE "projectId" = ${projectId}::uuid AND "id" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR UPDATE`,
  );
  if (rows.length !== ids.length)
    throw new TestScenarioNotFoundError("Test scenario not found");
}

export async function lockSuites(
  tx: Prisma.TransactionClient,
  projectId: string,
  suiteIds: string[],
): Promise<void> {
  const ids = [...new Set(suiteIds)].sort();
  if (!ids.length) return;
  const rows = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT "id" FROM "TestSuite" WHERE "projectId" = ${projectId}::uuid AND "id" IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY "id" FOR UPDATE`,
  );
  if (rows.length !== ids.length)
    throw new TestScenarioNotFoundError("Suite not found");
}
