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
import { selectBestIssueSuggestion } from "@/lib/issueSimilarity";
import { buildIssueCategorySummary, getEffectiveResultCategory, } from "@/lib/resultCategory";
import { dbClient } from "@/prisma/client";
import { dashboardService } from "@/services/dashboardService";
import { testAnalysisService } from "@/services/testAnalysisService";
import type {
  ResultErrorModalAssignmentSummary,
  ResultErrorModalContext,
  ResultErrorSimilarityOutcome,
  ResultErrorWithRelations,
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
  async getSimilaritySuggestion(
    resultErrorId: string,
    projectId: string,
  ): Promise<ResultErrorSimilarityOutcome> {
    if (!resultErrorId) throw new Error("Result error ID is required");
    if (!projectId) throw new Error("Project ID is required");

    const target = await resultErrorModel.findModalContext(
      resultErrorId,
      projectId,
    );
    if (!target?.result) {
      throw new Error(`Result error with ID ${resultErrorId} not found`);
    }

    const rows = await resultErrorModel.findSimilarityCandidates(projectId);
    const candidates = rows
      .filter((row) => row.projectId === projectId)
      .map((row) => ({
        issueId: row.issue.id,
        issue: row.issue,
        evidence: row.evidence
          .filter((entry) => entry.isConfirmed)
          .map((entry) => ({
            message: entry.message,
            callStack: normalizeJsonStringArray(entry.callStack),
            specPath: entry.specPath,
            resultId: entry.resultId,
            resultErrorId: entry.resultErrorId,
            analysisCategory: entry.analysisCategory,
            analysisFeedbackCategory: entry.analysisFeedbackCategory,
          })),
      }));
    const suggestion = selectBestIssueSuggestion(
      {
        message: target.message,
        callStack: normalizeJsonStringArray(target.callStack),
        specPath: target.result.spec.file,
      },
      candidates,
    );
    if (!suggestion) return { outcome: "no_match" };

    const selected = candidates.find(
      (candidate) => candidate.issueId === suggestion.issueId,
    );
    const affectedResults = new Set(
      selected?.evidence
        .map((evidence) => evidence.resultId)
        .filter(
          (id): id is string => Boolean(id) && id !== target.result?.id,
        ) ?? [],
    );
    const category = buildIssueCategorySummary(
      selected?.evidence.map((evidence) => ({
        id: evidence.resultId ?? evidence.resultErrorId,
        analysisCategory: evidence.analysisCategory,
        analysisFeedbackCategory: evidence.analysisFeedbackCategory,
      })) ?? [],
    ).displayCategory ?? "other";
    return {
      outcome: "match",
      suggestion: {
        issue: suggestion.issue,
        category,
        score: suggestion.score,
        otherAffectedTests: affectedResults.size,
      },
    };
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
    ): ResultErrorModalAssignmentSummary => ({
      id: assignment.id,
      isConfirmed: assignment.isConfirmed,
      score: assignment.score,
      madeBy: assignment.madeBy,
      issue: assignment.issue,
    });
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
