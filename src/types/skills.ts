// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export interface SkillCatalogEntry {
  name: string;
  title: string;
  description: string;
  category: string;
  version?: string;
  license?: string;
  compatibility?: string;
  downloadUrl: string;
}

export interface SkillDetail {
  metadata: SkillCatalogEntry;
  content: string;
}

export interface SkillDownload {
  content: string;
  contentType: "text/markdown; charset=utf-8";
  filename: string;
}

export interface SkillArchiveDownload {
  content: Buffer;
  contentType: "application/zip";
  filename: string;
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
