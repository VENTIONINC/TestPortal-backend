// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import type { ResultWithRelations, ResultsStats } from "@/types";
import { Prisma } from "@prisma/client";

export interface ResultFilters {
  projectId: string;
  tag?: string;
  specId?: string;
  specRecordIds?: string[];
  specFile?: string;
  specName?: string;
  environment?: string;
  type?: string;
  status?: string;
  reviewStatus?: string;
  errorMessage?: string;
  issueName?: string;
  from?: string;
  to?: string;
  dates?: string[];
}

export interface AnalysisExportFilters {
  projectId: string;
  dateFrom: Date;
  dateTo: Date;
}

export interface AnalysisExportRow {
  id: string;
  status: string;
  duration: number;
  retry: number;
  reportPortalLink: string | null;
  startTime: Date;
  analysisStatus: string | null;
  analysisCategory: string | null;
  analysisConfidence: number | null;
  analysisConclusion: string | null;
  analysisErrorQuality: number | null;
  analysisErrorQualityConclusion: string | null;
  analysisReviewedAt: Date | null;
  analysisReviewedById: string | null;
  analysisFeedbackCategory: string | null;
  analysisFeedbackConfidence: number | null;
  analysisFeedbackConclusion: string | null;
  spec: {
    id: string;
    key: string;
    file: string;
    title: string;
    tags: Prisma.JsonValue;
  };
  execution: {
    id: string;
    environment: string;
    type: string;
    name: string;
    version: string;
    startedAt: Date;
    createdAt: Date;
  };
}

const buildResultWhereClause = (
  filters: ResultFilters,
): Prisma.ResultWhereInput => {
  const {
    projectId,
    tag,
    specId,
    specRecordIds,
    specFile,
    specName,
    environment,
    type,
    status,
    reviewStatus,
    errorMessage,
    issueName,
    from,
    to,
    dates,
  } = filters;

  let toDate: Date | undefined;
  if (to) {
    toDate = new Date(to);
    toDate.setDate(toDate.getDate() + 1);
  }

  const specFilter: Prisma.SpecWhereInput = { projectId };
  if (specId) specFilter.key = specId;
  if (specRecordIds) specFilter.id = { in: specRecordIds };
  if (specFile) specFilter.file = { contains: specFile };
  if (specName) specFilter.title = { contains: specName };
  if (tag) {
    const selectedTags = [
      ...new Set(
        tag
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];

    if (selectedTags.length === 1) {
      const selectedTag = selectedTags[0];
      if (selectedTag) {
        specFilter.tags = { array_contains: [selectedTag] };
      }
    } else if (selectedTags.length > 1) {
      specFilter.OR = selectedTags.map((selectedTag) => ({
        tags: { array_contains: [selectedTag] },
      }));
    }
  }

  const executionFilter: Prisma.ExecutionWhereInput = { projectId };
  if (environment) executionFilter.environment = environment;
  if (type) executionFilter.type = type;

  const whereClause: Prisma.ResultWhereInput = {
    spec: specFilter,
    execution: executionFilter,
  };

  if (status) whereClause.status = status;

  if (errorMessage) {
    whereClause.errors = {
      some: {
        message: {
          contains: errorMessage,
          mode: "insensitive",
        },
      },
    };
  }

  if (reviewStatus) {
    if (reviewStatus.toLowerCase() === "completed") {
      whereClause.OR = [
        { status: "passed" },
        {
          AND: [
            { status: { not: "passed" } },
            {
              errors: {
                every: {
                  assumptions: {
                    every: {
                      isConfirmed: true,
                    },
                  },
                },
              },
            },
            {
              errors: {
                some: {
                  assumptions: {
                    some: {},
                  },
                },
              },
            },
          ],
        },
      ];
    } else if (reviewStatus.toLowerCase() === "incompleted") {
      whereClause.AND = [
        { status: { not: "passed" } },
        {
          OR: [
            {
              errors: {
                every: {
                  assumptions: {
                    none: {},
                  },
                },
              },
            },
            {
              errors: {
                some: {
                  assumptions: {
                    some: {
                      isConfirmed: false,
                    },
                  },
                },
              },
            },
          ],
        },
      ];
    }
  }

  if (issueName) {
    whereClause.errors = {
      some: {
        assumptions: {
          some: {
            issue: {
              name: {
                contains: issueName,
                mode: "insensitive",
              },
            },
          },
        },
      },
    };
  }

  if (from || to) {
    whereClause.startTime = {};
    if (from) whereClause.startTime.gte = new Date(from);
    if (toDate) whereClause.startTime.lte = toDate;
  }

  if (dates?.length) {
    const selectedDatesCondition: Prisma.ResultWhereInput = {
      OR: dates.map((date) => {
        const start = new Date(date);
        const end = new Date(date);
        end.setUTCDate(end.getUTCDate() + 1);

        return { startTime: { gte: start, lt: end } };
      }),
    };
    const existingAnd = whereClause.AND;
    whereClause.AND = [
      ...(Array.isArray(existingAnd)
        ? existingAnd
        : existingAnd
          ? [existingAnd]
          : []),
      selectedDatesCondition,
    ];
  }

  return whereClause;
};

export const resultModel = {
  findById: async (
    id: number | string,
    projectId: string,
    client: Prisma.TransactionClient,
  ): Promise<ResultWithRelations | null> => {
    return (await client.result.findFirst({
      where: {
        id: String(id),
        spec: {
          projectId,
        },
        execution: {
          projectId,
        },
      },
      include: {
        spec: true,
        execution: true,
        errors: {
          include: {
            assumptions: {
              include: {
                issue: true,
              },
            },
          },
        },
      },
    })) as ResultWithRelations | null;
  },

  findMany: async (
    filters: ResultFilters,
    page = 1,
    limit?: number,
  ): Promise<ResultWithRelations[]> => {
    return (await dbClient.result.findMany({
      where: buildResultWhereClause(filters),
      ...(limit === undefined
        ? {}
        : {
            skip: (page - 1) * limit,
            take: Number(limit),
          }),
      orderBy: {
        startTime: "desc", // Most recent results first
      },
      include: {
        spec: true,
        execution: true,
        errors: {
          include: {
            assumptions: {
              include: {
                issue: true,
              },
            },
          },
        },
      },
    })) as unknown as ResultWithRelations[];
  },

  count: async (filters: ResultFilters): Promise<number> => {
    return await dbClient.result.count({
      where: buildResultWhereClause(filters),
    });
  },

  findSpecTags: async (filters: ResultFilters): Promise<Prisma.JsonValue[]> => {
    const resultWhere = buildResultWhereClause(filters);
    const { spec, ...matchingResultWhere } = resultWhere;
    const rows = await dbClient.spec.findMany({
      where: {
        ...(spec as Prisma.SpecWhereInput),
        results: {
          some: matchingResultWhere,
        },
      },
      select: {
        tags: true,
      },
    });

    return rows.map((row) => row.tags);
  },

  findForAnalysisExport: async (
    filters: AnalysisExportFilters,
  ): Promise<AnalysisExportRow[]> => {
    const { projectId, dateFrom, dateTo } = filters;

    const whereClause: Prisma.ResultWhereInput = {
      spec: { projectId },
      execution: { projectId },
    } as Prisma.ResultWhereInput;

    (whereClause as Record<string, unknown>).analysisReviewedById = {
      not: null,
    };

    whereClause.startTime = {
      gte: dateFrom,
      lte: dateTo,
    };

    const selectFields = {
      id: true,
      status: true,
      duration: true,
      retry: true,
      reportPortalLink: true,
      startTime: true,
      analysisStatus: true,
      analysisCategory: true,
      analysisConfidence: true,
      analysisConclusion: true,
      analysisErrorQuality: true,
      analysisErrorQualityConclusion: true,
      analysisReviewedAt: true,
      analysisReviewedById: true,
      analysisFeedbackCategory: true,
      analysisFeedbackConfidence: true,
      analysisFeedbackConclusion: true,
      spec: {
        select: {
          id: true,
          key: true,
          file: true,
          title: true,
          tags: true,
        },
      },
      execution: {
        select: {
          id: true,
          environment: true,
          type: true,
          name: true,
          version: true,
          startedAt: true,
          createdAt: true,
        },
      },
    } as unknown as Prisma.ResultSelect;

    return (await dbClient.result.findMany({
      where: whereClause,
      orderBy: {
        startTime: "asc",
      },
      select: selectFields,
    })) as unknown as AnalysisExportRow[];
  },

  getStats: async (filters: {
    projectId: string;
    dates?: string[] | undefined;
  }): Promise<ResultsStats> => {
    const { projectId, dates } = filters;

    const whereClause: Prisma.ResultWhereInput = {};

    // Always filter by projectId through spec and execution relations
    whereClause.spec = { projectId };
    whereClause.execution = { projectId };

    if (dates && dates.length > 0) {
      // For each date, create a range from start of day to end of day
      const dateRanges = dates.map((dateStr) => {
        const startOfDay = new Date(dateStr);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(dateStr);
        endOfDay.setHours(23, 59, 59, 999);

        return {
          AND: [
            { spec: { projectId } },
            { execution: { projectId } },
            {
              startTime: {
                gte: startOfDay,
                lte: endOfDay,
              },
            },
          ],
        };
      });

      // Use OR to match any of the specified dates, but always require projectId
      whereClause.OR = dateRanges;
    }

    // Single database query to get all results with relations
    const results = await dbClient.result.findMany({
      where: whereClause,
      include: {
        spec: true,
        execution: true,
        errors: {
          include: {
            assumptions: {
              include: {
                issue: true,
              },
            },
          },
        },
      },
    });

    // Initialize tracking maps (same approach as frontend)
    const specMap = new Map<
      string,
      {
        id: string;
        key: string;
        title: string;
        file: string;
        tags: Prisma.JsonValue;
      }
    >();
    const executionMap = new Map<
      string,
      { id: string; environment: string; type: string }
    >();
    const errorMap = new Map<string, { id: string; message: string | null }>();
    const assumptionMap = new Map<
      string,
      { id: string; isConfirmed: boolean }
    >();
    const resultMap = new Map<
      string,
      { id: string; status: string; startTime: Date }
    >();
    const issueMap = new Map<
      string,
      { id: string; name: string | null; category: string | null }
    >();

    // Local tracking for errors and issues (not stored in final stats)
    const errorCounts = new Map<string, number>();
    const issueCounts = new Map<string, { count: number; category: string }>();

    // Initialize stats object
    const stats: ResultsStats = {
      byStatus: { passed: 0, failed: 0, skipped: 0, timedOut: 0 },
      byStatusTotal: 0,
      entityCounts: {
        specs: 0,
        results: 0,
        executions: 0,
        issues: 0,
        errors: 0,
        assumptions: 0,
      },
      topErrors: [],
      topIssues: [],
    };

    // Single pass through all results to calculate everything
    for (const result of results) {
      // Count by status
      if (result.status && result.status in stats.byStatus) {
        stats.byStatus[result.status as keyof typeof stats.byStatus]++;
      }

      // Track unique entities
      if (!specMap.has(result.spec.id))
        specMap.set(result.spec.id, result.spec);
      if (!executionMap.has(result.execution.id))
        executionMap.set(result.execution.id, result.execution);
      if (!resultMap.has(result.id)) resultMap.set(result.id, result);

      // Process errors and assumptions
      result.errors?.forEach((error) => {
        const errorKey = error.id;
        if (!errorMap.has(errorKey)) errorMap.set(errorKey, error);

        // Count error messages
        const errorMessage = error.message ?? "Unknown Error";
        errorCounts.set(errorMessage, (errorCounts.get(errorMessage) ?? 0) + 1);

        // Process assumptions
        error.assumptions?.forEach((assumption) => {
          const assumptionKey = assumption.id;
          if (!assumptionMap.has(assumptionKey))
            assumptionMap.set(assumptionKey, assumption);
          // Process issues
          if (assumption.issue) {
            const issue = assumption.issue;
            if (!issueMap.has(issue.id)) issueMap.set(issue.id, issue);

            // Count issue names
            const issueName = issue.name ?? "Unknown Issue Name";
            const current = issueCounts.get(issueName) ?? {
              count: 0,
              category: issue.category ?? "Other",
            };
            issueCounts.set(issueName, {
              ...current,
              count: current.count + 1,
            });
          }
        });
      });
    }

    // Set final counts
    stats.entityCounts.specs = specMap.size;
    stats.entityCounts.results = resultMap.size;
    stats.entityCounts.executions = executionMap.size;
    stats.entityCounts.issues = issueMap.size;
    stats.entityCounts.errors = errorMap.size;
    stats.entityCounts.assumptions = assumptionMap.size;

    // Calculate total status count
    stats.byStatusTotal = Object.values(stats.byStatus).reduce(
      (acc, count) => acc + count,
      0,
    );

    // Calculate top 10 errors and issues
    stats.topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([title, count]) => ({ title, count }));

    stats.topIssues = Array.from(issueCounts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([title, data]) => ({
        title,
        count: data.count,
        category: data.category,
      }));

    return stats;
  },

  updateAnalysis: async (
    resultId: number | string,
    analysisData: {
      analysisStatus?: string;
      analysisCategory?: string;
      analysisConfidence?: number;
      analysisConclusion?: string;
    },
    client: Prisma.TransactionClient,
  ): Promise<ResultWithRelations> => {
    const updatedResult = await client.result.update({
      where: {
        id: String(resultId),
      },
      data: analysisData,
      include: {
        spec: true,
        execution: true,
        errors: {
          include: {
            result: true,
            assumptions: {
              include: {
                issue: true,
              },
            },
          },
        },
      },
    });

    return updatedResult;
  },

  updateAnalysisFeedback: async (
    resultId: number | string,
    feedbackData: {
      analysisReviewedAt?: Date;
      analysisReviewedById?: string;
      analysisFeedbackCategory?: string;
      analysisFeedbackConfidence?: number;
      analysisFeedbackConclusion?: string;
    },
    client: Prisma.TransactionClient,
  ): Promise<ResultWithRelations> => {
    const updatedResult = await client.result.update({
      where: {
        id: String(resultId),
      },
      data: feedbackData as Prisma.ResultUpdateInput,
      include: {
        spec: true,
        execution: true,
        errors: {
          include: {
            result: true,
            assumptions: {
              include: {
                issue: true,
              },
            },
          },
        },
      },
    });

    return updatedResult as ResultWithRelations;
  },

  delete: async (
    id: string,
    projectId: string,
    client: Prisma.TransactionClient,
  ): Promise<void> => {
    const existingResult = await client.result.findFirst({
      where: {
        id,
        spec: {
          projectId,
        },
        execution: {
          projectId,
        },
      },
      include: {
        errors: {
          include: {
            assumptions: true,
          },
        },
      },
    });

    if (!existingResult) {
      throw new Error(`Result with ID ${id} not found`);
    }

    for (const error of existingResult.errors) {
      if (error.assumptions.length > 0) {
        await client.assumption.deleteMany({
          where: {
            resultErrorId: error.id,
          },
        });
      }
    }

    await client.resultError.deleteMany({
      where: {
        resultId: id,
      },
    });

    await client.result.delete({
      where: { id },
    });
  },
};
