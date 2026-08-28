// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { resultErrorModel } from "@/models/resultErrorModel";
import { runReview } from "@/lib/error-analyzer";
import { normalizeJsonArrayForText, normalizeJsonStringArray, normalizeResultErrorPayload, } from "@/lib/jsonPayloads";
import {
  normalizeGeneratedTestCase,
  normalizeResultErrorLogs,
  normalizeResultErrorSourceSnippet,
} from "@/lib/resultErrorModalContext";
import getLogger from "@/lib/logger";
import { getEffectiveResultCategory } from "@/lib/resultCategory";
import { isResultCategory } from "@/lib/resultCategory";
import { dbClient } from "@/prisma/client";
import { dashboardService } from "@/services/dashboardService";
import { testAnalysisService } from "@/services/testAnalysisService";
import type {
  ResultErrorModalAssignmentSummary,
  ResultErrorModalContext,
  ResultErrorWithRelations,
  PrismaAssumption,
  PrismaIssue,
  ResultCategory,
  StructuredResultError,
} from "@/types";

const logger = getLogger("result-error-service");

type ResultErrorWithAssumptions = Omit<ResultErrorWithRelations, "result">;

interface BulkReviewResult {
  successful: (ResultErrorWithRelations | null)[];
  failed: Array<{ id: string; reason: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
}

interface AnalyzeErrorsResult {
  analyzedResults: number;
  updatedResultIds: string[];
  skippedErrorIds: string[];
  totalErrors: number;
}

export interface ResultErrorIssueCreateRequest {
  projectId: string;
  name: string;
  category: ResultCategory;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
}

export interface ResultErrorIssueUpdateRequest {
  projectId: string;
  category: ResultCategory;
  name?: string;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
}

interface ResultErrorIssueWorkflowResponse {
  issue: PrismaIssue;
  assumption: PrismaAssumption;
  result: {
    id: string;
    analysisFeedbackCategory: string | null;
  };
}

const invalidCategoryMessage =
  "Invalid issue category. Must be one of: bug, infra, performance, script, other";

function validateIssueWorkflowIdentity(
  resultErrorId: string,
  projectId: string,
  category: unknown,
  reviewedById: string,
): asserts category is ResultCategory {
  if (!resultErrorId) throw new Error("Result error ID is required");
  if (!projectId) throw new Error("Project ID is required");
  if (!isResultCategory(category)) throw new Error(invalidCategoryMessage);
  if (!reviewedById) throw new Error("Reviewer ID is required");
}

const feedbackUpdate = (category: ResultCategory, reviewedById: string) => ({
  analysisFeedbackCategory: category,
  analysisReviewedAt: new Date(),
  analysisReviewedById: reviewedById,
});

const validateAnalyzeErrorsParams = (
  projectId: string,
  errorIds: string[],
): { projectId: string; errorIds: string[] } => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  if (!errorIds || !Array.isArray(errorIds) || errorIds.length === 0) {
    throw new Error("Error IDs array is required and must not be empty");
  }

  if (errorIds.some((id) => typeof id !== "string" || id.length === 0)) {
    throw new Error("Error IDs must be non-empty strings");
  }

  return { projectId, errorIds };
};

export const resultErrorService = {
  async createIssue(
    resultErrorId: string,
    issueData: ResultErrorIssueCreateRequest,
    reviewedById: string,
  ): Promise<ResultErrorIssueWorkflowResponse> {
    validateIssueWorkflowIdentity(
      resultErrorId,
      issueData?.projectId,
      issueData?.category,
      reviewedById,
    );
    if (!issueData.name) {
      throw new Error("Unable to create issue without name");
    }

    return await dbClient.$transaction(async (tx) => {
      // Serialize create-and-assign workflows for the same result error. The
      // project-scoped lookup below remains the source of truth for ownership.
      await tx.$queryRaw`
        SELECT "id"
        FROM "ResultError"
        WHERE "id" = ${resultErrorId}::uuid
        FOR UPDATE
      `;
      const resultError = await tx.resultError.findFirst({
        where: {
          id: resultErrorId,
          result: {
            execution: { projectId: issueData.projectId },
            spec: { projectId: issueData.projectId },
          },
        },
        select: {
          id: true,
          assumptions: {
            where: { isConfirmed: true },
            take: 1,
            select: { id: true },
          },
          result: {
            select: {
              id: true,
              startTime: true,
              execution: {
                select: {
                  projectId: true,
                  environment: true,
                  type: true,
                },
              },
            },
          },
        },
      });
      if (!resultError?.result) {
        throw new Error(`Result error with ID ${resultErrorId} not found`);
      }
      if (resultError.assumptions.length > 0) {
        throw new Error(
          `Result error with ID ${resultErrorId} already has a confirmed assumption`,
        );
      }

      const issue = await tx.issue.create({
        data: {
          projectId: issueData.projectId,
          name: issueData.name,
          category: issueData.category,
          ...(issueData.description !== undefined && {
            description: issueData.description,
          }),
          ...(issueData.portal !== undefined && { portal: issueData.portal }),
          ...(issueData.service !== undefined && {
            service: issueData.service,
          }),
          ...(issueData.ticket !== undefined && { ticket: issueData.ticket }),
          createdById: reviewedById,
          updatedById: reviewedById,
        },
      });
      const assumption = await tx.assumption.create({
        data: {
          issueId: issue.id,
          resultErrorId,
          madeBy: "user",
          isConfirmed: true,
          score: 1,
        },
      });
      const result = await tx.result.update({
        where: { id: resultError.result.id },
        data: feedbackUpdate(issueData.category, reviewedById),
        select: { id: true, analysisFeedbackCategory: true },
      });
      await dashboardService.refreshDailyStats(
        issueData.projectId,
        resultError.result.startTime,
        resultError.result.execution.environment,
        resultError.result.execution.type,
        tx,
      );

      return { issue, assumption, result };
    });
  },

  async updateIssue(
    resultErrorId: string,
    issueData: ResultErrorIssueUpdateRequest,
    reviewedById: string,
  ): Promise<ResultErrorIssueWorkflowResponse> {
    validateIssueWorkflowIdentity(
      resultErrorId,
      issueData?.projectId,
      issueData?.category,
      reviewedById,
    );

    return await dbClient.$transaction(async (tx) => {
      const confirmations = await tx.assumption.findMany({
        where: {
          resultErrorId,
          isConfirmed: true,
          issue: { projectId: issueData.projectId },
          resultError: {
            result: {
              execution: { projectId: issueData.projectId },
              spec: { projectId: issueData.projectId },
            },
          },
        },
        take: 2,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          isConfirmed: true,
          score: true,
          madeBy: true,
          issueId: true,
          resultErrorId: true,
          resultError: {
            select: {
              result: {
                select: {
                  id: true,
                  startTime: true,
                  execution: {
                    select: {
                      projectId: true,
                      environment: true,
                      type: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
      if (confirmations.length === 0) {
        throw new Error(
          `Confirmed assumption for result error ${resultErrorId} not found in project ${issueData.projectId}`,
        );
      }
      if (confirmations.length > 1) {
        throw new Error(
          `Multiple confirmed assumptions for result error ${resultErrorId} found in project ${issueData.projectId}`,
        );
      }

      const confirmed = confirmations[0];
      const resultContext = confirmed?.resultError?.result;
      if (!resultContext) {
        throw new Error(
          `Confirmed assumption for result error ${resultErrorId} is not linked to a result`,
        );
      }

      const issue = await tx.issue.update({
        where: { id: confirmed.issueId },
        data: {
          ...(issueData.name !== undefined && { name: issueData.name }),
          category: issueData.category,
          ...(issueData.description !== undefined && {
            description: issueData.description,
          }),
          ...(issueData.portal !== undefined && { portal: issueData.portal }),
          ...(issueData.service !== undefined && {
            service: issueData.service,
          }),
          ...(issueData.ticket !== undefined && { ticket: issueData.ticket }),
          updatedById: reviewedById,
        },
      });
      const result = await tx.result.update({
        where: { id: resultContext.id },
        data: feedbackUpdate(issueData.category, reviewedById),
        select: { id: true, analysisFeedbackCategory: true },
      });
      await dashboardService.refreshDailyStats(
        issueData.projectId,
        resultContext.startTime,
        resultContext.execution.environment,
        resultContext.execution.type,
        tx,
      );

      const { resultError: _resultError, ...assumption } = confirmed;
      return { issue, assumption, result };
    });
  },

  async getModalContext(
    resultErrorId: string,
    projectId: string,
  ): Promise<ResultErrorModalContext> {
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const record = await resultErrorModel.findModalContext(
      resultErrorId,
      projectId,
    );
    if (!record?.result) {
      throw new Error(`Result error with ID ${resultErrorId} not found`);
    }

    const toAssignment = (
      assignment: (typeof record.assumptions)[number],
    ): ResultErrorModalAssignmentSummary => {
      if (!isResultCategory(assignment.issue.category)) {
        throw new Error(
          `Issue ${assignment.issue.id} has an invalid category`,
        );
      }

      return {
        id: assignment.id,
        isConfirmed: assignment.isConfirmed,
        score: assignment.score,
        madeBy: assignment.madeBy,
        issue: {
          ...assignment.issue,
          category: assignment.issue.category,
        },
      };
    };
    const confirmed = record.assumptions.find(
      (assignment) => assignment.isConfirmed,
    );

    return {
      error: {
        id: record.id,
        type: record.type,
        message: record.message,
        callLog: normalizeJsonStringArray(record.callLog),
        callStack: normalizeJsonStringArray(record.callStack),
        logs: normalizeResultErrorLogs(record.rawLogs) ?? [],
        sourceSnippet: normalizeResultErrorSourceSnippet(record.sourceSnippet),
        generatedTestCase: normalizeGeneratedTestCase(
          record.generatedTestCase,
        ),
        location: record.location,
      },
      result: {
        id: record.result.id,
        attempt: record.result.retry + 1,
        status: record.result.status,
        duration: record.result.duration,
        startTime: record.result.startTime,
        reportPortalLink: record.result.reportPortalLink,
        category: getEffectiveResultCategory(record.result) ?? "other",
        testTitle: record.result.spec.title,
        specPath: record.result.spec.file,
        specKey: record.result.spec.key,
        executionName: record.result.execution.name,
        environment: record.result.execution.environment,
      },
      assignments: {
        confirmed: confirmed ? toAssignment(confirmed) : null,
        suggestions: record.assumptions
          .filter((assignment) => !assignment.isConfirmed)
          .map(toAssignment),
      },
    };
  },

  async assignIssue(
    resultErrorId: string,
    assumptionId: string,
  ): Promise<ResultErrorWithAssumptions> {
    // Input validation
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    if (!assumptionId) {
      throw new Error("Assumption ID is required");
    }

    // Business logic - assign the issue
    try {
      return await resultErrorModel.assignIssue(resultErrorId, assumptionId);
    } catch (error) {
      const err = error as Error;
      throw new Error(`Failed to assign issue to result error: ${err.message}`);
    }
  },

  async reviewError(
    resultErrorId: string,
  ): Promise<ResultErrorWithRelations | null> {
    // Input validation
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    // Business logic - get the error and run review
    try {
      const resultError =
        await resultErrorModel.findByIdInternal(resultErrorId);

      if (!resultError) {
        throw new Error(`Result error with ID ${resultErrorId} not found`);
      }

      // Adapt PrismaResultError to TargetResultError format expected by runReview
      return await runReview(resultError);
    } catch (error) {
      const err = error as Error;
      throw new Error(
        `Failed to review result error ${resultErrorId}: ${err.message}`,
      );
    }
  },

  async bulkReview(errorIds: string[]): Promise<BulkReviewResult> {
    // Input validation
    if (!errorIds || !Array.isArray(errorIds)) {
      throw new Error("Error IDs array is required");
    }

    if (errorIds.length === 0) {
      throw new Error("At least one error ID must be provided");
    }

    if (errorIds.some((id) => typeof id !== "string" || id.length === 0)) {
      throw new Error("Error IDs must be non-empty strings");
    }

    // Convert all IDs to strings (UUID format)
    const validatedIds = errorIds.map((id) => String(id));

    // Business logic - process bulk review
    const reviewResults: (ResultErrorWithRelations | null)[] = [];
    const failedIds: Array<{ id: string; reason: string }> = [];

    try {
      for (const errorId of validatedIds) {
        try {
          const resultError = await resultErrorModel.findByIdInternal(errorId);

          if (!resultError) {
            failedIds.push({ id: errorId, reason: "Result error not found" });
            continue;
          }

          const reviewedRecord = await runReview(resultError);
          reviewResults.push(reviewedRecord);
        } catch (error) {
          const err = error as Error;
          failedIds.push({ id: errorId, reason: err.message });
        }
      }

      return {
        successful: reviewResults,
        failed: failedIds,
        totalProcessed: validatedIds.length,
        successCount: reviewResults.length,
        failureCount: failedIds.length,
      };
    } catch (error) {
      const err = error as Error;
      throw new Error(`Bulk review failed: ${err.message}`);
    }
  },

  async getResultErrorById(
    resultErrorId: string,
    projectId: string,
  ): Promise<StructuredResultError> {
    if (!resultErrorId) {
      throw new Error("Result error ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const resultError = await resultErrorModel.findById(
      resultErrorId,
      projectId,
    );

    if (!resultError) {
      throw new Error(`Result error with ID ${resultErrorId} not found`);
    }

    return normalizeResultErrorPayload(resultError);
  },

  async analyzeErrors(
    projectId: string,
    errorIds: string[],
  ): Promise<AnalyzeErrorsResult> {
    const validatedParams = validateAnalyzeErrorsParams(projectId, errorIds);

    const validatedIds = validatedParams.errorIds.map((id) => String(id));

    const resultErrors = await resultErrorModel.findManyForAnalysis(
      validatedIds,
      validatedParams.projectId,
    );

    const foundIds = new Set(resultErrors.map((error) => error.id));
    const skippedErrorIds = validatedIds.filter((id) => !foundIds.has(id));

    const resultMap = new Map<
      string,
      {
        result: {
          id: string;
          status: string;
          duration: number;
          startTime: Date;
          retry: number;
          executionId: string;
          spec: { key: string; title: string; file: string };
          execution: { name: string; environment: string };
        };
        error: {
          id: string;
          message: string;
          callStack: unknown;
          location: string;
        };
      }
    >();

    for (const error of resultErrors) {
      if (!error.result) {
        skippedErrorIds.push(error.id);
        continue;
      }

      if (!resultMap.has(error.result.id)) {
        resultMap.set(error.result.id, {
          result: error.result,
          error: {
            id: error.id,
            message: error.message,
            callStack: normalizeJsonArrayForText(error.callStack),
            location: error.location,
          },
        });
      }
    }

    const resultsForAnalysis = Array.from(resultMap.values()).map(
      ({ result, error }) => ({
        id: result.id,
        status: result.status,
        duration: result.duration,
        startTime: result.startTime,
        retry: result.retry,
        spec: {
          key: result.spec.key,
          title: result.spec.title,
          file: result.spec.file,
        },
        execution: {
          name: result.execution.name,
          environment: result.execution.environment,
        },
        errors: [
          {
            message: error.message,
            callStack: error.callStack,
            location: error.location,
          },
        ],
      }),
    );

    if (resultsForAnalysis.length === 0) {
      return {
        analyzedResults: 0,
        updatedResultIds: [],
        skippedErrorIds,
        totalErrors: validatedIds.length,
      };
    }

    logger.info(
      `Analyzing ${resultsForAnalysis.length} results from ${validatedIds.length} errors`,
    );

    const analysisMap =
      await testAnalysisService.analyzeStoredResults(resultsForAnalysis);

    await Promise.all(
      Array.from(analysisMap.entries()).map(([resultId, analysis]) =>
        dbClient.result.update({
          where: { id: resultId },
          data: {
            analysisStatus: analysis.status,
            analysisCategory: analysis.category ?? null,
            analysisConfidence: analysis.confidence,
            analysisConclusion: analysis.conclusion ?? null,
            analysisErrorQuality: analysis.errorQuality ?? null,
            analysisErrorQualityConclusion:
              analysis.errorQualityConclusion ?? null,
          },
        }),
      ),
    );

    const updatedResultIds = Array.from(analysisMap.keys());
    const executionIds = new Set<string>();
    for (const resultId of updatedResultIds) {
      const resultEntry = resultMap.get(resultId);
      if (resultEntry) {
        executionIds.add(resultEntry.result.executionId);
      }
    }

    for (const executionId of executionIds) {
      try {
        await dashboardService.updateStats(executionId, projectId, dbClient);
      } catch (error) {
        const err = error as Error;
        logger.error(
          `Failed to refresh dashboard stats for execution ${executionId}: ${err.message}`,
        );
      }
    }

    return {
      analyzedResults: analysisMap.size,
      updatedResultIds,
      skippedErrorIds,
      totalErrors: validatedIds.length,
    };
  },
};
