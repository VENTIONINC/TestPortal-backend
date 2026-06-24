// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Dataset generation script for prompt testing framework
 * Generates smoke and regression test datasets using template factories
 *
 * Usage: npm run gen:prompt-datasets
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { templateFactories } from "./v1.1.0/templates/stored-results-analysis/index.js";
import type { TestCase } from "./v1.1.0/templates/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensure directory exists, creating it recursively if needed
 */
function ensureDir(p: string): void {
  fs.mkdirSync(p, { recursive: true });
}

/**
 * Write data to JSON file with pretty formatting
 */
function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/**
 * Generate test cases by running each template factory N times
 * @param countPerTemplate - Number of variations to generate per template
 * @returns Array of generated test cases
 */
function generate(countPerTemplate: number): TestCase[] {
  const cases: TestCase[] = [];
  for (const factory of templateFactories) {
    for (let i = 0; i < countPerTemplate; i++) {
      cases.push(factory(i));
    }
  }
  return cases;
}

// Setup output directory
const outDir = path.resolve(__dirname, "datasets", "stored-results-analysis");
ensureDir(outDir);

// Generate smoke dataset: 1 variant per template (4 total)
const smoke = generate(1);

// Generate regression dataset: 10 variants per template (40 total)
const regression = generate(10);

// Write datasets to files
writeJson(path.join(outDir, "smoke.json"), smoke);
writeJson(path.join(outDir, "regression.json"), regression);

// Output summary
console.log(`✅ Generated prompt test datasets:`);
console.log(
  `   📄 Smoke: ${smoke.length} cases (${templateFactories.length} templates × 1 variant)`,
);
console.log(
  `   📄 Regression: ${regression.length} cases (${templateFactories.length} templates × 10 variants)`,
);
console.log(`   📁 Location: ${outDir}`);
