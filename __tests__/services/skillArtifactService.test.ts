// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import JSZip from "jszip";

import {
  SkillArtifactError,
  SkillArtifactService,
} from "@/services/skillArtifactService";
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

const sampleMetadata = {
  id: "6f5b8b53-5128-4b05-a8bf-b1d532f3a8d9",
  name: "sample-skill",
  title: "Sample Skill",
  description: "Helps test skill downloads.",
  category: "testing",
  source: "system" as const,
  readOnly: true,
  version: "1.2.3",
  license: "MIT",
  compatibility: "Requires tests.",
  packageHash: "hash-1",
};

const createService = () => {
  const skillStore = {
    findManyMetadata: jest.fn(),
    findDetailById: jest.fn(),
    findPackageById: jest.fn(),
  };

  return {
    service: new SkillArtifactService(skillStore),
    skillStore,
  };
};

describe("SkillArtifactService", () => {
  it("lists persisted skills with archive download URLs and source metadata", async () => {
    const { service, skillStore } = createService();
    skillStore.findManyMetadata.mockResolvedValue([sampleMetadata]);

    const skills = await service.listSkills();

    expect(skills).toEqual([
      {
        id: "6f5b8b53-5128-4b05-a8bf-b1d532f3a8d9",
        name: "sample-skill",
        title: "Sample Skill",
        description: "Helps test skill downloads.",
        category: "testing",
        source: "system",
        readOnly: true,
        version: "1.2.3",
        license: "MIT",
        compatibility: "Requires tests.",
        downloadUrl: "/api/v2/skills/6f5b8b53-5128-4b05-a8bf-b1d532f3a8d9/archive",
      },
    ]);
  });

  it("retrieves a known skill by id with metadata and raw Markdown content", async () => {
    const { service, skillStore } = createService();
    skillStore.findDetailById.mockResolvedValue({
      ...sampleMetadata,
      packageFiles: [
        {
          path: "SKILL.md",
          content: Buffer.from(validSkillContent, "utf8"),
          contentType: "text/markdown; charset=utf-8",
          size: Buffer.byteLength(validSkillContent),
        },
      ],
    });

    const skill = await service.getSkill(sampleMetadata.id);

    expect(skill?.metadata.id).toBe(sampleMetadata.id);
    expect(skill?.metadata.name).toBe("sample-skill");
    expect(skill?.metadata.version).toBe("1.2.3");
    expect(skill?.content).toBe(validSkillContent);
  });

  it("returns null for unknown or invalid detail ids without fallback behavior", async () => {
    const { service, skillStore } = createService();
    skillStore.findDetailById.mockResolvedValue(null);
    skillStore.findPackageById.mockResolvedValue(null);

    await expect(service.getSkill("not-a-uuid")).resolves.toBeNull();
  });

  it("packages a skill folder into a zip archive with bundled resources", async () => {
    const { service, skillStore } = createService();
    skillStore.findPackageById.mockResolvedValue({
      ...sampleMetadata,
      packageFiles: [
        {
          path: "SKILL.md",
          content: Buffer.from(validSkillContent, "utf8"),
          contentType: "text/markdown; charset=utf-8",
          size: Buffer.byteLength(validSkillContent),
        },
        {
          path: "assets/templates/report.md",
          content: Buffer.from("# Report Template\n", "utf8"),
          contentType: "text/markdown; charset=utf-8",
          size: Buffer.byteLength("# Report Template\n"),
        },
        {
          path: "references/checklist.md",
          content: Buffer.from("# Checklist\n", "utf8"),
          contentType: "text/markdown; charset=utf-8",
          size: Buffer.byteLength("# Checklist\n"),
        },
      ],
    });

    const archive = await service.downloadSkillArchive(sampleMetadata.id);
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

  it("returns null for unknown archive ids without fallback behavior", async () => {
    const { service, skillStore } = createService();
    skillStore.findPackageById.mockResolvedValue(null);

    await expect(
      service.downloadSkillArchive("missing-skill-id"),
    ).resolves.toBeNull();
    await expect(service.downloadSkillArchive("not-a-uuid")).resolves.toBeNull();
  });

  it("throws an explicit service error for malformed persisted artifacts", async () => {
    const { service, skillStore } = createService();
    skillStore.findDetailById.mockResolvedValue({
      ...sampleMetadata,
      packageFiles: [],
    });

    await expect(service.getSkill(sampleMetadata.id)).rejects.toMatchObject({
      code: "INVALID_ARTIFACT",
    });
    await expect(service.getSkill(sampleMetadata.id)).rejects.toBeInstanceOf(
      SkillArtifactError,
    );
  });
});
