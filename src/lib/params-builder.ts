// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { IssueCategory } from "@/types/enums";
import type { GetResultsParams } from "@/types";

export function buildIssueParams(query: Record<string, string | undefined>) {
  const params: {
    projectId: string;
    category?: IssueCategory;
    name?: string;
    page?: number;
    limit?: number;
    statFrom?: string;
    statTo?: string;
  } = { projectId: query.projectId ?? "" };

  if (query.category) params.category = query.category as IssueCategory;
  if (query.name) params.name = query.name;
  if (query.page) params.page = Number(query.page);
  if (query.limit) params.limit = Number(query.limit);
  if (query.statFrom) params.statFrom = query.statFrom;
  if (query.statTo) params.statTo = query.statTo;

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
    if (value) params[key] = value;
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
