// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { SkillPackageSeedService } from "@/services/skillPackageSeedService";
import type { ConfiguredSkill } from "@/types/skills";

const sampleSkillMarkdown = `---
name: sample-skill
description: Seeded sample skill.
license: Apache-2.0
metadata:
  version: "2.0.0"
---

# Sample Skill

Seed me.
`;

async function createSeedRoot(
  configuredSkill: ConfiguredSkill,
): Promise<string> {
  const rootDirectory = await mkdtemp(path.join(os.tmpdir(), "skill-seed-"));
  const skillArtifactPath = path.join(rootDirectory, configuredSkill.relativePath);

  await mkdir(path.dirname(skillArtifactPath), { recursive: true });
  await writeFile(skillArtifactPath, sampleSkillMarkdown, "utf8");
  await mkdir(path.join(path.dirname(skillArtifactPath), "references"), {
    recursive: true,
  });
  await writeFile(
    path.join(path.dirname(skillArtifactPath), "references", "guide.md"),
    "# Guide\n",
    "utf8",
  );

  return rootDirectory;
}

describe("SkillPackageSeedService", () => {
  it("imports configured skills as read-only system packages", async () => {
    const configuredSkill: ConfiguredSkill = {
      name: "sample-skill",
      title: "Sample Skill",
      category: "testing",
      relativePath: "src/skills/sample-skill/SKILL.md",
    };
    const rootDirectory = await createSeedRoot(configuredSkill);
    const skillStore = {
      upsertSkillPackage: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SkillPackageSeedService(
      [configuredSkill],
      rootDirectory,
      skillStore as never,
    );

    const result = await service.seed();

    expect(result.seededSkillNames).toEqual(["sample-skill"]);
    expect(skillStore.upsertSkillPackage).toHaveBeenCalledWith({
      name: "sample-skill",
      title: "Sample Skill",
      description: "Seeded sample skill.",
      category: "testing",
      source: "system",
      readOnly: true,
      packageHash: expect.any(String),
      version: "2.0.0",
      license: "Apache-2.0",
      files: expect.arrayContaining([
        expect.objectContaining({ path: "SKILL.md" }),
        expect.objectContaining({ path: "references/guide.md" }),
      ]),
    });
  });

  it("is idempotent by upserting the same configured skill on repeated runs", async () => {
    const configuredSkill: ConfiguredSkill = {
      name: "sample-skill",
      title: "Sample Skill",
      category: "testing",
      relativePath: "src/skills/sample-skill/SKILL.md",
    };
    const rootDirectory = await createSeedRoot(configuredSkill);
    const skillStore = {
      upsertSkillPackage: jest.fn().mockResolvedValue(undefined),
    };
    const service = new SkillPackageSeedService(
      [configuredSkill],
      rootDirectory,
      skillStore as never,
    );

    await service.seed();
    await service.seed();

    expect(skillStore.upsertSkillPackage).toHaveBeenCalledTimes(2);
    expect(skillStore.upsertSkillPackage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: "sample-skill" }),
    );
    expect(skillStore.upsertSkillPackage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: "sample-skill" }),
    );
  });
});
