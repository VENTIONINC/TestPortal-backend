// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
const list = jest.fn();
const add = jest.fn();
const remove = jest.fn();
jest.mock("@/services/testScenarioIntegrationService", () => ({
  testScenarioIntegrationService: {
    listSpecLinks: list,
    addSpecLink: add,
    removeSpecLink: remove,
  },
}));
import {
  listSpecLinksSchema,
  mutateSpecLinkSchema,
} from "@/mcp/schemas/testScenarioSpecLinkSchemas";
import {
  listTestScenarioSpecLinks,
  addTestScenarioSpecLink,
  removeTestScenarioSpecLink,
} from "@/mcp/tools/test-scenario-spec-links";
import { createActionCatalog } from "@/mcp/actionCatalog";
import { executeAction } from "@/mcp/actionExecution";

const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
const specId = "33333333-3333-4333-8333-333333333333";
const pair = { projectId, scenarioId, specId };
describe("scenario Spec link actions", () => {
  beforeEach(() => jest.resetAllMocks());
  it("validates UUIDs, pagination and strict fields", () => {
    for (const input of [
      { ...pair, projectId: "bad" },
      { ...pair, specId: null },
      { ...pair, extra: true },
    ])
      expect(mutateSpecLinkSchema.safeParse(input).success).toBe(false);
    for (const input of [
      { projectId, scenarioId, page: "1" },
      { projectId, scenarioId, limit: null },
      { projectId, scenarioId, limit: 101 },
      { projectId, scenarioId, extra: 1 },
    ])
      expect(listSpecLinksSchema.safeParse(input).success).toBe(false);
  });
  it("delegates and preserves list/add envelopes and explicit removal", async () => {
    const input = listSpecLinksSchema.parse({ projectId, scenarioId });
    const envelope = {
      projectId,
      scenarioId,
      specs: [],
      total: 0,
      page: 1,
      limit: 30,
      totalPages: 0,
    };
    list.mockResolvedValue(envelope as never);
    add.mockResolvedValue({ scenarioId, specId } as never);
    remove.mockResolvedValue(undefined as never);
    expect(await listTestScenarioSpecLinks[3](input)).toEqual({
      content: [{ type: "text", text: JSON.stringify(envelope, null, 2) }],
    });
    expect(await addTestScenarioSpecLink[3](pair)).toEqual({
      content: [
        { type: "text", text: JSON.stringify({ scenarioId, specId }, null, 2) },
      ],
    });
    expect(await removeTestScenarioSpecLink[3](pair)).toEqual({
      content: [
        {
          type: "text",
          text: JSON.stringify({ ...pair, removed: true }, null, 2),
        },
      ],
    });
    expect(list).toHaveBeenCalledWith(input);
    expect(add).toHaveBeenCalledWith(pair);
    expect(remove).toHaveBeenCalledWith(pair);
  });
  it.each([
    [addTestScenarioSpecLink, add, "duplicate link"],
    [removeTestScenarioSpecLink, remove, "link not found"],
  ] as const)("preserves service failures", async (action, mock, message) => {
    mock.mockRejectedValue(new Error(message) as never);
    expect(await action[3](pair)).toMatchObject({
      isError: true,
      content: [{ text: expect.stringContaining(message) }],
    });
  });
  it("dispatches each registered link action", async () => {
    list.mockResolvedValue({ specs: [] } as never);
    add.mockResolvedValue({ scenarioId, specId } as never);
    remove.mockResolvedValue(undefined as never);
    const catalog = createActionCatalog("actor");
    for (const [actionId, args] of [
      ["testportal-list-test-scenario-spec-links", { projectId, scenarioId }],
      ["testportal-add-test-scenario-spec-link", pair],
      ["testportal-remove-test-scenario-spec-link", pair],
    ] as const) {
      expect(
        (await executeAction(catalog, { actionId, arguments: args })).isError,
      ).not.toBe(true);
    }
  });
});
