// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Prisma, Spec } from "@prisma/client";
import { dbClient } from "@/prisma/client";
import type { PrismaSpec } from "@/types";

export interface SpecListingFilter {
  projectId: string;
  search?: string;
}

function listingWhere({
  projectId,
  search,
}: SpecListingFilter): Prisma.SpecWhereInput {
  const term = search
    ?.trim()
    .replace(/[\\%_]/g, (character) => `\\${character}`);
  return {
    projectId,
    ...(term
      ? {
          OR: [
            { key: { contains: term, mode: "insensitive" } },
            { title: { contains: term, mode: "insensitive" } },
            { file: { contains: term, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export const specModel = {
  async list(
    filter: SpecListingFilter,
    page: number,
    limit: number,
  ): Promise<Spec[]> {
    return await dbClient.spec.findMany({
      where: listingWhere(filter),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    });
  },

  async count(filter: SpecListingFilter): Promise<number> {
    return await dbClient.spec.count({ where: listingWhere(filter) });
  },

  findById: async (
    id: string,
    projectId: string,
  ): Promise<PrismaSpec | null> => {
    return await dbClient.spec.findFirst({
      where: {
        id,
        projectId,
      },
    });
  },

  delete: async (id: string, projectId: string): Promise<void> => {
    const existingSpec = await dbClient.spec.findFirst({
      where: {
        id,
        projectId,
      },
      include: {
        results: {
          include: {
            errors: {
              include: {
                assumptions: true,
              },
            },
          },
        },
      },
    });

    if (!existingSpec) {
      throw new Error(`Spec with ID ${id} not found`);
    }

    await dbClient.$transaction(async (tx) => {
      for (const result of existingSpec.results) {
        for (const error of result.errors) {
          if (error.assumptions.length > 0) {
            await tx.assumption.deleteMany({
              where: {
                resultErrorId: error.id,
              },
            });
          }
        }

        await tx.resultError.deleteMany({
          where: {
            resultId: result.id,
          },
        });
      }

      await tx.result.deleteMany({
        where: {
          specId: id,
        },
      });

      await tx.spec.delete({
        where: { id },
      });
    });
  },
};
