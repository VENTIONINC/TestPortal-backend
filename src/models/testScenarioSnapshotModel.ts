// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";

interface ScenarioSnapshotRecord {
  projectId: string;
  scenarioId: string;
  revision: number;
  scenarioKey: string;
  folderId: string | null;
  suiteIds: string[];
  contentMd: string;
}

interface ScenarioSnapshot {
  projectId: string;
  snapshotTime: Date;
  scenarios: ScenarioSnapshotRecord[];
}

export async function readTestScenarioSnapshot(
  projectId: string,
): Promise<ScenarioSnapshot | null> {
  return dbClient.$transaction(
    async (transaction) => {
      const [clock] = await transaction.$queryRaw<{ snapshotTime: Date }[]>`
        SELECT statement_timestamp() AS "snapshotTime"
      `;
      if (!clock) throw new Error("Could not read the database snapshot time");

      const project = await transaction.project.findUnique({
        where: { id: projectId },
        select: { id: true },
      });
      if (!project) return null;

      const scenarios = await transaction.testScenario.findMany({
        where: { projectId: project.id },
        orderBy: { id: "asc" },
        select: {
          id: true,
          projectId: true,
          revision: true,
          scenarioKey: true,
          folderId: true,
          contentMd: true,
          suiteMemberships: {
            where: { suite: { projectId: project.id } },
            orderBy: { suiteId: "asc" },
            select: { suiteId: true },
          },
        },
      });

      return {
        projectId: project.id,
        snapshotTime: clock.snapshotTime,
        scenarios: scenarios.map(({ id, suiteMemberships, ...scenario }) => ({
          ...scenario,
          scenarioId: id,
          suiteIds: suiteMemberships.map(({ suiteId }) => suiteId),
        })),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
  );
}
