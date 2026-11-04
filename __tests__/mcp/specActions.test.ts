// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
const list = jest.fn();
jest.mock("@/handlers/mcpSpecHandler", () => ({
  mcpSpecHandler: { listSpecs: list },
}));
import { listSpecsSchema } from "@/mcp/schemas/specSchemas";
import { listSpecs } from "@/mcp/tools/specs";
import { createActionCatalog } from "@/mcp/actionCatalog";
import { executeAction } from "@/mcp/actionExecution";

const projectId = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
describe("list Specs action", () => {
  it.each([
    { projectId: "bad" },
    { projectId: null },
    { projectId, page: "1" },
    { projectId, page: null },
    { projectId, limit: 101 },
    { projectId, extra: true },
  ])("rejects invalid input %o", (input) => {
    expect(listSpecsSchema.safeParse(input).success).toBe(false);
  });
  it("returns the service envelope", async () => {
    const envelope = {
      projectId,
      specs: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    };
    list.mockResolvedValue(envelope as never);
    const input = listSpecsSchema.parse({ projectId });
    const response = await listSpecs[3](input);
    expect(list).toHaveBeenCalledWith(input);
    expect(response).toEqual({
      content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }],
    });
  });
  it("dispatches the catalog action after validation", async () => {
    const envelope = {
      projectId,
      specs: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    };
    list.mockResolvedValue(envelope as never);
    const response = await executeAction(createActionCatalog("actor"), {
      actionId: "testportal-list-specs",
      arguments: { projectId },
    });
    expect(response).toEqual({
      content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }],
    });
  });
});
