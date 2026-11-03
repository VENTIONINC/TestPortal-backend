// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { normalizePromptRequest } from "@/mcp/normalizePromptRequest";

const request = { jsonrpc: "2.0", id: 42, method: "prompts/get", params: { name: "tms-workflow-assistant", _meta: { progressToken: "token", extra: "kept" }, extension: "kept" } };

describe("prompt request compatibility", () => {
  it("copies eligible requests preserving IDs, metadata and siblings", () => {
    const sibling = { jsonrpc: "2.0", id: 43, method: "tools/list" };
    const batch = [request, sibling];
    expect(normalizePromptRequest(batch)).toEqual([{ ...request, params: { ...request.params, arguments: {} } }, sibling]);
    expect(request.params).not.toHaveProperty("arguments");
  });
  it("does not alter explicit or ineligible input", () => {
    const cases = [
      { ...request, params: { ...request.params, arguments: {} } },
      ...[null, [], "bad", { task: 3 }, { task: " " }].map((value) => ({ ...request, params: { ...request.params, arguments: value } })),
      { ...request, params: { name: "other" } },
      { ...request, method: "tools/call" },
      { ...request, jsonrpc: "1.0" },
      { method: request.method, params: request.params, jsonrpc: "2.0" },
      null,
    ];
    for (const input of cases) expect(normalizePromptRequest(input)).toBe(input);
  });
});
