import { dbClient } from "@/prisma/client";
import type { PrismaSpec } from "@/types";

export const specModel = {
  findById: async (id: number | string): Promise<PrismaSpec | null> => {
    return await dbClient.spec.findUnique({
      where: {
        id: Number(id),
      },
    });
  },
};
