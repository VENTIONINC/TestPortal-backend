// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  formatFutureReportTimestampsError,
  FutureReportTimestampsError,
  validateReportTimestamps,
} from "@/lib/reportTimestampWarnings";
import type { ReportData } from "@/services/jsonReportService";

const NOW = new Date("2026-08-14T12:00:00.000Z");

const createReport = (
  executionStartTime: string | Date,
  resultStartTimes: Array<string | Date>,
): ReportData => ({
  provider: "Playwright",
  stats: { startTime: executionStartTime },
  tests: [
    {
      title: "timestamp validation",
      location: { file: "timestamp.spec.ts", line: 1 },
      results: resultStartTimes.map((startTime) => ({
        retry: 0,
        status: "passed",
        duration: 1,
        startTime,
        workerIndex: 0,
      })),
    },
  ],
});

describe("validateReportTimestamps", () => {
  it("accepts past, current, exactly-threshold, and invalid timestamps", () => {
    const report = createReport(NOW, [
      "2026-08-14T11:59:59.999Z",
      NOW,
      "2026-08-14T12:10:00.000Z",
      "invalid-date",
    ]);

    expect(() => validateReportTimestamps(report, NOW)).not.toThrow();
  });

  it("rejects a timestamp that exceeds the threshold by one millisecond", () => {
    const report = createReport("2026-08-14T12:10:00.001Z", [NOW]);

    expect(() => validateReportTimestamps(report, NOW)).toThrow(
      "1 timestamp exceeds the allowed 10-minute tolerance. Maximum deviation: 11m.",
    );
    expect(() => validateReportTimestamps(report, NOW)).toThrow(
      FutureReportTimestampsError,
    );
  });

  it("reports the execution/result count and formatted maximum deviation", () => {
    const report = createReport("2026-08-14T12:15:00.000Z", [
      "2026-08-14T12:20:00.000Z",
      "2026-08-14T14:15:00.000Z",
      "2026-08-14T11:00:00.000Z",
    ]);

    expect(() => validateReportTimestamps(report, NOW)).toThrow(
      "Import failed. Future test execution timestamps were detected. 3 timestamps exceed the allowed 10-minute tolerance. Maximum deviation: 2h 15m. No data was imported.",
    );

    try {
      validateReportTimestamps(report, NOW);
    } catch (error) {
      expect(error).toMatchObject({
        name: "FutureReportTimestampsError",
        count: 3,
        maxDeviationMinutes: 135,
        thresholdMinutes: 10,
      });
    }
  });

  it("adds the uploaded filename to the validation message", () => {
    const error = new FutureReportTimestampsError(1, 45);

    expect(
      formatFutureReportTimestampsError(error, "invalid-results.ctrf.json"),
    ).toBe(
      'Import failed for file "invalid-results.ctrf.json". Future test execution timestamps were detected. 1 timestamp exceeds the allowed 10-minute tolerance. Maximum deviation: 45m. No data was imported.',
    );
  });
});
