// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { issueService } from "@/services/issueService";
import type { PrismaIssue, ResultCategory } from "@/types";

interface IssueFilterParams {
  projectId: string;
  category?: ResultCategory;
  name?: string;
  page?: number;
  limit?: number;
}

interface CreateIssueParams {
  name: string;
  category: ResultCategory;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  projectId: string;
}

interface UpdateIssueParams {
  name?: string;
  category?: ResultCategory;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
}

export const mcpIssueHandler = {
  async getAllIssues(params: IssueFilterParams) {
    const { projectId, category, name, page = 1, limit = 30 } = params;

    const issueParams: IssueFilterParams = { projectId };
    if (category) issueParams.category = category;
    if (name) issueParams.name = name;
    if (page) issueParams.page = page;
    if (limit) issueParams.limit = limit;

    return await issueService.getAllIssues(issueParams);
  },

  async getIssueById(
    issueId: string,
    projectId: string,
  ) {
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
