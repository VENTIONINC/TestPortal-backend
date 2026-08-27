// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { GetResultsParams } from "@/types";
import type { ResultCategory } from "@/types/resultCategory";

export function resolveExecutionTypeFilter(
  type?: string,
): string | undefined {
  if (!type || type === "all") {
    return undefined;
  }

  return type;
}

export function buildIssueParams(query: Record<string, string | undefined>) {
  const params: {
    projectId: string;
    category?: ResultCategory;
    name?: string;
    page?: number;
    limit?: number;
    statFrom?: string;
    statTo?: string;
    type?: string;
  } = { projectId: query.projectId ?? "" };

  if (query.category) params.category = query.category as ResultCategory;
  if (query.name) params.name = query.name;
  if (query.page) params.page = Number(query.page);
  if (query.limit) params.limit = Number(query.limit);
  if (query.statFrom) params.statFrom = query.statFrom;
  if (query.statTo) params.statTo = query.statTo;
  const type = resolveExecutionTypeFilter(query.type);
  if (type) params.type = type;

  return params;
}

const RESULT_STRING_KEYS = [
  "tag",
  "specId",
  "specFile",
  "specName",
  "environment",
  "type",
  "status",
  "reviewStatus",
  "errorMessage",
  "issueName",
  "from",
  "to",
] as const satisfies readonly (keyof GetResultsParams)[];

const RESULT_NUMBER_KEYS = ["page", "limit"] as const satisfies readonly (keyof GetResultsParams)[];

export function buildResultParams(
  query: Record<string, string | string[] | undefined>,
): GetResultsParams {
  const getString = (key: string): string | undefined => {
    const value = query[key];
    return typeof value === "string" ? value : undefined;
  };

  const params: GetResultsParams = {
    projectId: getString("projectId") ?? "",
  };

  for (const key of RESULT_STRING_KEYS) {
    const value = getString(key);
    if (!value) continue;

    if (key === "type") {
      const resolvedType = resolveExecutionTypeFilter(value);
      if (resolvedType) params[key] = resolvedType;
      continue;
    }

    params[key] = value;
  }

  for (const key of RESULT_NUMBER_KEYS) {
    const value = getString(key);
    if (value) params[key] = Number(value);
  }

  const dates = query.dates;
  if (dates) {
    params.dates = (Array.isArray(dates) ? dates : dates.split(",")).map((d) => d.trim());
  }

  return params;
}
