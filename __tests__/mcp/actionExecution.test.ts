// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import { executeAction, executeActionSchema } from "@/mcp/actionExecution";
import { indexActions } from "@/mcp/actionCatalog";

describe("action execution", () => {
  it("validates envelopes and arguments before invoking one handler", async () => {
    const handler = jest.fn(async () => ({
      content: [{ type: "text" as const, text: "result" }],
    }));
    const catalog = indexActions([
      [
        "testportal-example",
        "example",
        z.object({ value: z.number() }).strict(),
        handler,
      ],
    ]);
    for (const input of [
      { actionId: "", arguments: {} },
      { actionId: "x", arguments: [] },
      { actionId: "x", arguments: {}, extra: true },
    ])
      expect(executeActionSchema.safeParse(input).success).toBe(false);
    expect(
      (await executeAction(catalog, { actionId: "unknown", arguments: {} }))
        .isError,
    ).toBe(true);
    expect(
      (
        await executeAction(catalog, {
          actionId: " testportal-example ",
          arguments: { value: 1 },
        })
      ).isError,
    ).toBe(true);
    expect(
      (
        await executeAction(catalog, {
          actionId: "testportal-example",
          arguments: { value: "secret" },
        })
      ).isError,
    ).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(
      await executeAction(catalog, {
        actionId: "testportal-example",
        arguments: { value: 1 },
      }),
    ).toEqual({ content: [{ type: "text", text: "result" }] });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("passes through service errors without wrapping", async () => {
    const result = {
      content: [{ type: "text" as const, text: "service failure" }],
      isError: true,
    };
    const catalog = indexActions([
      ["testportal-example", "example", {}, async () => result],
    ]);
    expect(
      await executeAction(catalog, {
        actionId: "testportal-example",
        arguments: {},
      }),
    ).toEqual(result);
  });
});
