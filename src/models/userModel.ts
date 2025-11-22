import { dbClient } from "@/prisma/client";
import type { PrismaUser } from "@/types";
import { Prisma } from "@prisma/client";

interface CreateUserData {
  name: string;
  email: string;
  passwordHash?: string;
  cognitoUserId?: string;
  mcpToken?: string;
  reportPortalUrl?: string | null;
  reportPortalEnabled?: boolean;
  monitoringPortalUrl?: string | null;
  monitoringPortalEnabled?: boolean;
  analyzeEnabled?: boolean;
}

export const userModel = {
  findById: async (
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaUser | null> => {
    const client = tx ?? dbClient;
    return await client.user.findUnique({
      where: {
        id,
      },
    });
  },

  findByEmail: async (
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaUser | null> => {
    const client = tx ?? dbClient;
    return await client.user.findUnique({
      where: {
        email,
      },
    });
  },

  findByCognitoUserId: async (
    cognitoUserId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaUser | null> => {
    const client = tx ?? dbClient;
    return await client.user.findUnique({
      where: {
        cognitoUserId,
      },
    });
  },

  create: async (
    data: CreateUserData,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaUser> => {
    const client = tx ?? dbClient;
    return await client.user.create({
      data,
    });
  },

  update: async (
    id: string,
    data: Partial<CreateUserData>,
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaUser> => {
    const client = tx ?? dbClient;
    return await client.user.update({
      where: { id },
      data,
    });
  },
};
