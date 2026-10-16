// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export const FUTURE_TIMESTAMP_THRESHOLD_MINUTES = 10 as const;

const MILLISECONDS_PER_MINUTE = 60_000;
const FUTURE_TIMESTAMP_THRESHOLD_MS =
  FUTURE_TIMESTAMP_THRESHOLD_MINUTES * MILLISECONDS_PER_MINUTE;

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

const formatDeviation = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
};

const buildValidationMessage = (
  count: number,
  maxDeviationMinutes: number,
): string => {
  const timestampLabel = count === 1 ? "timestamp" : "timestamps";
  const exceedVerb = count === 1 ? "exceeds" : "exceed";

  return `Import failed. Future test execution timestamps were detected. ${count} ${timestampLabel} ${exceedVerb} the allowed ${FUTURE_TIMESTAMP_THRESHOLD_MINUTES}-minute tolerance. Maximum deviation: ${formatDeviation(maxDeviationMinutes)}. No data was imported.`;
};

export class FutureReportTimestampsError extends Error {
  readonly count: number;
  readonly maxDeviationMinutes: number;
  readonly thresholdMinutes = FUTURE_TIMESTAMP_THRESHOLD_MINUTES;

  constructor(count: number, maxDeviationMinutes: number) {
    super(buildValidationMessage(count, maxDeviationMinutes));
    this.name = "FutureReportTimestampsError";
    this.count = count;
    this.maxDeviationMinutes = maxDeviationMinutes;
  }
}

export const formatFutureReportTimestampsError = (
  error: FutureReportTimestampsError,
  originalFileName?: string,
): string => {
  if (!originalFileName) {
    return error.message;
  }

  return error.message.replace(
    "Import failed.",
    `Import failed for file "${originalFileName}".`,
  );
};

export const validateReportTimestamps = (
  report: TimestampedReport,
  now: Date = new Date(),
): void => {
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
    return;
  }

  const maxDeviationMs = Math.max(...futureDeviations);
  const maxDeviationMinutes = Math.ceil(
    maxDeviationMs / MILLISECONDS_PER_MINUTE,
  );

  throw new FutureReportTimestampsError(
    futureDeviations.length,
    maxDeviationMinutes,
  );
};
