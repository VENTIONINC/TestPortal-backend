// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import JSZip from "jszip";

import type {
  ConfiguredSkill,
  SkillArchiveDownload,
  SkillCatalogEntry,
  SkillDetail,
  SkillDownload,
  SkillFrontmatter,
} from "@/types/skills";

const DEFAULT_SKILLS: ConfiguredSkill[] = [
  {
    name: "developer-code-assistant",
    title: "Developer Code Analysis Assistant",
    category: "development",
    relativePath: "src/skills/developer-code-assistant/SKILL.md",
  },
  {
    name: "definition-of-ready-assistant",
    title: "Definition of Ready Assistant",
    category: "planning",
    relativePath: "src/skills/definition-of-ready-assistant/SKILL.md",
  },
  {
    name: "test-portal-assistant",
    title: "Test Portal Report Generator",
    category: "reporting",
    relativePath: "src/skills/test-portal-assistant/SKILL.md",
  },
  {
    name: "issue-analysis-assistant",
    title: "Issue Analysis & Root Cause Assistant",
    category: "analysis",
    relativePath: "src/skills/issue-analysis-assistant/SKILL.md",
  },
  {
    name: "environment-performance-assistant",
    title: "Environment & Performance Analysis Assistant",
    category: "performance",
    relativePath: "src/skills/environment-performance-assistant/SKILL.md",
  },
  {
    name: "software-documentation-assistant",
    title: "Software Documentation Architect",
    category: "documentation",
    relativePath: "src/skills/software-documentation-assistant/SKILL.md",
  },
];

export class SkillArtifactError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "INVALID_ARTIFACT",
  ) {
    super(message);
    this.name = "SkillArtifactError";
  }
}

export class SkillArtifactService {
  private readonly skillsByName: Map<string, ConfiguredSkill>;

  constructor(
    private readonly configuredSkills: ConfiguredSkill[] = DEFAULT_SKILLS,
    private readonly rootDirectory: string = process.cwd(),
  ) {
    this.skillsByName = new Map(
      configuredSkills.map((skill) => [skill.name, skill]),
    );
  }

  async listSkills(): Promise<SkillCatalogEntry[]> {
    const skills = await Promise.all(
      this.configuredSkills.map((skill) => this.buildMetadata(skill)),
    );

    return skills.sort((left, right) => left.title.localeCompare(right.title));
  }

  async getSkill(name: string): Promise<SkillDetail | null> {
    const skill = this.skillsByName.get(name);

    if (!skill) {
      return null;
    }

    const artifact = await this.readArtifact(skill);

    return {
      metadata: this.toCatalogEntry(skill, artifact.frontmatter),
      content: artifact.content,
    };
  }

  async downloadSkill(name: string): Promise<SkillDownload | null> {
    const detail = await this.getSkill(name);

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
    name: string,
  ): Promise<SkillArchiveDownload | null> {
    const skill = this.skillsByName.get(name);

    if (!skill) {
      return null;
    }

    const skillDirectory = this.getSkillDirectory(skill);
    const archive = new JSZip();
    const filePaths = await this.listSkillFiles(skillDirectory);

    await Promise.all(
      filePaths.map(async (filePath) => {
        const relativePath = path
          .relative(skillDirectory, filePath)
          .split(path.sep)
          .join("/");
        const content = await readFile(filePath);

        archive.file(`${skill.name}/${relativePath}`, content, {
          date: new Date(0),
        });
      }),
    );

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

  private async buildMetadata(
    skill: ConfiguredSkill,
  ): Promise<SkillCatalogEntry> {
    const artifact = await this.readArtifact(skill);
    return this.toCatalogEntry(skill, artifact.frontmatter);
  }

  private async readArtifact(skill: ConfiguredSkill): Promise<{
    content: string;
    frontmatter: SkillFrontmatter;
  }> {
    const artifactPath = this.getSkillArtifactPath(skill);
    const content = await readFile(artifactPath, "utf8");
    const frontmatter = this.parseFrontmatter(content, skill.name);

    return { content, frontmatter };
  }

  private getSkillDirectory(skill: ConfiguredSkill): string {
    return path.dirname(this.getSkillArtifactPath(skill));
  }

  private getSkillArtifactPath(skill: ConfiguredSkill): string {
    const rootPath = path.resolve(this.rootDirectory);
    const artifactPath = path.resolve(rootPath, skill.relativePath);
    const relativePath = path.relative(rootPath, artifactPath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new SkillArtifactError(
        `Skill artifact '${skill.name}' path escapes the configured root`,
        "INVALID_ARTIFACT",
      );
    }

    return artifactPath;
  }

  private async listSkillFiles(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          return this.listSkillFiles(entryPath);
        }

        if (entry.isFile()) {
          return [entryPath];
        }

        return [];
      }),
    );

    return files.flat().sort((left, right) => left.localeCompare(right));
  }

  private toCatalogEntry(
    skill: ConfiguredSkill,
    frontmatter: SkillFrontmatter,
  ): SkillCatalogEntry {
    const entry: SkillCatalogEntry = {
      name: skill.name,
      title: skill.title,
      description: frontmatter.description,
      category: skill.category,
      downloadUrl: `/api/v2/skills/${skill.name}/download`,
    };

    if (frontmatter.metadata?.version) {
      entry.version = frontmatter.metadata.version;
    }

    if (frontmatter.license) {
      entry.license = frontmatter.license;
    }

    if (frontmatter.compatibility) {
      entry.compatibility = frontmatter.compatibility;
    }

    return entry;
  }

  private parseFrontmatter(
    content: string,
    skillName: string,
  ): SkillFrontmatter {
    if (!content.startsWith("---\n")) {
      throw new SkillArtifactError(
        `Skill artifact '${skillName}' is missing frontmatter`,
        "INVALID_ARTIFACT",
      );
    }

    const closingIndex = content.indexOf("\n---", 4);
    if (closingIndex === -1) {
      throw new SkillArtifactError(
        `Skill artifact '${skillName}' has malformed frontmatter`,
        "INVALID_ARTIFACT",
      );
    }

    const frontmatter = this.parseYamlSubset(
      content.slice(4, closingIndex),
      skillName,
    );

    if (frontmatter.name !== skillName) {
      throw new SkillArtifactError(
        `Skill artifact '${skillName}' frontmatter name does not match catalog`,
        "INVALID_ARTIFACT",
      );
    }

    if (!frontmatter.description) {
      throw new SkillArtifactError(
        `Skill artifact '${skillName}' is missing a description`,
        "INVALID_ARTIFACT",
      );
    }

    return frontmatter;
  }

  private parseYamlSubset(
    source: string,
    skillName: string,
  ): SkillFrontmatter {
    const parsed: SkillFrontmatter = {
      name: "",
      description: "",
    };
    let currentObjectKey: "metadata" | null = null;

    source.split("\n").forEach((line) => {
      if (!line.trim()) {
        return;
      }

      const nestedMatch = line.match(/^ {2}([A-Za-z0-9_-]+):\s*(.*)$/);
      if (nestedMatch && currentObjectKey === "metadata") {
        const key = nestedMatch[1];
        const value = nestedMatch[2] ?? "";
        if (!key) {
          throw new SkillArtifactError(
            `Skill artifact '${skillName}' contains unsupported frontmatter`,
            "INVALID_ARTIFACT",
          );
        }
        parsed.metadata ??= {};
        parsed.metadata[key] = this.parseScalar(value);
        return;
      }

      const topLevelMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!topLevelMatch) {
        throw new SkillArtifactError(
          `Skill artifact '${skillName}' contains unsupported frontmatter`,
          "INVALID_ARTIFACT",
        );
      }

      const key = topLevelMatch[1];
      const value = topLevelMatch[2] ?? "";
      if (!key) {
        throw new SkillArtifactError(
          `Skill artifact '${skillName}' contains unsupported frontmatter`,
          "INVALID_ARTIFACT",
        );
      }
      currentObjectKey = null;

      if (key === "metadata" && value === "") {
        parsed.metadata = {};
        currentObjectKey = "metadata";
        return;
      }

      if (key === "name") {
        parsed.name = this.parseScalar(value);
        return;
      }

      if (key === "description") {
        parsed.description = this.parseScalar(value);
        return;
      }

      if (key === "license") {
        parsed.license = this.parseScalar(value);
        return;
      }

      if (key === "compatibility") {
        parsed.compatibility = this.parseScalar(value);
      }
    });

    return parsed;
  }

  private parseScalar(value: string): string {
    const trimmed = value.trim();

    if (
      (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    return trimmed;
  }
}

export const skillArtifactService = new SkillArtifactService();
