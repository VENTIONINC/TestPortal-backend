import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import type {
  MCPToolResponse,
  PrismaAssumption,
  AssumptionWithRelations,
} from "@/types";
import {
  buildSchema,
  defaultContext,
  expectErrorResponse,
  normalizeJson,
  parseResponseJson,
  type ZodShape,
} from "@/test-utils/mcpContractTestUtils";

jest.mock("@/handlers/mcpAssumptionHandler", () => ({
  mcpAssumptionHandler: {
    createAssumption: jest.fn(),
    updateAssumption: jest.fn(),
  },
}));

import { createAssumption, updateAssumption } from "@/mcp/tools/assumptions";
import { mcpAssumptionHandler } from "@/handlers/mcpAssumptionHandler";

const mockedAssumptionHandler = mcpAssumptionHandler as jest.Mocked<
  typeof mcpAssumptionHandler
>;

describe("MCP assumption contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("create-assumption", () => {
    it("requires issueId and resultErrorId", () => {
      const [, , schema] = createAssumption;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(
        zodSchema.safeParse({ issueId: "issue-1", resultErrorId: "err-1" })
          .success,
      ).toBe(true);
      expect(zodSchema.safeParse({ issueId: "issue-1" }).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = createAssumption;
      const payload = {
        issueId: "issue-1",
        resultErrorId: "err-1",
        madeBy: "user",
        isConfirmed: false,
        score: 0.5,
      };
      const now = new Date();
      const assumption: PrismaAssumption = {
        id: "assumption-1",
        createdAt: now,
        updatedAt: now,
        isConfirmed: false,
        score: 0.5,
        madeBy: "user",
        issueId: "issue-1",
        resultErrorId: "err-1",
      };
      mockedAssumptionHandler.createAssumption.mockResolvedValue(assumption);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(normalizeJson(assumption));
      expect(mcpAssumptionHandler.createAssumption).toHaveBeenCalledWith(
        payload,
      );
    });
    it("returns error response when handler fails", async () => {
      const [, , , handler] = createAssumption;
      const payload = {
        issueId: "issue-1",
        resultErrorId: "err-1",
        madeBy: "user",
        isConfirmed: false,
        score: 0.5,
      };
      mockedAssumptionHandler.createAssumption.mockRejectedValue(
        new Error("Issue not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(response, "creating assumption", "Issue not found");
    });
  });

  describe("update-assumption", () => {
    it("requires assumptionId and madeBy", () => {
      const [, , schema] = updateAssumption;
      const zodSchema = buildSchema(schema as ZodShape);

      expect(
        zodSchema.safeParse({ assumptionId: "a1", madeBy: "user" }).success,
      ).toBe(true);
      expect(zodSchema.safeParse({ assumptionId: "a1" }).success).toBe(false);
    });

    it("returns success response with stable shape", async () => {
      const [, , , handler] = updateAssumption;
      const payload = { assumptionId: "a1", madeBy: "user" };
      const result = {
        action: "updated" as const,
        assumption: { id: "a1" } as AssumptionWithRelations,
      };
      mockedAssumptionHandler.updateAssumption.mockResolvedValue(result);

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;
      const parsed = parseResponseJson(response);

      expect(response.content?.[0]?.type).toBe("text");
      expect(parsed).toEqual(result.assumption);
      expect(mcpAssumptionHandler.updateAssumption).toHaveBeenCalledWith(
        payload.assumptionId,
        { madeBy: payload.madeBy },
      );
    });
    it("returns error response when handler fails", async () => {
      const [, , , handler] = updateAssumption;
      const payload = { assumptionId: "a1", madeBy: "user" };
      mockedAssumptionHandler.updateAssumption.mockRejectedValue(
        new Error("Assumption not found"),
      );

      const response = (await handler(
        payload,
        defaultContext,
      )) as MCPToolResponse;

      expectErrorResponse(
        response,
        "updating assumption",
        "Assumption not found",
      );
    });
  });
});
