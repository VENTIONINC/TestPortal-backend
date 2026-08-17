// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  detectFutureReportTimestamps,
  FUTURE_TIMESTAMP_THRESHOLD_MINUTES,
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

describe("detectFutureReportTimestamps", () => {
  it("does not warn for past, current, or exactly-threshold timestamps", () => {
    const report = createReport(NOW, [
      "2026-08-14T11:59:59.999Z",
      NOW,
      "2026-08-14T12:10:00.000Z",
    ]);

    expect(detectFutureReportTimestamps(report, NOW)).toEqual([]);
  });

  it("warns when a timestamp exceeds the threshold by one millisecond", () => {
    const report = createReport("2026-08-14T12:10:00.001Z", [NOW]);

    expect(detectFutureReportTimestamps(report, NOW)).toEqual([
      {
        code: "FUTURE_EXECUTION_TIMESTAMPS",
        count: 1,
        maxDeviationMinutes: 10.01,
        thresholdMinutes: FUTURE_TIMESTAMP_THRESHOLD_MINUTES,
      },
    ]);
  });

  it("aggregates execution and result timestamps and ignores invalid values", () => {
    const report = createReport("2026-08-14T12:15:00.000Z", [
      "invalid-date",
      "2026-08-14T12:20:30.000Z",
      "2026-08-14T13:00:00.000Z",
      "2026-08-14T11:00:00.000Z",
    ]);

    expect(detectFutureReportTimestamps(report, NOW)).toEqual([
      {
        code: "FUTURE_EXECUTION_TIMESTAMPS",
        count: 3,
        maxDeviationMinutes: 60,
        thresholdMinutes: 10,
      },
    ]);
  });
});
