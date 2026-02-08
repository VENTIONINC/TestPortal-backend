import { resultErrorService } from "@/services/resultErrorService";
import type { PrismaResultError, ResultErrorWithRelations } from "@/types";

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

export const mcpResultErrorHandler = {
  async assignIssue(
    resultErrorId: string,
    assumptionId: string,
  ): Promise<unknown> {
    return await resultErrorService.assignIssue(resultErrorId, assumptionId);
  },

  async reviewError(
    resultErrorId: string,
  ): Promise<ResultErrorWithRelations | null> {
    return await resultErrorService.reviewError(resultErrorId);
  },

  async bulkReview(errorIds: string[]): Promise<BulkReviewResult> {
    return await resultErrorService.bulkReview(errorIds);
  },

  async getResultErrorById(resultErrorId: string, projectId: string): Promise<PrismaResultError> {
    return await resultErrorService.getResultErrorById(resultErrorId, projectId);
  },

  async analyzeErrors(
    projectId: string,
    errorIds: string[],
  ): Promise<AnalyzeErrorsResult> {
    return await resultErrorService.analyzeErrors(projectId, errorIds);
  },
};
