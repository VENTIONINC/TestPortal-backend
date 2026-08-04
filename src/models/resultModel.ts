// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { dbClient } from "@/prisma/client";
import { buildIssueCategorySummary } from "@/lib/resultCategory";
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

const resultStatsSelect = Prisma.validator<Prisma.ResultSelect>()({
  id: true,
  status: true,
  analysisCategory: true,
  analysisFeedbackCategory: true,
  spec: { select: { id: true } },
  execution: { select: { id: true } },
  errors: {
    select: {
      id: true,
      message: true,
      assumptions: {
        select: {
          id: true,
          issue: { select: { id: true, name: true } },
        },
      },
    },
  },
});

type ResultStatsRow = Prisma.ResultGetPayload<{
  select: typeof resultStatsSelect;
}>;

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
      toDate.setDate(toDate.getDate() + 1); // +1 day to include results of the whole day
    }

    const whereClause: Prisma.ResultWhereInput = {};

    // Build spec filter (always include projectId)
    whereClause.spec = {};
    whereClause.spec.projectId = projectId;
    if (specId) whereClause.spec.key = specId;
    if (specRecordIds) whereClause.spec.id = { in: specRecordIds };
    if (specFile) whereClause.spec.file = { contains: specFile };
    if (specName) whereClause.spec.title = { contains: specName };
    if (tag) whereClause.spec.tags = { array_contains: [tag] };

    // Build execution filter (always include projectId)
    whereClause.execution = {};
    whereClause.execution.projectId = projectId;
    if (environment) whereClause.execution.environment = environment;
    if (type) whereClause.execution.type = type;

    // Add other filters
    if (status) whereClause.status = status;

    // Error message filter
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

    // Review status filter
    if (reviewStatus) {
      if (reviewStatus.toLowerCase() === "completed") {
        // For 'completed': status is 'passed' OR all assumptions are confirmed
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
        // For 'inCompleted': status is not 'passed' AND (no assumptions OR not all assumptions confirmed)
        whereClause.AND = [
          { status: { not: "passed" } },
          {
            OR: [
              // No assumptions at all
              {
                errors: {
                  every: {
                    assumptions: {
                      none: {},
                    },
                  },
                },
              },
              // Has assumptions but not all are confirmed
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

    return (await dbClient.result.findMany({
      where: whereClause,
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
    const {
      projectId,
      tag,
      specId,
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

    const whereClause: Prisma.ResultWhereInput = {};

    // Build spec filter (always include projectId)
    whereClause.spec = {};
    whereClause.spec.projectId = projectId;
    if (specId) whereClause.spec.key = specId;
    if (specFile) whereClause.spec.file = { contains: specFile };
    if (specName) whereClause.spec.title = { contains: specName };
    if (tag) whereClause.spec.tags = { array_contains: [tag] };

    // Build execution filter (always include projectId)
    whereClause.execution = {};
    whereClause.execution.projectId = projectId;
    if (environment) whereClause.execution.environment = environment;
    if (type) whereClause.execution.type = type;

    // Add other filters
    if (status) whereClause.status = status;

    // Error message filter
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

    // Review status filter
    if (reviewStatus) {
      if (reviewStatus.toLowerCase() === "completed") {
        // For 'completed': status is 'passed' OR all assumptions are confirmed
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
        // For 'inCompleted': status is not 'passed' AND (no assumptions OR not all assumptions confirmed)
        whereClause.AND = [
          { status: { not: "passed" } },
          {
            OR: [
              // No assumptions at all
              {
                errors: {
                  every: {
                    assumptions: {
                      none: {},
                    },
                  },
                },
              },
              // Has assumptions but not all are confirmed
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

    // Issue name filter
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

    return await dbClient.result.count({
      where: whereClause,
    });
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

    // Single database query to get all results with only the statistics fields.
    const results: ResultStatsRow[] = await dbClient.result.findMany({
      where: whereClause,
      select: resultStatsSelect,
    });

    // Track unique entity IDs and issue names for final counts.
    const specIds = new Set<string>();
    const executionIds = new Set<string>();
    const errorIds = new Set<string>();
    const assumptionIds = new Set<string>();
    const resultIds = new Set<string>();
    const issueMap = new Map<string, string>();

    // Local tracking for errors and distinct results linked to each issue.
    const errorCounts = new Map<string, number>();
    const issueResults = new Map<
      string,
      Map<
        string,
        {
          id: string;
          analysisCategory: string | null;
          analysisFeedbackCategory: string | null;
        }
      >
    >();

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
      specIds.add(result.spec.id);
      executionIds.add(result.execution.id);
      resultIds.add(result.id);

      // Process errors and assumptions
      result.errors?.forEach((error) => {
        errorIds.add(error.id);

        // Count error messages
        const errorMessage = error.message ?? "Unknown Error";
        errorCounts.set(errorMessage, (errorCounts.get(errorMessage) ?? 0) + 1);

        // Process assumptions
        error.assumptions?.forEach((assumption) => {
          assumptionIds.add(assumption.id);
          // Process issues
          if (assumption.issue) {
            const issue = assumption.issue;
            if (!issueMap.has(issue.id)) issueMap.set(issue.id, issue.name);

            const linkedResults =
              issueResults.get(issue.id) ??
              new Map<
                string,
                {
                  id: string;
                  analysisCategory: string | null;
                  analysisFeedbackCategory: string | null;
                }
              >();
            linkedResults.set(result.id, {
              id: result.id,
              analysisCategory: result.analysisCategory,
              analysisFeedbackCategory: result.analysisFeedbackCategory,
            });
            issueResults.set(issue.id, linkedResults);
          }
        });
      });
    }

    // Set final counts
    stats.entityCounts.specs = specIds.size;
    stats.entityCounts.results = resultIds.size;
    stats.entityCounts.executions = executionIds.size;
    stats.entityCounts.issues = issueMap.size;
    stats.entityCounts.errors = errorIds.size;
    stats.entityCounts.assumptions = assumptionIds.size;

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

    stats.topIssues = Array.from(issueResults.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10)
      .map(([issueId, linkedResults]) => ({
        id: issueId,
        title: issueMap.get(issueId) ?? "Unknown Issue Name",
        count: linkedResults.size,
        categorySummary: buildIssueCategorySummary(
          Array.from(linkedResults.values()),
        ),
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
