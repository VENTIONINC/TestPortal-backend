// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export type ResultCategory =
  | "bug"
  | "infra"
  | "performance"
  | "script"
  | "other";

export type ResultCategoryDistribution = Record<ResultCategory, number>;

export interface ResultCategorySource {
  id: string;
  analysisCategory?: string | null;
  analysisFeedbackCategory?: string | null;
}

export interface IssueCategorySummary {
  displayCategory: ResultCategory | null;
  isMixed: boolean;
  distribution: ResultCategoryDistribution;
  uncategorizedCount: number;
}
