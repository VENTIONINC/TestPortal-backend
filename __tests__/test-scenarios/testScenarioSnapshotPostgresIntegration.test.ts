// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { dbClient } from "@/prisma/client";
import { readTestScenarioSnapshot } from "@/models/testScenarioSnapshotModel";

const describePostgres =
  process.env.RUN_POSTGRES_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describePostgres("project scenario snapshots", () => {
  const userId = randomUUID();
  const projectId = randomUUID();
  const otherProjectId = randomUUID();

  beforeAll(async () => {
    await dbClient.user.create({
      data: {
        id: userId,
        name: "Snapshot test",
        email: `${userId}@example.test`,
      },
    });
    await dbClient.project.createMany({
      data: [projectId, otherProjectId].map((id) => ({
        id,
        ownerId: userId,
        name: `Snapshot ${id}`,
      })),
    });
  });

  afterAll(async () => {
    await dbClient.project.deleteMany({
      where: { id: { in: [projectId, otherProjectId] } },
    });
    await dbClient.user.deleteMany({ where: { id: userId } });
    await dbClient.$disconnect();
  });

  it("returns the exact saved Markdown and organization metadata for one project", async () => {
    expect(await readTestScenarioSnapshot(randomUUID())).toBeNull();
    expect(await readTestScenarioSnapshot(projectId)).toMatchObject({
      scenarios: [],
    });

    const folder = await dbClient.testScenarioFolder.create({
      data: { projectId, name: "Regression" },
    });
    const suite = await dbClient.testSuite.create({
      data: { projectId, name: "Release checks" },
    });
    const saved = {
      projectId,
      title: "Saved snapshot title",
      createdById: userId,
      revision: 3,
      scenarioNumber: 1,
      scenarioKey: "TEST-001",
      folderId: folder.id,
      contentMd: "# Exact markdown\r\n\r\n**Erreur** 🧪  \n",
      contentMdHash: "0".repeat(64),
    };
    const scenario = await dbClient.testScenario.create({ data: saved });
    await dbClient.testScenario.create({
      data: { ...saved, projectId: otherProjectId, folderId: null },
    });
    await dbClient.testSuiteMember.create({
      data: { testScenarioId: scenario.id, suiteId: suite.id, position: 0 },
    });

    expect(await readTestScenarioSnapshot(projectId)).toEqual({
      projectId,
      snapshotTime: expect.any(Date),
      scenarios: [
        {
          projectId,
          scenarioId: scenario.id,
          revision: saved.revision,
          scenarioKey: saved.scenarioKey,
          folderId: folder.id,
          suiteIds: [suite.id],
          contentMd: saved.contentMd,
        },
      ],
    });

    const temp = await mkdtemp(join(tmpdir(), "testportal-snapshot-test-"));
    const output = join(temp, "snapshot");
    try {
      execFileSync(process.execPath, [
        "--import",
        "tsx",
        "scripts/export-scenario-snapshot.ts",
        "--project-id",
        projectId,
        "--dir",
        output,
      ]);
      const jsonl = await readFile(join(output, "scenarios.jsonl"));
      const manifest = JSON.parse(
        await readFile(join(output, "manifest.json"), "utf8"),
      );
      const records = jsonl
        .toString("utf8")
        .trimEnd()
        .split("\n")
        .map((line) => JSON.parse(line));
      expect(records).toEqual(
        (await readTestScenarioSnapshot(projectId))?.scenarios,
      );
      expect(manifest).toEqual({
        formatVersion: 1,
        projectId,
        snapshotTime: expect.stringMatching(/Z$/),
        scenarioCount: records.length,
        sha256: createHash("sha256").update(jsonl).digest("hex"),
      });
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  });
});
