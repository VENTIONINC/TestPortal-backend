// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";

import { skillModel } from "@/models/skillModel";
import {
  readSkillPackageDirectory,
  validateSkillPackage,
} from "@/lib/skills/skillPackage";
import type { ConfiguredSkill } from "@/types/skills";

const SYSTEM_SKILL_DEFINITIONS: ConfiguredSkill[] = [
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

export interface SkillPackageSeedServiceResult {
  seededSkillNames: string[];
}

export class SkillPackageSeedService {
  constructor(
    private readonly configuredSkills: ConfiguredSkill[] = SYSTEM_SKILL_DEFINITIONS,
    private readonly rootDirectory: string = process.cwd(),
    private readonly skillStore: typeof skillModel = skillModel,
  ) {}

  async seed(): Promise<SkillPackageSeedServiceResult> {
    const seededSkillNames = await Promise.all(
      this.configuredSkills.map(async (configuredSkill) => {
        const packageDirectory = path.dirname(
          path.resolve(this.rootDirectory, configuredSkill.relativePath),
        );
        const packageFiles = await readSkillPackageDirectory(packageDirectory);
        const validatedPackage = validateSkillPackage(packageFiles, {
          expectedSkillName: configuredSkill.name,
        });
        const upsertPayload = {
          name: configuredSkill.name,
          title: configuredSkill.title,
          description: validatedPackage.frontmatter.description,
          category: configuredSkill.category,
          source: "system" as const,
          readOnly: true,
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

        await this.skillStore.upsertSkillPackage(upsertPayload);

        return configuredSkill.name;
      }),
    );

    return {
      seededSkillNames: seededSkillNames.sort((left, right) =>
        left.localeCompare(right),
      ),
    };
  }
}

export const skillPackageSeedService = new SkillPackageSeedService();
