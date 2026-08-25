// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Prisma, TestScenario } from "@prisma/client";
import { dbClient } from "@/prisma/client";

export interface CreateTestScenarioData {
  projectId: string;
  title: string;
  contentMd: string;
  createdById: string;
}

const projectWhere = (projectId: string): Prisma.TestScenarioWhereInput => ({
  projectId,
});

export const testScenarioModel = {
  async create(
    data: CreateTestScenarioData,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenario> {
    const client = tx ?? dbClient;
    return await client.testScenario.create({ data });
  },

  async findMany(
    projectId: string,
    page = 1,
    limit = 30,
    tx?: Prisma.TransactionClient,
  ): Promise<TestScenario[]> {
    const client = tx ?? dbClient;
    return await client.testScenario.findMany({
      where: projectWhere(projectId),
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
