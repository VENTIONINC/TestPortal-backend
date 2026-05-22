// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import {
  getTimePeriod,
  formatDateOnly,
  formatHour,
  generateExecutionIdentifier,
  extractDateFromRunId,
  generateFallbackIdentifier,
} from "@/lib/executionIdentifiers";

describe("executionIdentifiers", () => {
  describe("getTimePeriod", () => {
    it("should return correct time periods", () => {
      expect(getTimePeriod(3)).toBe("night");
      expect(getTimePeriod(8)).toBe("morning");
      expect(getTimePeriod(14)).toBe("afternoon");
      expect(getTimePeriod(20)).toBe("evening");
      expect(getTimePeriod(0)).toBe("night");
      expect(getTimePeriod(6)).toBe("morning");
      expect(getTimePeriod(12)).toBe("afternoon");
      expect(getTimePeriod(18)).toBe("evening");
    });
  });

  describe("formatDateOnly", () => {
    it("should format date as YYYY-MM-DD", () => {
      const date = new Date("2025-05-14T10:30:00Z");
      expect(formatDateOnly(date)).toBe("2025-05-14");
    });
  });

  describe("formatHour", () => {
    it("should format hour with leading zero", () => {
      const date = new Date(2025, 4, 14, 7, 30, 0); // Local time
      expect(formatHour(date)).toBe("07");
      
      const date2 = new Date(2025, 4, 14, 14, 30, 0); // Local time
      expect(formatHour(date2)).toBe("14");
    });
  });

  describe("generateExecutionIdentifier", () => {
    const testDate = new Date(2025, 4, 14, 10, 30, 0); // Local time - 10:30 AM

    it("should generate time-period based identifier", () => {
      const identifier = generateExecutionIdentifier({
        env: "staging",
        version: "1.2.3",
        startTime: testDate,
        strategy: "time-period",
      });
      expect(identifier).toBe("STAGING_1.2.3_2025-05-14_MORNING");
    });

    it("should generate hourly based identifier", () => {
      const identifier = generateExecutionIdentifier({
        env: "production",
        version: "2.0.0",
        startTime: testDate,
        strategy: "hourly",
      });
      expect(identifier).toBe("PRODUCTION_2.0.0_2025-05-14_10");
    });

    it("should generate daily based identifier", () => {
      const identifier = generateExecutionIdentifier({
        env: "test",
        version: "3.0.0",
        startTime: testDate,
        strategy: "daily",
      });
      expect(identifier).toBe("TEST_3.0.0_2025-05-14");
    });

    it("should use defaults for missing parameters", () => {
      const identifier = generateExecutionIdentifier({});
      expect(identifier).toMatch(/^UNKNOWN_UNKNOWN_\d{4}-\d{2}-\d{2}_(NIGHT|MORNING|AFTERNOON|EVENING)$/);
    });
  });

  describe("extractDateFromRunId", () => {
    it("should extract date from DD-MM-YYYY-HH:MM:SS format", () => {
      const runId = "MSA_NIGHTLY_AUTOMATED_TEST_RUN_msa-nightly-group-2-run-14-05-2025-07:28:38";
      const extractedDate = extractDateFromRunId(runId);
      expect(extractedDate).toBeInstanceOf(Date);
      expect(extractedDate?.getFullYear()).toBe(2025);
      expect(extractedDate?.getMonth()).toBe(4); // May (0-indexed)
      expect(extractedDate?.getDate()).toBe(14);
      expect(extractedDate?.getHours()).toBe(7);
      expect(extractedDate?.getMinutes()).toBe(28);
      expect(extractedDate?.getSeconds()).toBe(38);
    });

    it("should extract date from YYYY-MM-DD format", () => {
      const runId = "TEST_RUN_2025-12-25";
      const extractedDate = extractDateFromRunId(runId);
      expect(extractedDate).toBeInstanceOf(Date);
      expect(extractedDate?.getFullYear()).toBe(2025);
      expect(extractedDate?.getMonth()).toBe(11); // December (0-indexed)
      expect(extractedDate?.getDate()).toBe(25);
    });

    it("should return null for unrecognized formats", () => {
      const runId = "RANDOM_RUN_ID_WITH_NO_DATE";
      const extractedDate = extractDateFromRunId(runId);
      expect(extractedDate).toBeNull();
    });
  });

  describe("generateFallbackIdentifier", () => {
    it("should generate fallback identifier with defaults", () => {
      const identifier = generateFallbackIdentifier();
      expect(identifier).toMatch(/^UNKNOWN_UNKNOWN_\d{4}-\d{2}-\d{2}_(NIGHT|MORNING|AFTERNOON|EVENING)$/);
    });

    it("should use provided parameters", () => {
      const testDate = new Date(2025, 7, 15, 16, 45, 0); // Local time - August 15, 4:45 PM
      const identifier = generateFallbackIdentifier(
        "production",
        "4.5.6",
        testDate,
        "hourly"
      );
      expect(identifier).toBe("PRODUCTION_4.5.6_2025-08-15_16");
    });
  });
});