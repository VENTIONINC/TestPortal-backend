import { dbClient } from "@/prisma/client";
import type { PrismaSpec } from "@/types";

export const specModel = {
  findById: async (id: string, projectId: string): Promise<PrismaSpec | null> => {
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
