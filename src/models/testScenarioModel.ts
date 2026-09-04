// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Prisma, TestScenario } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import type { TestScenarioSummary } from "@/types/testScenarios";

export interface CreateTestScenarioData {
  projectId: string;
  title: string;
  contentMd: string;
  createdById: string;
  details?: string | null;
}

export interface UpdateTestScenarioData {
  title?: string;
  contentMd?: string;
  details?: string | null;
}

const projectWhere = (projectId: string): Prisma.TestScenarioWhereInput => ({
  projectId,
});

const summarySelect = {
  id: true,
  projectId: true,
  createdById: true,
  title: true,
  details: true,
  createdAt: true,
  updatedAt: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.TestScenarioSelect;

export const testScenarioModel = {
  async create(
    data: CreateTestScenarioData,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenario> {
    const client = tx ?? dbClient;
    return await client.testScenario.create({ data });
  },

  async findManySummaries(
    projectId: string,
    page = 1,
    limit = 30,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenarioSummary[]> {
    const client = tx ?? dbClient;
    return await client.testScenario.findMany({
      where: projectWhere(projectId),
      select: summarySelect,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
  },

  async count(
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? dbClient;
    return await client.testScenario.count({
      where: projectWhere(projectId),
    });
  },

  async findById(
    id: string,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenario | null> {
    const client = tx ?? dbClient;
    return await client.testScenario.findFirst({
      where: { id, projectId },
    });
  },

  async update(
    id: string,
    projectId: string,
    data: UpdateTestScenarioData,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenario | null> {
    const updateWithinTransaction = async (
      client: Prisma.TransactionClient,
    ): Promise<TestScenario | null> => {
      const scenario = await client.testScenario.findFirst({
        where: { id, projectId },
      });

      if (!scenario) {
        return null;
      }

      return await client.testScenario.update({
        where: { id: scenario.id },
        data,
      });
    };

    if (tx) {
      return await updateWithinTransaction(tx);
    }

    return await dbClient.$transaction(updateWithinTransaction);
  },

  async delete(
    id: string,
    projectId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? dbClient;
    const result = await client.testScenario.deleteMany({
      where: { id, projectId },
    });

    return result.count;
  },
};
