// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";
import { createHash } from "node:crypto";
import { lstatSync } from "node:fs";
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";

import { z } from "zod";

import { readTestScenarioSnapshot } from "@/models/testScenarioSnapshotModel";
import { dbClient } from "@/prisma/client";

const usage =
  "Usage: npm run export-scenario-snapshot -- --project-id <uuid> --dir <new-directory>";

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      "project-id": { type: "string" },
      dir: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(usage);
    return;
  }
  const projectId = z.string().uuid().safeParse(values["project-id"]);
  if (!projectId.success || !values.dir) throw new Error(usage);

  const destination = resolve(values.dir);
  if (lstatSync(destination, { throwIfNoEntry: false })) {
    throw new Error(`Snapshot destination already exists: ${destination}`);
  }

  const snapshot = await readTestScenarioSnapshot(projectId.data);
  if (!snapshot) throw new Error(`Project not found: ${projectId.data}`);

  const staging = await mkdtemp(
    join(dirname(destination), ".scenario-snapshot-"),
  );
  try {
    const jsonl = snapshot.scenarios
      .map((row) => `${JSON.stringify(row)}\n`)
      .join("");
    const manifest = {
      formatVersion: 1,
      projectId: snapshot.projectId,
      snapshotTime: snapshot.snapshotTime.toISOString(),
      scenarioCount: snapshot.scenarios.length,
      sha256: createHash("sha256").update(jsonl, "utf8").digest("hex"),
    };

    await writeFile(join(staging, "scenarios.jsonl"), jsonl, { mode: 0o600 });
    await writeFile(
      join(staging, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      {
        mode: 0o600,
      },
    );
    await rename(staging, destination);
    console.log(
      `Exported ${manifest.scenarioCount} scenarios to ${destination}`,
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await dbClient.$disconnect();
}
