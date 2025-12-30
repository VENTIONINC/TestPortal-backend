/**
 * Version comparison utility for prompt testing
 * Runs multiple prompt versions in parallel and generates comparison reports
 */

import type { TestCase } from "../templates/types";
import type { EvalResult } from "./types";
import { runEval, type PromptVersion } from "./stored-results-analysis";

/**
 * Metrics for a single version evaluation
 */
export interface VersionMetrics {
  totalCases: number;
  failures: number;
  successRate: number;
  categoryAccuracy: number;
  avgConfidence: number;
  confidenceByCategory: Record<string, number>;
  errorQualityDistribution?: Record<number, number>;
}

/**
 * Results for a single version evaluation
 */
export interface VersionComparisonResult {
  version: string;
  result: EvalResult;
  metrics: VersionMetrics;
}

/**
 * Detailed comparison report between versions
 */
export interface ComparisonReport {
  versions: VersionComparisonResult[];
  differences: {
    categoryMismatches: Array<{
      testCaseName: string;
      v1_0_0: string;
      v1_1_0: string;
    }>;
    confidenceDeltas: Array<{
      testCaseName: string;
      v1_0_0: number;
      v1_1_0: number;
      delta: number;
    }>;
    errorQualityComparison: Array<{
      testCaseName: string;
      v1_0_0?: number | null;
      v1_1_0?: number | null;
    }>;
  };
}

/**
 * Compare multiple prompt versions on the same test cases
 * Runs evaluations in parallel for efficiency
 */
export async function compareVersions(
  cases: TestCase[],
  versions: PromptVersion[],
  options?: {
    model?: string;
    temperature?: number;
  },
): Promise<ComparisonReport> {
  // Run evaluations in parallel
  const results = await Promise.all(
    versions.map(async (version) => {
      const evalResult = await runEval({
        cases,
        version,
        ...options,
      });

      return {
        version: version.version,
        result: evalResult,
        metrics: calculateMetrics(evalResult, cases),
      };
    }),
  );

  // Generate comparison report
  return {
    versions: results,
    differences: analyzeDifferences(results, cases),
  };
}

/**
 * Calculate metrics from evaluation results
 */
function calculateMetrics(
  evalResult: EvalResult,
  cases: TestCase[],
): VersionMetrics {
  const { response, failures } = evalResult;
  const byId = new Map(response.results.map((r: any) => [r.id, r]));

  let categoryCorrect = 0;
  let totalConfidence = 0;
  const confidenceByCategory: Record<string, { sum: number; count: number }> =
    {};
  const errorQualityDist: Record<number, number> = {};

  for (const tc of cases) {
    const out: any = byId.get(tc.input.id);
    if (!out) continue;

    // Category accuracy
    if (out.category === tc.expect.category) categoryCorrect++;

    // Confidence tracking
    totalConfidence += out.confidence;
    confidenceByCategory[out.category] ??= { sum: 0, count: 0 };
    const categoryData = confidenceByCategory[out.category];
    if (categoryData) {
      categoryData.sum += out.confidence;
      categoryData.count++;
    }

    // Error quality distribution
    const errorQuality =
      "errorQuality" in out && out.errorQuality !== null
        ? out.errorQuality
        : undefined;
    if (errorQuality !== undefined) {
      errorQualityDist[errorQuality] =
        (errorQualityDist[errorQuality] ?? 0) + 1;
    }
  }

  const metrics: VersionMetrics = {
    totalCases: cases.length,
    failures: failures.length,
    successRate: (cases.length - failures.length) / cases.length,
    categoryAccuracy: categoryCorrect / cases.length,
    avgConfidence: totalConfidence / cases.length,
    confidenceByCategory: Object.fromEntries(
      Object.entries(confidenceByCategory).map(([cat, { sum, count }]) => [
        cat,
        sum / count,
      ]),
    ),
  };

  // Only add errorQualityDistribution if there are values
  if (Object.keys(errorQualityDist).length > 0) {
    metrics.errorQualityDistribution = errorQualityDist;
  }

  return metrics;
}

/**
 * Analyze differences between version results
 */
function analyzeDifferences(
  results: VersionComparisonResult[],
  cases: TestCase[],
): ComparisonReport["differences"] {
  const v1_0_0_result = results[0];
  const v1_1_0_result = results[1];

  if (!v1_0_0_result || !v1_1_0_result) {
    return {
      categoryMismatches: [],
      confidenceDeltas: [],
      errorQualityComparison: [],
    };
  }

  const v1_0_0_byId = new Map(
    v1_0_0_result.result.response.results.map((r: any) => [r.id, r]),
  );
  const v1_1_0_byId = new Map(
    v1_1_0_result.result.response.results.map((r: any) => [r.id, r]),
  );

  const categoryMismatches: ComparisonReport["differences"]["categoryMismatches"] =
    [];
  const confidenceDeltas: ComparisonReport["differences"]["confidenceDeltas"] =
    [];
  const errorQualityComparison: ComparisonReport["differences"]["errorQualityComparison"] =
    [];

  for (const tc of cases) {
    const v1_0_0 = v1_0_0_byId.get(tc.input.id);
    const v1_1_0 = v1_1_0_byId.get(tc.input.id);

    if (!v1_0_0 || !v1_1_0) continue;

    // Category differences
    if (v1_0_0.category !== v1_1_0.category) {
      categoryMismatches.push({
        testCaseName: tc.name,
        v1_0_0: v1_0_0.category,
        v1_1_0: v1_1_0.category,
      });
    }

    // Confidence deltas
    const delta = v1_1_0.confidence - v1_0_0.confidence;
    if (Math.abs(delta) >= 1) {
      confidenceDeltas.push({
        testCaseName: tc.name,
        v1_0_0: v1_0_0.confidence,
        v1_1_0: v1_1_0.confidence,
        delta,
      });
    }

    // Error quality comparison (if applicable)
    if (tc.input.status === "failed") {
      // Both versions use nullable() now, so handling is consistent
      const v1_0_0_eq: number | null | undefined =
        "errorQuality" in v1_0_0 ? v1_0_0.errorQuality : undefined;
      const v1_1_0_eq: number | null | undefined =
        "errorQuality" in v1_1_0 ? v1_1_0.errorQuality : undefined;

      const comparison: {
        testCaseName: string;
        v1_0_0?: number | null;
        v1_1_0?: number | null;
      } = {
        testCaseName: tc.name,
      };

      if (v1_0_0_eq !== undefined) {
        comparison.v1_0_0 = v1_0_0_eq;
      }
      if (v1_1_0_eq !== undefined) {
        comparison.v1_1_0 = v1_1_0_eq;
      }

      errorQualityComparison.push(comparison);
    }
  }

  return {
    categoryMismatches,
    confidenceDeltas: confidenceDeltas.sort(
      (a, b) => Math.abs(b.delta) - Math.abs(a.delta),
    ),
    errorQualityComparison,
  };
}
