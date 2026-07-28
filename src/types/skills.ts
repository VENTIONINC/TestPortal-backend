// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export interface SkillCatalogEntry {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  source: SkillSource;
  readOnly: boolean;
  version?: string;
  license?: string;
  compatibility?: string;
  downloadUrl: string;
}

export interface SkillDetail {
  metadata: SkillCatalogEntry;
  /** Markdown preview/source content; use downloadUrl for an installable package. */
  content: string;
}

export interface SkillArchiveDownload {
  content: Buffer;
  contentType: "application/zip";
  filename: string;
}

export interface SkillPackageUploadInput {
  packageBuffer: Buffer;
  title: string;
  category: string;
}

export type CreateSkillPackageResponse = SkillCatalogEntry;
export type ReplaceSkillPackageResponse = SkillCatalogEntry;

export interface DeleteSkillPackageOutcome {
  id: string;
}

export type SkillSource = "system" | "custom";

export interface StoredSkillPackageFile {
  path: string;
  content: Buffer;
  contentType: string;
  size: number;
}

export interface ConfiguredSkill {
  name: string;
  title: string;
  category: string;
  relativePath: string;
}

export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: {
    version?: string;
    [key: string]: string | undefined;
  };
}
