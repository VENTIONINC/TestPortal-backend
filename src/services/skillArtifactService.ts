// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import JSZip from "jszip";
import { Prisma } from "@prisma/client";

import type {
  DeleteSkillPackageOutcome,
  SkillArchiveDownload,
  SkillCatalogEntry,
  SkillDetail,
  SkillDownload,
  SkillPackageUploadInput,
} from "@/types/skills";
import {
  readSkillPackageZip,
  SKILL_ARTIFACT_PATH,
  validateSkillName,
  validateSkillPackage,
} from "@/lib/skills/skillPackage";
import {
  skillModel,
  type SkillDetailRecord,
  type SkillMetadataRecord,
  type SkillPackageRecord,
} from "@/models/skillModel";

export class SkillArtifactError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "INVALID_ARTIFACT",
  ) {
    super(message);
    this.name = "SkillArtifactError";
  }
}

export class SkillMutationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CONFLICT"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "VALIDATION",
  ) {
    super(message);
    this.name = "SkillMutationError";
  }
}

interface SkillArtifactStore {
  createSkillPackage(
    data: Parameters<typeof skillModel.createSkillPackage>[0],
  ): Promise<SkillMetadataRecord>;
  deleteSkill(id: string): Promise<void>;
  findDetailById(id: string): Promise<SkillDetailRecord | null>;
  findManyMetadata(): Promise<SkillMetadataRecord[]>;
  findMetadataById(id: string): Promise<SkillMetadataRecord | null>;
  findMetadataByName(name: string): Promise<SkillMetadataRecord | null>;
  findPackageById(id: string): Promise<SkillPackageRecord | null>;
  replaceSkillPackage(
    id: string,
    data: Parameters<typeof skillModel.replaceSkillPackage>[1],
  ): Promise<SkillMetadataRecord>;
}

export class SkillArtifactService {
  constructor(private readonly skillStore: SkillArtifactStore = skillModel) {}

  async listSkills(): Promise<SkillCatalogEntry[]> {
    const skills = await this.skillStore.findManyMetadata();
    return skills.map((skill) => this.toCatalogEntry(skill));
  }

  async createCustomSkill(
    input: SkillPackageUploadInput,
  ): Promise<SkillCatalogEntry> {
    const packageData = await this.toCustomPackageData(input);
    const conflict = await this.skillStore.findMetadataByName(packageData.name);

    if (conflict) {
      throw new SkillMutationError(
        `Skill name '${packageData.name}' already exists`,
        "CONFLICT",
      );
    }

    try {
      return this.toCatalogEntry(
        await this.skillStore.createSkillPackage(packageData),
      );
    } catch (error) {
      this.rethrowPersistenceMutationError(error, packageData.name);
    }
  }

  async replaceCustomSkill(
    id: string,
    input: SkillPackageUploadInput,
  ): Promise<SkillCatalogEntry> {
    const existingSkill = await this.getMutableSkill(id);
    const packageData = await this.toCustomPackageData(input);
    const conflict = await this.skillStore.findMetadataByName(packageData.name);

    if (conflict && conflict.id !== existingSkill.id) {
      throw new SkillMutationError(
        `Skill name '${packageData.name}' already exists`,
        "CONFLICT",
      );
    }

    try {
      return this.toCatalogEntry(
        await this.skillStore.replaceSkillPackage(id, packageData),
      );
    } catch (error) {
      this.rethrowPersistenceMutationError(error, packageData.name);
    }
  }

  async deleteCustomSkill(id: string): Promise<DeleteSkillPackageOutcome> {
    await this.getMutableSkill(id);

    try {
      await this.skillStore.deleteSkill(id);
    } catch (error) {
      if (isPrismaError(error, "P2025")) {
        throw new SkillMutationError("Skill not found", "NOT_FOUND");
      }
      throw error;
    }

    return { id };
  }

  async getSkill(id: string): Promise<SkillDetail | null> {
    const skill = await this.skillStore.findDetailById(id);
    if (!skill) {
      return null;
    }

    const artifact = this.getSkillArtifactFile(skill);

    return {
      metadata: this.toCatalogEntry(skill),
      content: Buffer.from(artifact.content).toString("utf8"),
    };
  }

  async downloadSkill(id: string): Promise<SkillDownload | null> {
    const detail = await this.getSkill(id);

    if (!detail) {
      return null;
    }

    return {
      content: detail.content,
      contentType: "text/markdown; charset=utf-8",
      filename: `${detail.metadata.name}-SKILL.md`,
    };
  }

  async downloadSkillArchive(
    id: string,
  ): Promise<SkillArchiveDownload | null> {
    const skill = await this.skillStore.findPackageById(id);
    if (!skill) {
      return null;
    }

    this.assertPersistedSkillName(skill.name);

    const archive = new JSZip();

    skill.packageFiles.forEach((file) => {
      archive.file(`${skill.name}/${file.path}`, file.content, {
        date: new Date(0),
      });
    });

    const content = await archive.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      platform: "UNIX",
    });

    return {
      content,
      contentType: "application/zip",
      filename: `${skill.name}.zip`,
    };
  }

  private toCatalogEntry(skill: SkillMetadataRecord): SkillCatalogEntry {
    this.assertPersistedSkillName(skill.name);

    const entry: SkillCatalogEntry = {
      id: skill.id,
      name: skill.name,
      title: skill.title,
      description: skill.description,
      category: skill.category,
      source: skill.source,
      readOnly: skill.readOnly,
      downloadUrl: `/api/v2/skills/${skill.id}/download`,
    };

    if (skill.version) {
      entry.version = skill.version;
    }

    if (skill.license) {
      entry.license = skill.license;
    }

    if (skill.compatibility) {
      entry.compatibility = skill.compatibility;
    }

    return entry;
  }

  private async getMutableSkill(id: string): Promise<SkillMetadataRecord> {
    const skill = await this.skillStore.findMetadataById(id);

    if (!skill) {
      throw new SkillMutationError("Skill not found", "NOT_FOUND");
    }

    if (skill.readOnly) {
      throw new SkillMutationError(
        "Read-only system skills cannot be modified",
        "FORBIDDEN",
      );
    }

    return skill;
  }

  private async toCustomPackageData(input: SkillPackageUploadInput) {
    const title = input.title.trim();
    const category = input.category.trim();

    if (!title || !category) {
      throw new SkillMutationError(
        "Skill title and category are required",
        "VALIDATION",
      );
    }

    const validatedPackage = validateSkillPackage(
      await readSkillPackageZip(input.packageBuffer),
    );

    return {
      name: validatedPackage.frontmatter.name,
      title,
      description: validatedPackage.frontmatter.description,
      category,
      source: "custom" as const,
      readOnly: false,
      packageHash: validatedPackage.packageHash,
      files: validatedPackage.files,
      ...(validatedPackage.frontmatter.metadata?.version
        ? { version: validatedPackage.frontmatter.metadata.version }
        : {}),
      ...(validatedPackage.frontmatter.license
        ? { license: validatedPackage.frontmatter.license }
        : {}),
      ...(validatedPackage.frontmatter.compatibility
        ? { compatibility: validatedPackage.frontmatter.compatibility }
        : {}),
    };
  }

  private rethrowPersistenceMutationError(
    error: unknown,
    skillName: string,
  ): never {
    if (isPrismaError(error, "P2002")) {
      throw new SkillMutationError(
        `Skill name '${skillName}' already exists`,
        "CONFLICT",
      );
    }

    if (isPrismaError(error, "P2025")) {
      throw new SkillMutationError("Skill not found", "NOT_FOUND");
    }

    throw error;
  }

  private getSkillArtifactFile(skill: SkillDetailRecord | SkillPackageRecord) {
    const artifact = skill.packageFiles.find((file) => file.path === SKILL_ARTIFACT_PATH);

    if (!artifact) {
      throw new SkillArtifactError(
        `Persisted skill '${skill.name}' is missing SKILL.md`,
        "INVALID_ARTIFACT",
      );
    }

    return artifact;
  }

  private assertPersistedSkillName(name: string): void {
    try {
      validateSkillName(name);
    } catch {
      throw new SkillArtifactError(
        `Persisted skill '${name}' has an unsafe name`,
        "INVALID_ARTIFACT",
      );
    }
  }
}

export const skillArtifactService = new SkillArtifactService();

function isPrismaError(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}
