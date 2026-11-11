// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { copyFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(repositoryRoot, "src/config/ai-config.default.json");
const destinationPath = resolve(
  repositoryRoot,
  "dist/src/config/ai-config.default.json",
);

await mkdir(dirname(destinationPath), { recursive: true });
await copyFile(sourcePath, destinationPath);
