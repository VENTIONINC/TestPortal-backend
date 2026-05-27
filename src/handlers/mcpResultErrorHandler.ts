// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { resultErrorService } from "@/services/resultErrorService";
import type { ResultErrorWithRelations, StructuredResultError } from "@/types";

interface BulkReviewResult {
  successful: (ResultErrorWithRelations | null)[];
  failed: Array<{ id: string; reason: string }>;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
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

  async getResultErrorById(
    resultErrorId: string,
    projectId: string,
  ): Promise<StructuredResultError> {
    return await resultErrorService.getResultErrorById(resultErrorId, projectId);
  },
};
