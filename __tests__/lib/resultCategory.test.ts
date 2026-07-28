// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  buildIssueCategorySummary,
  getEffectiveResultCategory,
  normalizeResultCategory,
} from "@/lib/resultCategory";

describe("resultCategory", () => {
  describe("normalizeResultCategory", () => {
    it.each([
      ["BUG", "bug"],
      [" Infra ", "infra"],
      ["PERFORMANCE", "performance"],
      ["Script", "script"],
      ["Other", "other"],
      ["ENVIRONMENT", "infra"],
    ])("normalizes %s to %s", (value, expected) => {
      expect(normalizeResultCategory(value)).toBe(expected);
    });

    it.each([undefined, null, "", " ", "unknown"])(
      "treats %s as uncategorized",
      (value) => {
        expect(normalizeResultCategory(value)).toBeNull();
      },
    );
  });

  describe("getEffectiveResultCategory", () => {
    it("prefers feedback over AI analysis", () => {
      expect(
        getEffectiveResultCategory({
          analysisCategory: "bug",
          analysisFeedbackCategory: "script",
        }),
      ).toBe("script");
    });

    it("does not fall back when authoritative feedback is unsupported", () => {
      expect(
        getEffectiveResultCategory({
          analysisCategory: "bug",
          analysisFeedbackCategory: "unsupported",
        }),
      ).toBeNull();
    });
  });

  describe("buildIssueCategorySummary", () => {
    it("returns an empty summary when there are no results", () => {
      expect(buildIssueCategorySummary([])).toEqual({
        displayCategory: null,
        isMixed: false,
        distribution: {
          bug: 0,
          infra: 0,
          performance: 0,
          script: 0,
          other: 0,
        },
        uncategorizedCount: 0,
      });
    });

    it("returns a unanimous category", () => {
      const summary = buildIssueCategorySummary([
        { id: "one", analysisCategory: "BUG" },
        { id: "two", analysisCategory: "bug" },
      ]);

      expect(summary.displayCategory).toBe("bug");
      expect(summary.isMixed).toBe(false);
      expect(summary.distribution.bug).toBe(2);
    });

    it("returns the dominant category for mixed results", () => {
      const summary = buildIssueCategorySummary([
        { id: "one", analysisCategory: "bug" },
        { id: "two", analysisCategory: "bug" },
        { id: "three", analysisCategory: "script" },
      ]);

      expect(summary.displayCategory).toBe("bug");
      expect(summary.isMixed).toBe(true);
    });

    it("returns no display category for a tie", () => {
      const summary = buildIssueCategorySummary([
        { id: "one", analysisCategory: "bug" },
        { id: "two", analysisCategory: "script" },
      ]);

      expect(summary.displayCategory).toBeNull();
      expect(summary.isMixed).toBe(true);
    });

    it("tracks uncategorized values separately", () => {
      const summary = buildIssueCategorySummary([
        { id: "one", analysisCategory: null },
        { id: "two", analysisCategory: "unsupported" },
        { id: "three", analysisFeedbackCategory: "" },
      ]);

      expect(summary.uncategorizedCount).toBe(3);
      expect(summary.distribution.other).toBe(0);
    });

    it("normalizes the legacy environment category", () => {
      const summary = buildIssueCategorySummary([
        { id: "one", analysisCategory: "ENVIRONMENT" },
      ]);

      expect(summary.displayCategory).toBe("infra");
      expect(summary.distribution.infra).toBe(1);
    });

    it("deduplicates repeated graph paths by result ID", () => {
      const summary = buildIssueCategorySummary([
        { id: "one", analysisCategory: "bug" },
        { id: "one", analysisCategory: "bug" },
        { id: "two", analysisCategory: "script" },
      ]);

      expect(summary.distribution.bug).toBe(1);
      expect(summary.distribution.script).toBe(1);
    });
  });
});
