import { dbClient } from "@/prisma/client";
import type { PrismaUser } from "@/types";

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
}

export const userModel = {
  findById: async (id: number | string): Promise<PrismaUser | null> => {
    return await dbClient.user.findUnique({
      where: {
        id: Number(id),
      },
    });
  },

  findByEmail: async (email: string): Promise<PrismaUser | null> => {
    return await dbClient.user.findUnique({
      where: {
        email,
      },
    });
  },

  findByCognitoUserId: async (cognitoUserId: string): Promise<PrismaUser | null> => {
    return await dbClient.user.findUnique({
      where: {
        cognitoUserId,
      },
    });
  },

  create: async (data: CreateUserData): Promise<PrismaUser> => {
    return await dbClient.user.create({
      data,
    });
  },

  update: async (
    id: number | string,
    data: Partial<CreateUserData>,
  ): Promise<PrismaUser> => {
    return await dbClient.user.update({
      where: { id: Number(id) },
      data,
    });
  },
};
