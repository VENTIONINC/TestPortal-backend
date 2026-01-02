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
  const byId = new Map(response.results.map((r) => [r.id, r]));

  let categoryCorrect = 0;
  let totalConfidence = 0;
  const confidenceByCategory: Record<string, { sum: number; count: number }> =
    {};
  const errorQualityDist: Record<number, number> = {};

  for (const tc of cases) {
    const out = byId.get(tc.input.id);
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
