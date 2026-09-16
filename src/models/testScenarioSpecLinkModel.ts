// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type {
  Prisma,
  Spec,
  TestScenarioSpecLink,
} from "@prisma/client";
import { dbClient } from "@/prisma/client";

export type TestScenarioSpecLinkWithSpec = TestScenarioSpecLink & {
  spec: Spec;
};

const linkedSpecWhere = (
  scenarioId: string,
  projectId: string,
): Prisma.TestScenarioSpecLinkWhereInput => ({
  testScenarioId: scenarioId,
  spec: { projectId },
});

export const testScenarioSpecLinkModel = {
  async create(
    data: { testScenarioId: string; specId: string },
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioSpecLink> {
    const client = tx ?? dbClient;
    return await client.testScenarioSpecLink.create({ data });
  },

  async findLinkedSpecs(
    scenarioId: string,
    projectId: string,
    page = 1,
    limit = 30,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioSpecLinkWithSpec[]> {
    const client = tx ?? dbClient;
    return await client.testScenarioSpecLink.findMany({
      where: linkedSpecWhere(scenarioId, projectId),
      include: { spec: true },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ spec: { createdAt: "desc" } }, { spec: { id: "desc" } }],
    });
  },

  async countLinkedSpecs(
    scenarioId: string,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? dbClient;
    return await client.testScenarioSpecLink.count({
      where: linkedSpecWhere(scenarioId, projectId),
    });
  },

  async findLinkedSpecIds(
    scenarioId: string,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string[]> {
    const client = tx ?? dbClient;
    const links = await client.testScenarioSpecLink.findMany({
      where: linkedSpecWhere(scenarioId, projectId),
      select: { specId: true },
    });

    return links.map(({ specId }) => specId);
  },

  async delete(
    testScenarioId: string,
    specId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? dbClient;
    const result = await client.testScenarioSpecLink.deleteMany({
      where: { testScenarioId, specId },
    });

    return result.count;
  },
};
