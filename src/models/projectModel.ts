// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Project, Prisma } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import type { ProjectCategoryWeights } from "@/lib/projectCategoryWeights";

function toProjectCategoryWeightsJson(
  categoryWeights: ProjectCategoryWeights,
): Prisma.InputJsonValue {
  return categoryWeights as unknown as Prisma.InputJsonValue;
}

export const projectModel = {
  async findMany(
    filters?: {
      ownerId?: string;
      isActive?: boolean;
      name?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Project[]> {
    const client = tx ?? dbClient;
    const where: Prisma.ProjectWhereInput = {};

    if (filters?.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.name) {
      where.name = {
        contains: filters.name,
        mode: "insensitive",
      };
    }

    return await client.project.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            executions: true,
            specs: true,
            issues: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<
    | (Project & {
        owner: { id: string; name: string; email: string };
        _count: {
          executions: number;
          specs: number;
          issues: number;
        };
      })
    | null
  > {
    const client = tx ?? dbClient;
    return await client.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            executions: true,
            specs: true,
            issues: true,
          },
        },
      },
    });
  },

  async findByName(
    name: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Project | null> {
    const client = tx ?? dbClient;
    return await client.project.findUnique({
      where: { name },
    });
  },

  async exists(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const client = tx ?? dbClient;
    const project = await client.project.findUnique({
      where: { id },
      select: { id: true },
    });

    return project !== null;
  },

  async create(
    data: {
      name: string;
      description?: string;
      ownerId: string;
      categoryWeights: ProjectCategoryWeights;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Project> {
    const client = tx ?? dbClient;
    const createData: Prisma.ProjectUncheckedCreateInput = {
      name: data.name,
      description: data.description ?? null,
      ownerId: data.ownerId,
      categoryWeights: toProjectCategoryWeightsJson(data.categoryWeights),
    };

    return await client.project.create({
      data: createData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  async update(
    id: string,
    data: {
      name?: string;
      description?: string;
      isActive?: boolean;
      categoryWeights?: ProjectCategoryWeights;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<Project> {
    const client = tx ?? dbClient;
    const updateData: Prisma.ProjectUncheckedUpdateInput = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }

    if (data.categoryWeights !== undefined) {
      updateData.categoryWeights = toProjectCategoryWeightsJson(
        data.categoryWeights,
      );
    }

    return await client.project.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  },

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<Project> {
    const client = tx ?? dbClient;
    return await client.project.delete({
      where: { id },
    });
  },

  /** Deletes a project; related rows are removed by PostgreSQL cascades. */
  async deleteWithCascade(id: string): Promise<Project> {
    return await dbClient.project.delete({
      where: { id },
    });
  },

  async findUserProjects(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Project[]> {
    const client = tx ?? dbClient;
    return await client.project.findMany({
      where: {
        ownerId: userId,
        isActive: true,
      },
      include: {
        _count: {
          select: {
            executions: true,
            specs: true,
            issues: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },
};
