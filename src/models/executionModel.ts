import { dbClient } from "@/prisma/client";
import type { PrismaExecution } from "@/types";

export const executionModel = {
  findById: async (id: number | string): Promise<PrismaExecution | null> => {
    return await dbClient.execution.findUnique({
      where: {
        id: Number(id),
      },
    });
  },
};
