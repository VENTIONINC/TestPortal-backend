// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import type { UploadApiKey } from "@prisma/client";

interface CreateUploadApiKeyData {
  apiKey: string;
  projectId: string;
  ownerId: string;
}

export const uploadApiKeyModel = {
  create: async (data: CreateUploadApiKeyData): Promise<UploadApiKey> => {
    return await dbClient.uploadApiKey.create({
      data,
    });
  },

  findByApiKey: async (apiKey: string): Promise<UploadApiKey | null> => {
    return await dbClient.uploadApiKey.findUnique({
      where: {
        apiKey,
      },
      include: {
        project: true,
        owner: true,
      },
    });
  },

  findAllActive: async (): Promise<UploadApiKey[]> => {
    return await dbClient.uploadApiKey.findMany({
      where: {
        isActive: true,
      },
      include: {
        project: true,
        owner: true,
      },
    });
  },

  findByUserId: async (
    ownerId: string,
  ): Promise<Array<UploadApiKey & { project: { id: string; name: string } }>> => {
    return await dbClient.uploadApiKey.findMany({
      where: {
        ownerId,
        isActive: true,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  findById: async (id: string): Promise<UploadApiKey | null> => {
    return await dbClient.uploadApiKey.findUnique({
      where: {
        id,
      },
    });
  },

  revoke: async (id: string): Promise<UploadApiKey> => {
    return await dbClient.uploadApiKey.update({
      where: {
        id,
      },
      data: {
        isActive: false,
      },
    });
  },

  updateApiKey: async (
    id: string,
    data: { apiKey: string },
  ): Promise<UploadApiKey> => {
    return await dbClient.uploadApiKey.update({
      where: {
        id,
      },
      data,
    });
  },
};
