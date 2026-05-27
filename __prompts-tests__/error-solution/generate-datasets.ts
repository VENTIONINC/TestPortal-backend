// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

/**
 * Dataset generation script for error solution prompt tests
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { templateFactories } from "./v1.0.0/templates/error-solution/index.js";
import type { TestCase } from "./v1.0.0/templates/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function generate(countPerTemplate: number): TestCase[] {
  const cases: TestCase[] = [];
  for (const factory of templateFactories) {
    for (let i = 0; i < countPerTemplate; i++) {
      cases.push(factory(i));
    }
  }
  return cases;
}

const outDir = path.resolve(__dirname, "datasets", "error-solution");
ensureDir(outDir);

const smoke = generate(1);
const regression = generate(2);

writeJson(path.join(outDir, "smoke.json"), smoke);
writeJson(path.join(outDir, "regression.json"), regression);

console.log("✅ Generated error-solution prompt datasets:");
console.log(
  `   📄 Smoke: ${smoke.length} cases (${templateFactories.length} templates × 1 variant)`,
);
console.log(
  `   📄 Regression: ${regression.length} cases (capped to 5 total cases)`,
);
console.log(`   📁 Location: ${outDir}`);
