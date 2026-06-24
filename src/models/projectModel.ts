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

  /**
   * Deletes a project and all its related data using a transaction.
   * Deletion order respects foreign key constraints:
   * 1. Assumptions (references ResultError and Issue)
   * 2. ResultError (references Result)
   * 3. Result (references Spec and Execution)
   * 4. Issues (references Project)
   * 5. Executions (references Project)
   * 6. Specs (references Project)
   * 7. UploadApiKeys (references Project)
   * 8. Project itself
   */
  async deleteWithCascade(id: string): Promise<Project> {
    return await dbClient.$transaction(async (tx) => {
      const project = await tx.project.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!project) {
        throw new Error(`Project with id '${id}' not found`);
      }

      const executions = await tx.execution.findMany({
        where: { projectId: id },
        select: { id: true },
      });
      const executionIds = executions.map((e) => e.id);

      const specs = await tx.spec.findMany({
        where: { projectId: id },
        select: { id: true },
      });
      const specIds = specs.map((s) => s.id);

      const issues = await tx.issue.findMany({
        where: { projectId: id },
        select: { id: true },
      });
      const issueIds = issues.map((i) => i.id);

      const results = await tx.result.findMany({
        where: {
          OR: [
            { executionId: { in: executionIds } },
            { specId: { in: specIds } },
          ],
        },
        select: { id: true },
      });
      const resultIds = results.map((r) => r.id);

      const resultErrors = await tx.resultError.findMany({
        where: { resultId: { in: resultIds } },
        select: { id: true },
      });
      const resultErrorIds = resultErrors.map((re) => re.id);

      // Step 1: Delete Assumptions (references ResultError and Issue)
      if (resultErrorIds.length > 0 || issueIds.length > 0) {
        await tx.assumption.deleteMany({
          where: {
            OR: [
              ...(resultErrorIds.length > 0
                ? [{ resultErrorId: { in: resultErrorIds } }]
                : []),
              ...(issueIds.length > 0 ? [{ issueId: { in: issueIds } }] : []),
            ],
          },
        });
      }

      // Step 2: Delete ResultErrors (references Result)
      if (resultIds.length > 0) {
        await tx.resultError.deleteMany({
          where: { resultId: { in: resultIds } },
        });
      }

      // Step 3: Delete Results (references Spec and Execution)
      if (executionIds.length > 0 || specIds.length > 0) {
        await tx.result.deleteMany({
          where: {
            OR: [
              ...(executionIds.length > 0
                ? [{ executionId: { in: executionIds } }]
                : []),
              ...(specIds.length > 0 ? [{ specId: { in: specIds } }] : []),
            ],
          },
        });
      }

      // Step 4: Delete Issues (references Project)
      await tx.issue.deleteMany({
        where: { projectId: id },
      });

      // Step 5: Delete Executions (references Project)
      await tx.execution.deleteMany({
        where: { projectId: id },
      });

      // Step 6: Delete Specs (references Project)
      await tx.spec.deleteMany({
        where: { projectId: id },
      });

      // Step 7: Delete UploadApiKeys (references Project)
      await tx.uploadApiKey.deleteMany({
        where: { projectId: id },
      });

      // Step 8: Delete Project itself
      return await tx.project.delete({
        where: { id },
      });
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
