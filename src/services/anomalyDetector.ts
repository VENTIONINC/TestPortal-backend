// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { PdfInsightAnomalyFlag } from "@/types/dashboard";

interface AnomalyBucket {
  date: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

const ANOMALY_THRESHOLD = 0.3;

function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculatePassRate(bucket: AnomalyBucket): number {
  const effectiveTotal = bucket.total - bucket.skipped;

  if (effectiveTotal <= 0) {
    return 0;
  }

  return (bucket.passed / effectiveTotal) * 100;
}

function buildAnomalyFlag(
  date: string,
  metric: PdfInsightAnomalyFlag["metric"],
  currentValue: number,
  averageValue: number,
): PdfInsightAnomalyFlag | null {
  if (averageValue <= 0) {
    return null;
  }

  const deviationRatio = Math.abs(currentValue - averageValue) / averageValue;

  if (deviationRatio <= ANOMALY_THRESHOLD) {
    return null;
  }

  return {
    date,
    metric,
    direction: currentValue > averageValue ? "spike" : "drop",
    deviationPct: Number((deviationRatio * 100).toFixed(2)),
  };
}

export const anomalyDetector = {
  detect(buckets: AnomalyBucket[]): PdfInsightAnomalyFlag[] {
    if (buckets.length < 2) {
      return [];
    }

    const averageTotalRuns = calculateAverage(
      buckets.map((bucket) => bucket.total),
    );
    const averagePassRate = calculateAverage(
      buckets.map((bucket) => calculatePassRate(bucket)),
    );

    const anomalyFlags: PdfInsightAnomalyFlag[] = [];

    for (const bucket of buckets) {
      const totalRunsAnomaly = buildAnomalyFlag(
        bucket.date,
        "total_runs",
        bucket.total,
        averageTotalRuns,
      );
      if (totalRunsAnomaly) {
        anomalyFlags.push(totalRunsAnomaly);
      }

      const passRateAnomaly = buildAnomalyFlag(
        bucket.date,
        "pass_rate",
        calculatePassRate(bucket),
        averagePassRate,
      );
      if (passRateAnomaly) {
        anomalyFlags.push(passRateAnomaly);
      }
    }

    return anomalyFlags;
  },
};

export type { AnomalyBucket };
