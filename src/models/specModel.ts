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
};
