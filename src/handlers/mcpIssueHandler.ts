// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { issueService } from "@/services/issueService";
import type { PrismaIssue } from "@/types";
import { IssueCategory } from "@/types/enums";

interface IssueFilterParams {
  projectId: string;
  category?: IssueCategory;
  name?: string;
  page?: number;
  limit?: number;
}

interface GetAllIssuesResponse {
  issues: PrismaIssue[];
  total: number;
  page: number;
  totalPages: number;
}

interface IssueWithStatistics extends PrismaIssue {
  statistics: {
    occurrenceCount: number;
    firstOccurrence: Date | null;
    lastOccurrence: Date | null;
    impactedTestsCount: number;
  };
}

interface GetAllIssuesWithStatsResponse {
  issues: IssueWithStatistics[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateIssueParams {
  name: string;
  category: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  projectId: string;
}

interface UpdateIssueParams {
  name?: string;
  category?: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
}

export const mcpIssueHandler = {
  async getAllIssues(params: IssueFilterParams): Promise<GetAllIssuesResponse> {
    const { projectId, category, name, page = 1, limit = 30 } = params;

    // Build parameters object, filtering out undefined values
    const issueParams: IssueFilterParams = { projectId };
    if (category) issueParams.category = category;
    if (name) issueParams.name = name;
    if (page) issueParams.page = page;
    if (limit) issueParams.limit = limit;

    return await issueService.getAllIssues(issueParams);
  },

  async getAllIssuesWithStats(
    params: IssueFilterParams,
  ): Promise<GetAllIssuesWithStatsResponse> {
    const { projectId, category, name, page = 1, limit = 30 } = params;

    // Build parameters object, filtering out undefined values
    const issueParams: IssueFilterParams = { projectId };
    if (category) issueParams.category = category;
    if (name) issueParams.name = name;
    if (page) issueParams.page = page;
    if (limit) issueParams.limit = limit;

    return await issueService.getAllIssuesWithStats(issueParams);
  },

  async getIssueById(
    issueId: string,
    projectId: string,
  ): Promise<PrismaIssue> {
    return await issueService.getIssueById(issueId, projectId);
  },

  async createIssue(issueParams: CreateIssueParams): Promise<PrismaIssue> {
    return await issueService.createIssue(issueParams);
  },

  async updateIssue(
    issueId: string,
    updateData: UpdateIssueParams,
  ): Promise<PrismaIssue> {
    return await issueService.updateIssue(issueId, updateData);
  },
};
