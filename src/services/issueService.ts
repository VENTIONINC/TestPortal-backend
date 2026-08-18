// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  issueModel,
  type LinkedIssueResult,
} from "@/models/issueModel";
import {
  buildIssueCategorySummary,
} from "@/lib/resultCategory";
import type {
  IssueCategorySummary,
  PrismaIssue,
  PrismaIssueWithUsers,
  PrismaUser,
  SerializedIssue,
  SerializedIssueRead,
  SerializedIssuesResponse,
  SerializedUser,
} from "@/types";

interface GetAllIssuesParams {
  projectId: string;
  name?: string;
  page?: number;
  limit?: number;
  statFrom?: string;
  statTo?: string;
  type?: string;
}

export interface IssueRead extends PrismaIssue {
  categorySummary: IssueCategorySummary;
}

export interface GetAllIssuesResponse {
  issues: IssueRead[];
  total: number;
  page: number;
  totalPages: number;
}

interface TimeDistribution {
  date: string;
  count: number;
}

interface IssueStatistics {
  occurrenceCount: number;
  firstOccurrence: Date | null;
  lastOccurrence: Date | null;
  impactedTestsCount: number;
  timeDistribution: TimeDistribution[];
}

interface IssueWithStatistics extends IssueRead {
  statistics: IssueStatistics;
}

export interface GetAllIssuesWithStatsResponse {
  issues: IssueWithStatistics[];
  total: number;
  page: number;
  totalPages: number;
}

interface SerializedIssueWithStatistics extends SerializedIssueRead {
  statistics: IssueStatistics;
}

interface GetAllIssuesWithStatsV2Response {
  issues: SerializedIssueWithStatistics[];
  total: number;
  page: number;
  totalPages: number;
}

interface CreateIssueParams {
  name: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  projectId: string;
  createdById?: string;
  updatedById?: string;
}

interface UpdateIssueParams {
  name?: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  updatedById?: string;
}

type ResultsByIssueId = Map<string, LinkedIssueResult[]>;

function groupResultsByIssueId(
  issueIds: readonly string[],
  results: readonly LinkedIssueResult[],
): ResultsByIssueId {
  const issueResultMaps = new Map(
    issueIds.map((issueId) => [
      issueId,
      new Map<string, LinkedIssueResult>(),
    ]),
  );

  for (const result of results) {
    const linkedIssueIds = new Set(
      result.errors.flatMap((error) =>
        error.assumptions.map((assumption) => assumption.issueId),
      ),
    );

    for (const issueId of linkedIssueIds) {
      issueResultMaps.get(issueId)?.set(result.id, result);
    }
  }

  return new Map(
    Array.from(issueResultMaps, ([issueId, resultMap]) => [
      issueId,
      Array.from(resultMap.values()),
    ]),
  );
}

async function getResultsByIssueId(
  issueIds: readonly string[],
  statFrom?: string,
  statTo?: string,
  type?: string,
): Promise<ResultsByIssueId> {
  const linkedResults = type
    ? await issueModel.findLinkedResults([...issueIds], statFrom, statTo, type)
    : await issueModel.findLinkedResults([...issueIds], statFrom, statTo);

  return groupResultsByIssueId(issueIds, linkedResults);
}

function getCategorySummary(results: readonly LinkedIssueResult[]) {
  return buildIssueCategorySummary(results);
}

function getIssueStatistics(
  results: readonly LinkedIssueResult[],
): IssueStatistics {
  const uniqueTestIds = new Set(results.map((result) => result.specId));
  const timeDistribution = new Map<string, number>();

  for (const result of results) {
    const date = result.startTime.toISOString().split("T")[0] ?? "";
    timeDistribution.set(date, (timeDistribution.get(date) ?? 0) + 1);
  }

  return {
    occurrenceCount: results.length,
    firstOccurrence: results[0]?.startTime ?? null,
    lastOccurrence: results[results.length - 1]?.startTime ?? null,
    impactedTestsCount: uniqueTestIds.size,
    timeDistribution: Array.from(timeDistribution, ([date, count]) => ({
      date,
      count,
    })).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

export const issueService = {
  async getAllIssues(
    params: GetAllIssuesParams,
  ): Promise<GetAllIssuesResponse> {
    const { projectId, name, page = 1, limit = 30 } = params;
    const issues = await issueModel.findMany(projectId, name, page, limit);
    const [totalIssues, resultsByIssueId] = await Promise.all([
      issueModel.count(projectId, name),
      getResultsByIssueId(issues.map((issue) => issue.id)),
    ]);

    return {
      issues: issues.map((issue) => ({
        ...issue,
        categorySummary: getCategorySummary(
          resultsByIssueId.get(issue.id) ?? [],
        ),
      })),
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },

  async getAllIssuesV2(
    params: GetAllIssuesParams,
  ): Promise<SerializedIssuesResponse> {
    const { projectId, name, page = 1, limit = 30 } = params;
    const issues = await issueModel.findManyWithUsers(
      projectId,
      name,
      page,
      limit,
    );
    const [totalIssues, resultsByIssueId] = await Promise.all([
      issueModel.count(projectId, name),
      getResultsByIssueId(issues.map((issue) => issue.id)),
    ]);

    return {
      issues: issues.map((issue) =>
        serializeIssueRead(issue, resultsByIssueId.get(issue.id) ?? []),
      ),
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },

  async getIssueById(
    issueId: string,
    projectId: string,
  ): Promise<IssueRead> {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const issueRecord = await issueModel.findById(issueId, projectId);
    if (!issueRecord) {
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    const resultsByIssueId = await getResultsByIssueId([issueId]);
    return {
      ...issueRecord,
      categorySummary: getCategorySummary(
        resultsByIssueId.get(issueId) ?? [],
      ),
    };
  },

  async getIssueByIdV2(
    issueId: string,
    projectId: string,
  ): Promise<SerializedIssueRead> {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const issueRecord = await issueModel.findByIdWithUsers(issueId, projectId);
    if (!issueRecord) {
      throw new Error(`Issue with ID ${issueId} not found`);
    }

    const resultsByIssueId = await getResultsByIssueId([issueId]);
    return serializeIssueRead(
      issueRecord,
      resultsByIssueId.get(issueId) ?? [],
    );
  },

  async createIssue(issueParams: CreateIssueParams): Promise<PrismaIssue> {
    if (!issueParams?.name) {
      throw new Error("Unable to create issue without name");
    }

    return await issueModel.create(issueParams);
  },

  async updateIssue(
    issueId: string,
    updateData: UpdateIssueParams,
  ): Promise<PrismaIssue> {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    const { name, description, portal, service, ticket, updatedById } =
      updateData;
    const cleanUpdateData: Partial<CreateIssueParams> = {};

    if (name) cleanUpdateData.name = name;
    if (description !== undefined) cleanUpdateData.description = description;
    if (portal !== undefined) cleanUpdateData.portal = portal;
    if (service !== undefined) cleanUpdateData.service = service;
    if (ticket !== undefined) cleanUpdateData.ticket = ticket;
    if (updatedById !== undefined) cleanUpdateData.updatedById = updatedById;

    return await issueModel.update(issueId, cleanUpdateData);
  },

  async deleteIssue(issueId: string, projectId: string): Promise<PrismaIssue> {
    if (!issueId) {
      throw new Error("Issue ID is required");
    }

    try {
      return await issueModel.delete(issueId, projectId);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to delete issue: ${err.message}`);
    }
  },

  async getAllIssuesWithStats(
    params: GetAllIssuesParams,
  ): Promise<GetAllIssuesWithStatsResponse> {
    const {
      projectId,
      name,
      page = 1,
      limit = 10,
      statFrom,
      statTo,
      type,
    } = params;
    const issues = await issueModel.findMany(projectId, name, page, limit, type);
    const [totalIssues, resultsByIssueId] = await Promise.all([
      issueModel.count(projectId, name, type),
      getResultsByIssueId(
        issues.map((issue) => issue.id),
        statFrom,
        statTo,
        type,
      ),
    ]);

    return {
      issues: issues.map((issue) => {
        const results = resultsByIssueId.get(issue.id) ?? [];
        return {
          ...issue,
          categorySummary: getCategorySummary(results),
          statistics: getIssueStatistics(results),
        };
      }),
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },

  async getAllIssuesWithStatsV2(
    params: GetAllIssuesParams,
  ): Promise<GetAllIssuesWithStatsV2Response> {
    const {
      projectId,
      name,
      page = 1,
      limit = 10,
      statFrom,
      statTo,
      type,
    } = params;
    const issues = await issueModel.findManyWithUsers(
      projectId,
      name,
      page,
      limit,
      type,
    );
    const [totalIssues, resultsByIssueId] = await Promise.all([
      issueModel.count(projectId, name, type),
      getResultsByIssueId(
        issues.map((issue) => issue.id),
        statFrom,
        statTo,
        type,
      ),
    ]);

    return {
      issues: issues.map((issue) => {
        const results = resultsByIssueId.get(issue.id) ?? [];
        return {
          ...serializeIssueRead(issue, results),
          statistics: getIssueStatistics(results),
        };
      }),
      total: totalIssues,
      page: Number(page),
      totalPages: Math.ceil(totalIssues / limit),
    };
  },
};

function serializeUser(user: PrismaUser): SerializedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function serializeIssue(issue: PrismaIssueWithUsers): SerializedIssue {
  return {
    id: issue.id,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
    name: issue.name,
    description: issue.description ?? null,
    portal: issue.portal ?? null,
    service: issue.service ?? null,
    ticket: issue.ticket ?? null,
    createdBy: issue.createdBy ? serializeUser(issue.createdBy) : null,
    updatedBy: issue.updatedBy ? serializeUser(issue.updatedBy) : null,
  };
}

function serializeIssueRead(
  issue: PrismaIssueWithUsers,
  results: readonly LinkedIssueResult[],
): SerializedIssueRead {
  return {
    ...serializeIssue(issue),
    categorySummary: getCategorySummary(results),
  };
}
