// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { GetResultsParams } from "@/types";

export function buildIssueParams(query: Record<string, string | undefined>) {
  const params: {
    projectId: string;
    name?: string;
    page?: number;
    limit?: number;
    statFrom?: string;
    statTo?: string;
  } = { projectId: query.projectId ?? "" };

  if (query.name) params.name = query.name;
  if (query.page) params.page = Number(query.page);
  if (query.limit) params.limit = Number(query.limit);
  if (query.statFrom) params.statFrom = query.statFrom;
  if (query.statTo) params.statTo = query.statTo;

  return params;
}

export function buildResultParams(query: Record<string, string | undefined>): GetResultsParams {
  const params: GetResultsParams = {
    projectId: query.projectId ?? "",
  };

  if (query.tag) params.tag = query.tag;
  if (query.specId) params.specId = query.specId;
  if (query.specFile) params.specFile = query.specFile;
  if (query.specName) params.specName = query.specName;
  if (query.environment) params.environment = query.environment;
  if (query.type) params.type = query.type;
  if (query.status) params.status = query.status;
  if (query.reviewStatus) params.reviewStatus = query.reviewStatus;
  if (query.errorMessage) params.errorMessage = query.errorMessage;
  if (query.issueName) params.issueName = query.issueName;
  if (query.from) params.from = query.from;
  if (query.to) params.to = query.to;
  if (query.page) params.page = Number(query.page);
  if (query.limit) params.limit = Number(query.limit);

  return params;
}
