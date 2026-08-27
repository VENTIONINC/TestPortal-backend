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
    it("uses the persisted issue category when there are no results", () => {
      expect(buildIssueCategorySummary([], "other")).toEqual({
        displayCategory: "other",
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

    it("keeps the persisted issue category for a unanimous mismatching result category", () => {
      const summary = buildIssueCategorySummary(
        [
          { id: "one", analysisCategory: "BUG" },
          { id: "two", analysisCategory: "bug" },
        ],
        "infra",
      );

      expect(summary.displayCategory).toBe("infra");
      expect(summary.isMixed).toBe(false);
      expect(summary.distribution.bug).toBe(2);
    });

    it("keeps the persisted issue category for mixed results", () => {
      const summary = buildIssueCategorySummary(
        [
          { id: "one", analysisCategory: "bug" },
          { id: "two", analysisCategory: "bug" },
          { id: "three", analysisCategory: "script" },
        ],
        "other",
      );

      expect(summary.displayCategory).toBe("other");
      expect(summary.isMixed).toBe(true);
    });

    it("keeps the persisted issue category for a tie", () => {
      const summary = buildIssueCategorySummary(
        [
          { id: "one", analysisCategory: "bug" },
          { id: "two", analysisCategory: "script" },
        ],
        "performance",
      );

      expect(summary.displayCategory).toBe("performance");
      expect(summary.isMixed).toBe(true);
    });

    it("tracks uncategorized values separately", () => {
      const summary = buildIssueCategorySummary(
        [
          { id: "one", analysisCategory: null },
          { id: "two", analysisCategory: "unsupported" },
          { id: "three", analysisFeedbackCategory: "" },
        ],
        "script",
      );

      expect(summary.uncategorizedCount).toBe(3);
      expect(summary.distribution.other).toBe(0);
      expect(summary.displayCategory).toBe("script");
      expect(summary.isMixed).toBe(false);
    });

    it("normalizes the legacy environment category", () => {
      const summary = buildIssueCategorySummary(
        [{ id: "one", analysisCategory: "ENVIRONMENT" }],
        "bug",
      );

      expect(summary.displayCategory).toBe("bug");
      expect(summary.distribution.infra).toBe(1);
    });

    it("deduplicates repeated graph paths by result ID", () => {
      const summary = buildIssueCategorySummary(
        [
          { id: "one", analysisCategory: "bug" },
          { id: "one", analysisCategory: "bug" },
          { id: "two", analysisCategory: "script" },
        ],
        "other",
      );

      expect(summary.distribution.bug).toBe(1);
      expect(summary.distribution.script).toBe(1);
    });
  });
});
