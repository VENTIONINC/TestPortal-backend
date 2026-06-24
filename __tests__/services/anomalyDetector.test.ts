// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { anomalyDetector } from "@/services/anomalyDetector";

describe("anomalyDetector.detect", () => {
  it("returns empty array for flat datasets", () => {
    const result = anomalyDetector.detect([
      { date: "2026-01-01", total: 10, passed: 9, failed: 1, skipped: 0 },
      { date: "2026-01-02", total: 10, passed: 9, failed: 1, skipped: 0 },
      { date: "2026-01-03", total: 10, passed: 9, failed: 1, skipped: 0 },
    ]);

    expect(result).toEqual([]);
  });

  it("returns a spike anomaly for total runs above threshold", () => {
    const result = anomalyDetector.detect([
      { date: "2026-01-01", total: 10, passed: 9, failed: 1, skipped: 0 },
      { date: "2026-01-02", total: 16, passed: 15, failed: 1, skipped: 0 },
      { date: "2026-01-03", total: 10, passed: 9, failed: 1, skipped: 0 },
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: "2026-01-02",
          metric: "total_runs",
          direction: "spike",
        }),
      ]),
    );
  });

  it("returns a drop anomaly for pass rate below threshold", () => {
    const result = anomalyDetector.detect([
      { date: "2026-01-01", total: 10, passed: 9, failed: 1, skipped: 0 },
      { date: "2026-01-02", total: 10, passed: 4, failed: 6, skipped: 0 },
      { date: "2026-01-03", total: 10, passed: 9, failed: 1, skipped: 0 },
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          date: "2026-01-02",
          metric: "pass_rate",
          direction: "drop",
        }),
      ]),
    );
  });

  it("returns empty array for empty input", () => {
    expect(anomalyDetector.detect([])).toEqual([]);
  });

  it("returns empty array for a single bucket", () => {
    expect(
      anomalyDetector.detect([
        { date: "2026-01-01", total: 10, passed: 9, failed: 1, skipped: 0 },
      ]),
    ).toEqual([]);
  });
});