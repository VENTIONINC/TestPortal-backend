// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import JSZip from "jszip";

import {
  MAX_SKILL_PACKAGE_FILES,
  MAX_SKILL_PACKAGE_FILE_BYTES,
  SkillPackageValidationError,
  readSkillPackageZip,
  validateSkillPackage,
} from "@/lib/skills/skillPackage";

const validSkillMarkdown = `---
name: sample-skill
description: Helps test validation.
license: Apache-2.0
compatibility: Requires tests.
metadata:
  version: "1.2.3"
---

# Sample Skill

Use this skill for tests.
`;

describe("validateSkillPackage", () => {
  it("accepts a valid package and calculates a stable hash", () => {
    const result = validateSkillPackage(
      [
        {
          path: "SKILL.md",
          content: Buffer.from(validSkillMarkdown, "utf8"),
        },
        {
          path: "references/checklist.md",
          content: Buffer.from("# Checklist\n", "utf8"),
        },
      ],
      { expectedSkillName: "sample-skill" },
    );

    expect(result.frontmatter.name).toBe("sample-skill");
    expect(result.frontmatter.metadata?.version).toBe("1.2.3");
    expect(result.files.map((file) => file.path)).toEqual([
      "references/checklist.md",
      "SKILL.md",
    ]);
    expect(result.packageHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects packages without SKILL.md", () => {
    expect(() =>
      validateSkillPackage([
        {
          path: "references/checklist.md",
          content: Buffer.from("# Checklist\n", "utf8"),
        },
      ]),
    ).toThrow("missing SKILL.md");
  });

  it("rejects malformed SKILL.md frontmatter", () => {
    expect(() =>
      validateSkillPackage([
        {
          path: "SKILL.md",
          content: Buffer.from("# Missing frontmatter", "utf8"),
        },
      ]),
    ).toThrow(SkillPackageValidationError);
  });

  it.each([
    "../../payload",
    "nested/skill",
    "nested\\skill",
    ".",
    "two--hyphens",
    "Uppercase-Skill",
    "skill_name",
    `skill-${"a".repeat(64)}`,
    "control\u0001name",
  ])("rejects unsafe or non-slug skill name %j", (name) => {
    const invalidMarkdown = validSkillMarkdown.replace(
      "name: sample-skill",
      `name: ${name}`,
    );

    expect(() =>
      validateSkillPackage([
        {
          path: "SKILL.md",
          content: Buffer.from(invalidMarkdown, "utf8"),
        },
      ]),
    ).toThrow("lowercase slug");
  });

  it("rejects unsafe package paths", () => {
    expect(() =>
      validateSkillPackage([
        {
          path: "../SKILL.md",
          content: Buffer.from(validSkillMarkdown, "utf8"),
        },
      ]),
    ).toThrow("escapes the package root");
  });

  it("rejects duplicate normalized paths", () => {
    expect(() =>
      validateSkillPackage([
        {
          path: "SKILL.md",
          content: Buffer.from(validSkillMarkdown, "utf8"),
        },
        {
          path: "assets\\template.md",
          content: Buffer.from("# One\n", "utf8"),
        },
        {
          path: "assets/template.md",
          content: Buffer.from("# Two\n", "utf8"),
        },
      ]),
    ).toThrow("duplicate files");
  });

  it("rejects packages that exceed configured size and count limits", () => {
    const oversizedFile = Buffer.alloc(MAX_SKILL_PACKAGE_FILE_BYTES + 1, "a");
    expect(() =>
      validateSkillPackage([
        {
          path: "SKILL.md",
          content: oversizedFile,
        },
      ]),
    ).toThrow("byte limit");

    const tooManyFiles = Array.from({ length: MAX_SKILL_PACKAGE_FILES + 1 }, (_, index) => ({
      path: index === 0 ? "SKILL.md" : `references/file-${index}.md`,
      content: Buffer.from(
        index === 0 ? validSkillMarkdown : `# File ${index}\n`,
        "utf8",
      ),
    }));

    expect(() => validateSkillPackage(tooManyFiles)).toThrow("file limit");
  });
});

describe("readSkillPackageZip", () => {
  const createZip = async (
    files: Record<string, string | Buffer>,
  ): Promise<Buffer> => {
    const zip = new JSZip();
    Object.entries(files).forEach(([filePath, content]) => {
      zip.file(filePath, content, { createFolders: false });
    });
    return await zip.generateAsync({ type: "nodebuffer" });
  };

  const rewriteCentralDirectoryEntry = (
    zip: Buffer,
    entryPath: string,
    updates: { crc32?: number; uncompressedSize?: number },
  ): Buffer => {
    const rewritten = Buffer.from(zip);
    const centralDirectorySignature = Buffer.from([0x50, 0x4b, 0x01, 0x02]);
    let offset = rewritten.indexOf(centralDirectorySignature);

    while (offset >= 0) {
      const fileNameLength = rewritten.readUInt16LE(offset + 28);
      const extraFieldLength = rewritten.readUInt16LE(offset + 30);
      const commentLength = rewritten.readUInt16LE(offset + 32);
      const fileName = rewritten
        .subarray(offset + 46, offset + 46 + fileNameLength)
        .toString("utf8");

      if (fileName === entryPath) {
        if (updates.crc32 !== undefined) {
          rewritten.writeUInt32LE(updates.crc32 >>> 0, offset + 16);
        }
        if (updates.uncompressedSize !== undefined) {
          rewritten.writeUInt32LE(updates.uncompressedSize, offset + 24);
        }
        return rewritten;
      }

      offset = rewritten.indexOf(
        centralDirectorySignature,
        offset + 46 + fileNameLength + extraFieldLength + commentLength,
      );
    }

    throw new Error(`Missing central directory entry '${entryPath}'`);
  };

  it("extracts a root package into package input files", async () => {
    const zip = await createZip({
      "SKILL.md": validSkillMarkdown,
      "references/checklist.md": "# Checklist\n",
    });

    const files = await readSkillPackageZip(zip);

    expect(files.map((file) => file.path)).toEqual([
      "SKILL.md",
      "references/checklist.md",
    ]);
    expect(validateSkillPackage(files).frontmatter.name).toBe("sample-skill");
  });

  it("normalizes one optional top-level folder", async () => {
    const zip = await createZip({
      "transport-name/SKILL.md": validSkillMarkdown,
      "transport-name/assets/template.md": "# Template\n",
    });

    const files = await readSkillPackageZip(zip);

    expect(files.map((file) => file.path)).toEqual([
      "SKILL.md",
      "assets/template.md",
    ]);
  });

  it("rejects empty and malformed zip uploads", async () => {
    await expect(readSkillPackageZip(Buffer.alloc(0))).rejects.toThrow("empty");
    await expect(
      readSkillPackageZip(Buffer.from("not a zip", "utf8")),
    ).rejects.toThrow("malformed");
    await expect(
      readSkillPackageZip(await new JSZip().generateAsync({ type: "nodebuffer" })),
    ).rejects.toThrow("contains no files");
  });

  it("rejects unsafe entry paths before extraction", async () => {
    const zip = await createZip({
      "../SKILL.md": validSkillMarkdown,
    });

    await expect(readSkillPackageZip(zip)).rejects.toThrow(
      "escapes the package root",
    );
  });

  it("rejects non-file entries that do not represent package paths", async () => {
    const zip = new JSZip();
    zip.file("SKILL.md", validSkillMarkdown);
    zip.folder("empty-folder");

    await expect(
      readSkillPackageZip(await zip.generateAsync({ type: "nodebuffer" })),
    ).rejects.toThrow("unsupported directory entry");
  });

  it("rejects duplicate paths introduced by root normalization", async () => {
    const zip = await createZip({
      "sample/SKILL.md": validSkillMarkdown,
      "sample/assets/template.md": "# One\n",
      "sample/assets\\template.md": "# Two\n",
    });

    await expect(readSkillPackageZip(zip)).rejects.toThrow("duplicate files");
  });

  it("rejects unsupported file types during package validation", async () => {
    const zip = await createZip({
      "SKILL.md": validSkillMarkdown,
      "script.js": "console.log('unsupported');\n",
    });

    const files = await readSkillPackageZip(zip);

    expect(() => validateSkillPackage(files)).toThrow("unsupported file type");
  });

  it("rejects declared per-file, total-size, and file-count excesses", async () => {
    await expect(
      readSkillPackageZip(
        await createZip({
          "SKILL.md": Buffer.alloc(MAX_SKILL_PACKAGE_FILE_BYTES + 1, "a"),
        }),
      ),
    ).rejects.toThrow("byte limit");

    const tooManyFiles = Object.fromEntries(
      Array.from({ length: MAX_SKILL_PACKAGE_FILES + 1 }, (_, index) => [
        index === 0 ? "SKILL.md" : `references/file-${index}.md`,
        index === 0 ? validSkillMarkdown : `# File ${index}\n`,
      ]),
    );
    await expect(
      readSkillPackageZip(await createZip(tooManyFiles)),
    ).rejects.toThrow("file limit");

    const totalSizeFiles = Object.fromEntries(
      Array.from({ length: 5 }, (_, index) => [
        index === 0 ? "SKILL.md" : `references/file-${index}.md`,
        Buffer.alloc(MAX_SKILL_PACKAGE_FILE_BYTES, "a"),
      ]),
    );
    await expect(
      readSkillPackageZip(await createZip(totalSizeFiles)),
    ).rejects.toThrow("byte limit");
  });

  it("stops streaming extraction when actual output exceeds forged size metadata", async () => {
    const zip = await createZip({
      "SKILL.md": validSkillMarkdown,
      "references/payload.txt": Buffer.alloc(32 * 1024, "a"),
    });
    const forgedZip = rewriteCentralDirectoryEntry(
      zip,
      "references/payload.txt",
      { uncompressedSize: 1 },
    );

    await expect(readSkillPackageZip(forgedZip)).rejects.toThrow(
      "declared or permitted size",
    );
  });

  it("validates CRC during bounded extraction", async () => {
    const zip = await createZip({ "SKILL.md": validSkillMarkdown });
    const forgedZip = rewriteCentralDirectoryEntry(zip, "SKILL.md", {
      crc32: 0,
    });

    await expect(readSkillPackageZip(forgedZip)).rejects.toThrow(
      "failed CRC validation",
    );
  });
});
