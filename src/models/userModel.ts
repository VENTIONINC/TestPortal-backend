// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import type { PrismaUser } from "@/types";
import { Prisma, UserRole, UserStatus } from "@prisma/client";

interface CreateUserData {
  name: string;
  email: string;
  status?: UserStatus;
  role?: UserRole;
  passwordHash?: string;
  cognitoUserId?: string;
  mcpToken?: string;
  reportPortalUrl?: string | null;
  reportPortalEnabled?: boolean;
  monitoringPortalUrl?: string | null;
  monitoringPortalEnabled?: boolean;
  analyzeEnabled?: boolean;
}

interface ListUsersOptions {
  orderBy?: Prisma.UserOrderByWithRelationInput;
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

  list: async (
    options: ListUsersOptions = {},
    tx?: Prisma.TransactionClient,
  ): Promise<PrismaUser[]> => {
    const client = tx ?? dbClient;
    return await client.user.findMany({
      orderBy: options.orderBy ?? { createdAt: "asc" },
    });
  },

  countActiveAdmins: async (tx?: Prisma.TransactionClient): Promise<number> => {
    const client = tx ?? dbClient;
    return await client.user.count({
      where: {
        status: UserStatus.active,
        role: UserRole.admin,
      },
    });
  },
};
