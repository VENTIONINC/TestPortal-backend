// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export const FUTURE_TIMESTAMP_THRESHOLD_MINUTES = 10 as const;

const MILLISECONDS_PER_MINUTE = 60_000;
const FUTURE_TIMESTAMP_THRESHOLD_MS =
  FUTURE_TIMESTAMP_THRESHOLD_MINUTES * MILLISECONDS_PER_MINUTE;

export interface FutureExecutionTimestampsWarning {
  code: "FUTURE_EXECUTION_TIMESTAMPS";
  count: number;
  maxDeviationMinutes: number;
  thresholdMinutes: typeof FUTURE_TIMESTAMP_THRESHOLD_MINUTES;
}

interface TimestampedReport {
  stats?: { startTime?: string | Date };
  tests: Array<{
    results: Array<{ startTime: string | Date }>;
  }>;
}

const toValidTimestamp = (value: string | Date): number | undefined => {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? undefined : timestamp;
};

export const detectFutureReportTimestamps = (
  report: TimestampedReport,
  now: Date = new Date(),
): FutureExecutionTimestampsWarning[] => {
  const timestampValues: Array<string | Date> = report.tests.flatMap((test) =>
    test.results.map((result) => result.startTime),
  );

  if (report.stats?.startTime !== undefined) {
    timestampValues.unshift(report.stats.startTime);
  }

  const futureDeviations = timestampValues
    .map(toValidTimestamp)
    .filter((timestamp): timestamp is number => timestamp !== undefined)
    .map((timestamp) => timestamp - now.getTime())
    .filter((deviation) => deviation > FUTURE_TIMESTAMP_THRESHOLD_MS);

  if (futureDeviations.length === 0) {
    return [];
  }

  const maxDeviationMs = Math.max(...futureDeviations);

  return [
    {
      code: "FUTURE_EXECUTION_TIMESTAMPS",
      count: futureDeviations.length,
      maxDeviationMinutes:
        Math.ceil((maxDeviationMs / MILLISECONDS_PER_MINUTE) * 100) / 100,
      thresholdMinutes: FUTURE_TIMESTAMP_THRESHOLD_MINUTES,
    },
  ];
};
