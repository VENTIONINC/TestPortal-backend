// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import JSZip from "jszip";

import type {
  SkillArchiveDownload,
  SkillCatalogEntry,
  SkillDetail,
} from "@/types/skills";
import { SKILL_ARTIFACT_PATH } from "@/lib/skills/skillPackage";
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

interface SkillArtifactStore {
  findDetailById(id: string): Promise<SkillDetailRecord | null>;
  findManyMetadata(): Promise<SkillMetadataRecord[]>;
  findPackageById(id: string): Promise<SkillPackageRecord | null>;
}

export class SkillArtifactService {
  constructor(private readonly skillStore: SkillArtifactStore = skillModel) {}

  async listSkills(): Promise<SkillCatalogEntry[]> {
    const skills = await this.skillStore.findManyMetadata();
    return skills.map((skill) => this.toCatalogEntry(skill));
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

  async downloadSkillArchive(
    id: string,
  ): Promise<SkillArchiveDownload | null> {
    const skill = await this.skillStore.findPackageById(id);
    if (!skill) {
      return null;
    }

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
    const entry: SkillCatalogEntry = {
      id: skill.id,
      name: skill.name,
      title: skill.title,
      description: skill.description,
      category: skill.category,
      source: skill.source,
      readOnly: skill.readOnly,
      downloadUrl: `/api/v2/skills/${skill.id}/archive`,
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
}

export const skillArtifactService = new SkillArtifactService();
