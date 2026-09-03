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
    createSkillPackage: jest.fn(),
    deleteSkill: jest.fn(),
    findManyMetadata: jest.fn(),
    findDetailById: jest.fn(),
    findMetadataById: jest.fn(),
    findMetadataByName: jest.fn(),
    findPackageById: jest.fn(),
    replaceSkillPackage: jest.fn(),
  };

  return {
    service: new SkillArtifactService(skillStore),
    skillStore,
  };
};

const createPackageZip = async (
  content: string = validSkillContent,
): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file("uploaded-folder/SKILL.md", content);
  zip.file("uploaded-folder/references/guide.md", "# Guide\n");
  return await zip.generateAsync({ type: "nodebuffer" });
};

describe("SkillArtifactService", () => {
  it("creates a writable custom skill from uploaded package metadata", async () => {
    const { service, skillStore } = createService();
    const customMetadata = {
      ...sampleMetadata,
      source: "custom" as const,
      readOnly: false,
    };
    skillStore.findMetadataByName.mockResolvedValue(null);
    skillStore.createSkillPackage.mockImplementation(async (data) => ({
      ...customMetadata,
      title: data.title,
      category: data.category,
      packageHash: data.packageHash,
    }));

    const created = await service.createCustomSkill({
      packageBuffer: await createPackageZip(),
      title: "Uploaded Skill",
      category: "testing",
    });

    expect(skillStore.findMetadataByName).toHaveBeenCalledWith("sample-skill");
    expect(skillStore.createSkillPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "sample-skill",
        title: "Uploaded Skill",
        description: "Helps test skill downloads.",
        category: "testing",
        source: "custom",
        readOnly: false,
        version: "1.2.3",
        license: "MIT",
        compatibility: "Requires tests.",
        files: expect.arrayContaining([
          expect.objectContaining({ path: "SKILL.md" }),
          expect.objectContaining({ path: "references/guide.md" }),
        ]),
      }),
    );
    expect(created).toMatchObject({
      id: sampleMetadata.id,
      source: "custom",
      readOnly: false,
    });
  });

  it("rejects create when the frontmatter name already exists", async () => {
    const { service, skillStore } = createService();
    skillStore.findMetadataByName.mockResolvedValue(sampleMetadata);

    await expect(
      service.createCustomSkill({
        packageBuffer: await createPackageZip(),
        title: "Duplicate",
        category: "testing",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(skillStore.createSkillPackage).not.toHaveBeenCalled();
  });

  it("replaces a custom package while preserving its id", async () => {
    const { service, skillStore } = createService();
    const customMetadata = {
      ...sampleMetadata,
      source: "custom" as const,
      readOnly: false,
    };
    skillStore.findMetadataById.mockResolvedValue(customMetadata);
    skillStore.findMetadataByName.mockResolvedValue(customMetadata);
    skillStore.replaceSkillPackage.mockResolvedValue({
      ...customMetadata,
      title: "Replacement Skill",
      packageHash: "replacement-hash",
    });

    const replaced = await service.replaceCustomSkill(sampleMetadata.id, {
      packageBuffer: await createPackageZip(),
      title: "Replacement Skill",
      category: "updated",
    });

    expect(skillStore.replaceSkillPackage).toHaveBeenCalledWith(
      sampleMetadata.id,
      expect.objectContaining({
        name: "sample-skill",
        title: "Replacement Skill",
        category: "updated",
      }),
    );
    expect(replaced.id).toBe(sampleMetadata.id);
  });

  it("rejects replacement name conflicts with another skill", async () => {
    const { service, skillStore } = createService();
    skillStore.findMetadataById.mockResolvedValue({
      ...sampleMetadata,
      source: "custom",
      readOnly: false,
    });
    skillStore.findMetadataByName.mockResolvedValue({
      ...sampleMetadata,
      id: "69aa3ba0-9f8a-4d4a-a20a-e0f6215f7a32",
    });

    await expect(
      service.replaceCustomSkill(sampleMetadata.id, {
        packageBuffer: await createPackageZip(),
        title: "Conflict",
        category: "testing",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(skillStore.replaceSkillPackage).not.toHaveBeenCalled();
  });

  it("deletes custom skills and protects unknown or read-only skills", async () => {
    const { service, skillStore } = createService();
    skillStore.findMetadataById.mockResolvedValueOnce({
      ...sampleMetadata,
      source: "custom",
      readOnly: false,
    });

    await expect(service.deleteCustomSkill(sampleMetadata.id)).resolves.toEqual({
      id: sampleMetadata.id,
    });
    expect(skillStore.deleteSkill).toHaveBeenCalledWith(sampleMetadata.id);

    skillStore.findMetadataById.mockResolvedValueOnce(sampleMetadata);
    await expect(service.deleteCustomSkill(sampleMetadata.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    skillStore.findMetadataById.mockResolvedValueOnce(null);
    await expect(service.deleteCustomSkill("missing-id")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects read-only replacement before parsing the uploaded package", async () => {
    const { service, skillStore } = createService();
    skillStore.findMetadataById.mockResolvedValue(sampleMetadata);

    await expect(
      service.replaceCustomSkill(sampleMetadata.id, {
        packageBuffer: Buffer.from("malformed zip"),
        title: "Blocked",
        category: "testing",
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(skillStore.findMetadataByName).not.toHaveBeenCalled();
    expect(skillStore.replaceSkillPackage).not.toHaveBeenCalled();
  });

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

  it("generates custom archives from the current replacement package files", async () => {
    const { service, skillStore } = createService();
    const customMetadata = {
      ...sampleMetadata,
      source: "custom" as const,
      readOnly: false,
    };
    let currentContent = "# Original\n";
    skillStore.findPackageById.mockImplementation(async () => ({
      ...customMetadata,
      packageFiles: [
        {
          path: "SKILL.md",
          content: Buffer.from(currentContent, "utf8"),
          contentType: "text/markdown; charset=utf-8",
          size: Buffer.byteLength(currentContent),
        },
      ],
    }));

    const originalArchive = await service.downloadSkillArchive(sampleMetadata.id);
    currentContent = "# Replacement\n";
    const replacementArchive = await service.downloadSkillArchive(
      sampleMetadata.id,
    );
    const originalZip = await JSZip.loadAsync(
      originalArchive?.content ?? Buffer.alloc(0),
    );
    const replacementZip = await JSZip.loadAsync(
      replacementArchive?.content ?? Buffer.alloc(0),
    );

    await expect(
      originalZip.file("sample-skill/SKILL.md")?.async("string"),
    ).resolves.toBe("# Original\n");
    await expect(
      replacementZip.file("sample-skill/SKILL.md")?.async("string"),
    ).resolves.toBe("# Replacement\n");
    expect(skillStore.findPackageById).toHaveBeenCalledTimes(2);
  });

  it("returns null for unknown archive ids without fallback behavior", async () => {
    const { service, skillStore } = createService();
    skillStore.findPackageById.mockResolvedValue(null);

    await expect(
      service.downloadSkillArchive("missing-skill-id"),
    ).resolves.toBeNull();
    await expect(service.downloadSkillArchive("not-a-uuid")).resolves.toBeNull();
  });

  it("rejects unsafe persisted names before generating an archive", async () => {
    const { service, skillStore } = createService();
    skillStore.findPackageById.mockResolvedValue({
      ...sampleMetadata,
      name: "../../payload",
      source: "custom",
      readOnly: false,
      packageFiles: [
        {
          path: "SKILL.md",
          content: Buffer.from(validSkillContent, "utf8"),
          contentType: "text/markdown; charset=utf-8",
          size: Buffer.byteLength(validSkillContent),
        },
      ],
    });

    await expect(
      service.downloadSkillArchive(sampleMetadata.id),
    ).rejects.toMatchObject({ code: "INVALID_ARTIFACT" });
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
