/**
 * Version comparison tests for stored results analysis prompts
 * Compares v1.0.0 and v1.1.0 prompt versions on regression dataset
 *
 * Usage: npm run test:prompts:compare
 */

import "./testEnv";
import fs from "node:fs";
import path from "node:path";
import { compareVersions } from "./runners/compare-versions";
import { PROMPT_VERSIONS } from "./runners/versions";
import type { TestCase } from "./templates/types";

describe("Prompt Version Comparison", () => {
  jest.setTimeout(300_000); // 5 minutes for parallel runs

  describe("Regression Dataset Comparison (v1.0.0 vs v1.1.0)", () => {
    let report: Awaited<ReturnType<typeof compareVersions>>;

    beforeAll(async () => {
      const datasetPath = path.join(
        process.cwd(),
        "prompt-tests/datasets/stored-results-analysis/regression.json",
      );
      const cases = JSON.parse(
        fs.readFileSync(datasetPath, "utf8"),
      ) as TestCase[];

      const v1_0_0 = PROMPT_VERSIONS["v1.0.0"];
      const v1_1_0 = PROMPT_VERSIONS["v1.1.0"];

      if (!v1_0_0 || !v1_1_0) {
        throw new Error("Missing prompt versions in registry");
      }

      report = await compareVersions(cases, [v1_0_0, v1_1_0]);
    });

    it("should complete evaluation for both versions", () => {
      expect(report.versions).toHaveLength(2);
      expect(report.versions[0]?.version).toBe("v1.0.0");
      expect(report.versions[1]?.version).toBe("v1.1.0");
    });

    it("should track categorization accuracy for each version", () => {
      report.versions.forEach((vr) => {
        console.log(`\n${vr.version} Metrics:`);
        console.log(
          `  Category Accuracy: ${(vr.metrics.categoryAccuracy * 100).toFixed(1)}%`,
        );
        console.log(
          `  Success Rate: ${(vr.metrics.successRate * 100).toFixed(1)}%`,
        );
        console.log(
          `  Avg Confidence: ${vr.metrics.avgConfidence.toFixed(2)}`,
        );

        expect(vr.metrics.categoryAccuracy).toBeGreaterThan(0);
        expect(vr.metrics.avgConfidence).toBeGreaterThanOrEqual(1);
        expect(vr.metrics.avgConfidence).toBeLessThanOrEqual(5);
      });
    });

    it("should report confidence score distribution by category", () => {
      report.versions.forEach((vr) => {
        console.log(`\n${vr.version} Confidence by Category:`);
        Object.entries(vr.metrics.confidenceByCategory).forEach(
          ([cat, conf]) => {
            console.log(`  ${cat}: ${conf.toFixed(2)}`);
          },
        );

        expect(Object.keys(vr.metrics.confidenceByCategory).length).toBeGreaterThan(
          0,
        );
      });
    });

    it("should report error quality scoring consistency", () => {
      const v1_1_0_result = report.versions.find((v) => v.version === "v1.1.0");
      expect(v1_1_0_result?.metrics.errorQualityDistribution).toBeDefined();

      if (v1_1_0_result?.metrics.errorQualityDistribution) {
        console.log("\nError Quality Distribution (v1.1.0):");
        Object.entries(v1_1_0_result.metrics.errorQualityDistribution).forEach(
          ([score, count]) => {
            console.log(`  Score ${score}: ${count} cases`);
          },
        );
      }
    });

    it("should identify category mismatches between versions", () => {
      console.log(
        `\nCategory Mismatches: ${report.differences.categoryMismatches.length}`,
      );

      if (report.differences.categoryMismatches.length > 0) {
        console.log("\nTop Category Differences:");
        report.differences.categoryMismatches
          .slice(0, 10)
          .forEach((diff) => {
            console.log(`  ${diff.testCaseName}:`);
            console.log(
              `    v1.0.0: ${diff.v1_0_0} → v1.1.0: ${diff.v1_1_0}`,
            );
          });
      }

      // This is informational - not a failure condition
      expect(report.differences.categoryMismatches).toBeDefined();
    });

    it("should track significant confidence deltas", () => {
      console.log(
        `\nSignificant Confidence Deltas: ${report.differences.confidenceDeltas.length}`,
      );

      if (report.differences.confidenceDeltas.length > 0) {
        console.log("\nTop Confidence Changes:");
        report.differences.confidenceDeltas
          .slice(0, 10)
          .forEach((diff) => {
            console.log(`  ${diff.testCaseName}:`);
            console.log(
              `    ${diff.v1_0_0} → ${diff.v1_1_0} (delta: ${diff.delta > 0 ? "+" : ""}${diff.delta})`,
            );
          });
      }

      expect(report.differences.confidenceDeltas).toBeDefined();
    });

    it("should compare error quality scoring between versions", () => {
      const errorQualityDiffs =
        report.differences.errorQualityComparison.filter(
          (eq) => eq.v1_0_0 !== eq.v1_1_0,
        );

      console.log(`\nError Quality Differences: ${errorQualityDiffs.length}`);

      if (errorQualityDiffs.length > 0) {
        console.log("\nError Quality Score Differences:");
        errorQualityDiffs.slice(0, 10).forEach((diff) => {
          console.log(`  ${diff.testCaseName}:`);
          console.log(`    v1.0.0: ${diff.v1_0_0} → v1.1.0: ${diff.v1_1_0}`);
        });
      }

      expect(report.differences.errorQualityComparison).toBeDefined();
    });
  });
});
