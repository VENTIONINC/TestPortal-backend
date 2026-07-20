// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  MAX_SKILL_PACKAGE_FILES,
  MAX_SKILL_PACKAGE_FILE_BYTES,
  SkillPackageValidationError,
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
