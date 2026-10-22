// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";

import { mcpAssumptionHandler } from "@/handlers/mcpAssumptionHandler";
import * as assumptionTools from "@/mcp/tools/assumptions";

describe("MCP update-assumption reviewer binding", () => {
  afterEach(() => jest.restoreAllMocks());

  it("captures the authenticated MCP user and passes it to confirmation", async () => {
    const factory: unknown = Reflect.get(
      assumptionTools,
      "createUpdateAssumptionTool",
    );
    expect(factory).toEqual(expect.any(Function));
    if (typeof factory !== "function") return;

    const handler = jest
      .spyOn(mcpAssumptionHandler, "updateAssumption")
      .mockResolvedValue({
        action: "updated",
        assumption: { id: "assumption-1", isConfirmed: true },
      } as never);
    const tool = factory("reviewer-1") as [
      string,
      string,
      unknown,
      (params: unknown) => Promise<unknown>,
    ];

    await tool[3]({
      assumptionId: "assumption-1",
      madeBy: "user",
      isConfirmed: true,
    });

    expect(handler).toHaveBeenCalledWith(
      "assumption-1",
      { madeBy: "user", isConfirmed: true },
      "reviewer-1",
    );
  });
});
