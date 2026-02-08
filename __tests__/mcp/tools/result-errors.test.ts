import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type { MCPToolResponse } from "@/types";
import {
  buildSchema,
  defaultContext,
  expectErrorResponse,
  parseResponseJson,
  type ZodShape,
} from "@/test-utils/mcpContractTestUtils";

jest.mock("@/handlers/mcpResultErrorHandler", () => ({
  mcpResultErrorHandler: {
    reviewError: jest.fn(),
    bulkReview: jest.fn(),
    analyzeErrors: jest.fn(),
  },
}));

import {
  reviewError,
  bulkReview,
  analyzeResultErrors,
} from "@/mcp/tools/result-errors";
import { mcpResultErrorHandler } from "@/handlers/mcpResultErrorHandler";

const mockedResultErrorHandler = mcpResultErrorHandler as jest.Mocked<
  typeof mcpResultErrorHandler
>;

describe("MCP result error contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("review-result-error", () => {
    it("requires resultErrorId", () => {
      const [, , schema] = reviewError;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(zodSchema.safeParse({ resultErrorId: "err-1" }).success).toBe(
        true,
      );
      expect(zodSchema.safeParse({}).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = reviewError;
      const payload = { resultErrorId: "err-1" };
      const reviewed = { id: "err-1" };
      mockedResultErrorHandler.reviewError.mockResolvedValue(reviewed as never);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(reviewed);
      expect(mcpResultErrorHandler.reviewError).toHaveBeenCalledWith(
        payload.resultErrorId,
      );
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = reviewError;
      const payload = { resultErrorId: "err-1" };
      mockedResultErrorHandler.reviewError.mockRejectedValue(
        new Error("Result error not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(
        response,
        "reviewing result error",
        "Result error not found",
      );
    });
  });

  describe("bulk-review-result-errors", () => {
    it("enforces uuid list", () => {
      const [, , schema] = bulkReview;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(zodSchema.safeParse({ errorIds: ["bad-id"] }).success).toBe(false);
      expect(
        zodSchema.safeParse({
          errorIds: ["550e8400-e29b-41d4-a716-446655440000"],
        }).success,
      ).toBe(true);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = bulkReview;
      const payload = { errorIds: ["550e8400-e29b-41d4-a716-446655440000"] };
      const bulkResult = {
        successful: [],
        failed: [],
        totalProcessed: 1,
        successCount: 1,
        failureCount: 0,
      };
      mockedResultErrorHandler.bulkReview.mockResolvedValue(bulkResult);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(bulkResult);
      expect(mcpResultErrorHandler.bulkReview).toHaveBeenCalledWith(
        payload.errorIds,
      );
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = bulkReview;
      const payload = { errorIds: ["550e8400-e29b-41d4-a716-446655440000"] };
      mockedResultErrorHandler.bulkReview.mockRejectedValue(
        new Error("Bulk review failed"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(
        response,
        "bulk reviewing result errors",
        "Bulk review failed",
      );
    });
  });

  describe("analyze-result-errors", () => {
    it("requires projectId and non-empty errorIds", () => {
      const [, , schema] = analyzeResultErrors;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(
        zodSchema.safeParse({ projectId: "proj-1", errorIds: ["e1"] }).success,
      ).toBe(true);
      expect(
        zodSchema.safeParse({ projectId: "proj-1", errorIds: [] }).success,
      ).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = analyzeResultErrors;
      const payload = { projectId: "proj-1", errorIds: ["e1"] };
      const analyzed = {
        analyzedResults: 1,
        updatedResultIds: ["r1"],
        skippedErrorIds: [],
        totalErrors: 1,
      };
      mockedResultErrorHandler.analyzeErrors.mockResolvedValue(analyzed);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(analyzed);
      expect(mcpResultErrorHandler.analyzeErrors).toHaveBeenCalledWith(
        payload.projectId,
        payload.errorIds,
      );
    });

    it("returns error response when handler fails", async () => {
      const [, , , handler] = analyzeResultErrors;
      const payload = { projectId: "proj-1", errorIds: ["e1"] };
      mockedResultErrorHandler.analyzeErrors.mockRejectedValue(
        new Error("Analysis failed"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(
        response,
        "analyzing result errors",
        "Analysis failed",
      );
    });
  });
});
