// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import JSZip from "jszip";

import {
  SkillArtifactError,
  SkillArtifactService,
} from "@/services/skillArtifactService";
import type { ConfiguredSkill } from "@/types/skills";

const createService = async (
  skillContent: string,
  skillOverrides: Partial<ConfiguredSkill> = {},
  bundledFiles: Record<string, string> = {},
) => {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "skills-hub-"));
  const skill: ConfiguredSkill = {
    name: "sample-skill",
    title: "Sample Skill",
    category: "testing",
    relativePath: "src/skills/sample-skill/SKILL.md",
    ...skillOverrides,
  };
  const artifactPath = path.join(rootDirectory, skill.relativePath);

  await mkdir(path.dirname(artifactPath), { recursive: true });
  await writeFile(artifactPath, skillContent, "utf8");
  await Promise.all(
    Object.entries(bundledFiles).map(async ([relativePath, content]) => {
      const filePath = path.join(path.dirname(artifactPath), relativePath);

      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf8");
    }),
  );

  return new SkillArtifactService([skill], rootDirectory);
};

const validSkillContent = `---
name: sample-skill
description: Helps test skill downloads.
license: MIT
compatibility: Requires tests.
metadata:
  version: "1.2.3"
---

# Sample Skill

Use this skill for tests.
`;

describe("SkillArtifactService", () => {
  it("exposes existing prompt hub assistants in the default catalog", async () => {
    const service = new SkillArtifactService();

    const skills = await service.listSkills();
    const skillNames = skills.map((skill) => skill.name).sort();

    expect(skillNames).toEqual([
      "definition-of-ready-assistant",
      "developer-code-assistant",
      "environment-performance-assistant",
      "issue-analysis-assistant",
      "software-documentation-assistant",
      "test-portal-assistant",
    ]);
    expect(
      skills.every((skill) => skill.downloadUrl.startsWith("/api/v2/skills/")),
    ).toBe(true);
  });

  it("lists configured skills with frontmatter-derived metadata", async () => {
    const service = await createService(validSkillContent);

    const skills = await service.listSkills();

    expect(skills).toEqual([
      {
        name: "sample-skill",
        title: "Sample Skill",
        description: "Helps test skill downloads.",
        category: "testing",
        version: "1.2.3",
        license: "MIT",
        compatibility: "Requires tests.",
        downloadUrl: "/api/v2/skills/sample-skill/download",
      },
    ]);
  });

  it("retrieves a known skill with metadata and raw Markdown content", async () => {
    const service = await createService(validSkillContent);

    const skill = await service.getSkill("sample-skill");

    expect(skill?.metadata.name).toBe("sample-skill");
    expect(skill?.metadata.version).toBe("1.2.3");
    expect(skill?.content).toBe(validSkillContent);
  });

  it("returns null for unknown names without reading arbitrary paths", async () => {
    const service = await createService(validSkillContent);

    await expect(service.getSkill("../sample-skill")).resolves.toBeNull();
    await expect(service.downloadSkill("missing-skill")).resolves.toBeNull();
  });

  it("returns raw Markdown download content with derived filename", async () => {
    const service = await createService(validSkillContent);

    const download = await service.downloadSkill("sample-skill");

    expect(download).toEqual({
      content: validSkillContent,
      contentType: "text/markdown; charset=utf-8",
      filename: "sample-skill-SKILL.md",
    });
  });

  it("packages a skill folder into a zip archive with bundled resources", async () => {
    const service = await createService(validSkillContent, {}, {
      "assets/templates/report.md": "# Report Template\n",
      "references/checklist.md": "# Checklist\n",
    });

    const archive = await service.downloadSkillArchive("sample-skill");
    const zip = await JSZip.loadAsync(archive?.content ?? Buffer.alloc(0));

    expect(archive?.contentType).toBe("application/zip");
    expect(archive?.filename).toBe("sample-skill.zip");
    const fileEntries = Object.entries(zip.files)
      .filter(([, entry]) => !entry.dir)
      .map(([filePath]) => filePath)
      .sort();

    expect(zip.files["sample-skill/"]?.dir).toBe(true);
    expect(fileEntries).toEqual([
      "sample-skill/SKILL.md",
      "sample-skill/assets/templates/report.md",
      "sample-skill/references/checklist.md",
    ]);
    await expect(
      zip.file("sample-skill/SKILL.md")?.async("string"),
    ).resolves.toBe(validSkillContent);
    await expect(
      zip.file("sample-skill/assets/templates/report.md")?.async("string"),
    ).resolves.toBe("# Report Template\n");
  });

  it("returns null for unknown archive names without reading arbitrary paths", async () => {
    const service = await createService(validSkillContent);

    await expect(service.downloadSkillArchive("missing-skill")).resolves.toBeNull();
    await expect(
      service.downloadSkillArchive("../sample-skill"),
    ).resolves.toBeNull();
    await expect(
      service.downloadSkillArchive("sample-skill/../../etc/passwd"),
    ).resolves.toBeNull();
  });

  it("throws an explicit service error for malformed configured artifacts", async () => {
    const service = await createService("# Missing frontmatter");

    await expect(service.getSkill("sample-skill")).rejects.toMatchObject({
      code: "INVALID_ARTIFACT",
    });
    await expect(service.getSkill("sample-skill")).rejects.toBeInstanceOf(
      SkillArtifactError,
    );
  });
});
