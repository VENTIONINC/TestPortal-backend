// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { Prisma, type SkillSource } from "@prisma/client";

import { dbClient } from "@/prisma/client";
import type { StoredSkillPackageFile } from "@/types/skills";

const skillMetadataSelect = Prisma.validator<Prisma.SkillSelect>()({
  id: true,
  name: true,
  title: true,
  description: true,
  category: true,
  source: true,
  readOnly: true,
  version: true,
  license: true,
  compatibility: true,
  packageHash: true,
});

const skillMarkdownFileSelect =
  Prisma.validator<Prisma.SkillPackageFileSelect>()({
    path: true,
    content: true,
    contentType: true,
    size: true,
  });

export type SkillMetadataRecord = Prisma.SkillGetPayload<{
  select: typeof skillMetadataSelect;
}>;

export type SkillDetailRecord = SkillMetadataRecord & {
  packageFiles: Array<
    Prisma.SkillPackageFileGetPayload<{
      select: typeof skillMarkdownFileSelect;
    }>
  >;
};

export type SkillPackageRecord = SkillMetadataRecord & {
  packageFiles: Array<
    Prisma.SkillPackageFileGetPayload<{
      select: typeof skillMarkdownFileSelect;
    }>
  >;
};

export interface UpsertSkillPackageInput {
  name: string;
  title: string;
  description: string;
  category: string;
  source: SkillSource;
  readOnly: boolean;
  packageHash: string;
  version?: string;
  license?: string;
  compatibility?: string;
  files: StoredSkillPackageFile[];
}

export const skillModel = {
  async findManyMetadata(
    tx?: Prisma.TransactionClient,
  ): Promise<SkillMetadataRecord[]> {
    const client = tx ?? dbClient;

    return await client.skill.findMany({
      select: skillMetadataSelect,
      orderBy: [{ title: "asc" }, { name: "asc" }],
    });
  },

  async findDetailById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SkillDetailRecord | null> {
    const client = tx ?? dbClient;

    return await client.skill.findUnique({
      where: { id },
      select: {
        ...skillMetadataSelect,
        packageFiles: {
          where: { path: "SKILL.md" },
          select: skillMarkdownFileSelect,
        },
      },
    });
  },

  async findPackageById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SkillPackageRecord | null> {
    const client = tx ?? dbClient;

    return await client.skill.findUnique({
      where: { id },
      select: {
        ...skillMetadataSelect,
        packageFiles: {
          select: skillMarkdownFileSelect,
          orderBy: { path: "asc" },
        },
      },
    });
  },

  async upsertSkillPackage(
    data: UpsertSkillPackageInput,
    tx?: Prisma.TransactionClient,
  ): Promise<SkillMetadataRecord> {
    const executor = async (
      client: Prisma.TransactionClient,
    ): Promise<SkillMetadataRecord> => {
      const skill = await client.skill.upsert({
        where: { name: data.name },
        create: toSkillUpsertData(data),
        update: toSkillUpsertData(data),
        select: { id: true },
      });

      await client.skillPackageFile.deleteMany({
        where: { skillId: skill.id },
      });

      if (data.files.length > 0) {
        await client.skillPackageFile.createMany({
          data: data.files.map((file) => ({
            skillId: skill.id,
            path: file.path,
            content: file.content,
            contentType: file.contentType,
            size: file.size,
          })),
        });
      }

      return await client.skill.findUniqueOrThrow({
        where: { id: skill.id },
        select: skillMetadataSelect,
      });
    };

    if (tx) {
      return await executor(tx);
    }

    return await dbClient.$transaction(executor);
  },
};

function toSkillUpsertData(
  data: UpsertSkillPackageInput,
): Prisma.SkillCreateInput {
  return {
    name: data.name,
    title: data.title,
    description: data.description,
    category: data.category,
    source: data.source,
    readOnly: data.readOnly,
    packageHash: data.packageHash,
    version: data.version ?? null,
    license: data.license ?? null,
    compatibility: data.compatibility ?? null,
  };
}
