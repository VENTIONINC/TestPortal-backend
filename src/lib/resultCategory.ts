// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type {
  IssueCategorySummary,
  ResultCategory,
  ResultCategoryDistribution,
  ResultCategorySource,
} from "@/types/resultCategory";

export const SUPPORTED_RESULT_CATEGORIES = [
  "bug",
  "infra",
  "performance",
  "script",
  "other",
] as const;

const SUPPORTED_CATEGORY_SET = new Set<string>(SUPPORTED_RESULT_CATEGORIES);

export function normalizeResultCategory(
  value: string | null | undefined,
): ResultCategory | null {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (normalized === "environment") {
    return "infra";
  }

  return SUPPORTED_CATEGORY_SET.has(normalized)
    ? (normalized as ResultCategory)
    : null;
}

export function getEffectiveResultCategory(
  source: Pick<
    ResultCategorySource,
    "analysisCategory" | "analysisFeedbackCategory"
  >,
): ResultCategory | null {
  return normalizeResultCategory(
    source.analysisFeedbackCategory ?? source.analysisCategory,
  );
}

export function buildIssueCategorySummary(
  results: readonly ResultCategorySource[],
): IssueCategorySummary {
  const distribution: ResultCategoryDistribution = {
    bug: 0,
    infra: 0,
    performance: 0,
    script: 0,
    other: 0,
  };
  const uniqueResults = new Map(results.map((result) => [result.id, result]));
  let uncategorizedCount = 0;

  for (const result of uniqueResults.values()) {
    const category = getEffectiveResultCategory(result);

    if (category) {
      distribution[category]++;
    } else {
      uncategorizedCount++;
    }
  }

  const populatedCategories = SUPPORTED_RESULT_CATEGORIES.filter(
    (category) => distribution[category] > 0,
  );

  if (populatedCategories.length === 0) {
    return {
      displayCategory: null,
      isMixed: false,
      distribution,
      uncategorizedCount,
    };
  }

  if (populatedCategories.length === 1) {
    return {
      displayCategory: populatedCategories[0] ?? null,
      isMixed: false,
      distribution,
      uncategorizedCount,
    };
  }

  const highestCount = Math.max(
    ...populatedCategories.map((category) => distribution[category]),
  );
  const dominantCategories = populatedCategories.filter(
    (category) => distribution[category] === highestCount,
  );

  return {
    displayCategory:
      dominantCategories.length === 1 ? (dominantCategories[0] ?? null) : null,
    isMixed: true,
    distribution,
    uncategorizedCount,
  };
}
