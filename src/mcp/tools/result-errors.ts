import { mcpResultErrorHandler } from "@/handlers/mcpResultErrorHandler";
import { createSuccessResponse, createMcpTool } from "@/mcp/helpers/mcpHelpers";
import {
  assignIssueSchema,
  reviewErrorSchema,
  bulkReviewSchema,
  getResultErrorByIdSchema,
} from "@/mcp/schemas/resultErrorSchemas";
import type { MCPToolResponse } from "@/types";

interface AssignIssueParams {
  resultErrorId: string;
  assumptionId: string; // UUID
}

interface ReviewErrorParams {
  resultErrorId: string;
}

interface BulkReviewParams {
  errorIds: number[];
}

interface GetResultErrorByIdParams {
  resultErrorId: string;
}

export const assignIssue = createMcpTool(
  "assign-issue-to-result-error",
  "Assign an issue to a result error by connecting it with an assumption ID",
  assignIssueSchema,
  async (params: AssignIssueParams): Promise<MCPToolResponse> => {
    const { resultErrorId, assumptionId } = params;
    const updatedRecord = await mcpResultErrorHandler.assignIssue(
      resultErrorId,
      assumptionId,
    );
    return createSuccessResponse(
      updatedRecord,
      "Issue assigned to result error successfully:",
    );
  },
  "assigning issue to result error",
);

export const reviewError = createMcpTool(
  "review-result-error",
  "Run automated review analysis on a result error to find similar issues and create assumptions",
  reviewErrorSchema,
  async (params: ReviewErrorParams): Promise<MCPToolResponse> => {
    const { resultErrorId } = params;
    const reviewedRecord =
      await mcpResultErrorHandler.reviewError(resultErrorId);
    return createSuccessResponse(
      reviewedRecord,
      "Result error reviewed successfully:",
    );
  },
  "reviewing result error",
);

export const bulkReview = createMcpTool(
  "bulk-review-result-errors",
  "Run automated review analysis on multiple result errors in batch",
  bulkReviewSchema,
  async (params: BulkReviewParams): Promise<MCPToolResponse> => {
    const { errorIds } = params;
    const bulkResults = await mcpResultErrorHandler.bulkReview(errorIds);

    const successMessage = `Bulk review completed: ${bulkResults.successCount}/${bulkResults.totalProcessed} processed successfully`;
    return createSuccessResponse(bulkResults, successMessage);
  },
  "bulk reviewing result errors",
);

export const getResultErrorById = createMcpTool(
  "get-result-error-by-id",
  "Retrieve detailed information about a specific result error by its unique ID",
  getResultErrorByIdSchema,
  async (params: GetResultErrorByIdParams): Promise<MCPToolResponse> => {
    const { resultErrorId } = params;
    const resultError =
      await mcpResultErrorHandler.getResultErrorById(resultErrorId);
    return createSuccessResponse(resultError);
  },
  "fetching result error",
);
