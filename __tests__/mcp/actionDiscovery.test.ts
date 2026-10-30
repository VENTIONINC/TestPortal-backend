// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createActionCatalog, indexActions } from "@/mcp/actionCatalog";
import { findAction, findActionSchema } from "@/mcp/actionDiscovery";

const catalog = createActionCatalog("actor");
const response = (input: unknown) => {
  const result = findAction(catalog, findActionSchema.parse(input));
  return { ...result, data: JSON.parse(result.content[0]?.text ?? "{}") };
};

describe("action discovery", () => {
  it("validates envelopes and supports overview, search and lookup", () => {
    expect(response({}).data).toMatchObject({
      mode: "overview",
      actions: [],
      hasMore: false,
    });
    expect(response({ query: "scenario" }).data).toMatchObject({
      mode: "search",
    });
    expect(
      response({ actionId: "testportal-current-time" }).data,
    ).toMatchObject({ mode: "lookup", hasMore: false });
    for (const input of [
      { query: "a", actionId: "b" },
      { limit: 2 },
      { query: " " },
      { actionId: " " },
      { query: "x", limit: 0 },
      { query: "x", limit: 6 },
      { query: "x", limit: 1.5 },
      { area: "other" },
      { extra: true },
    ]) {
      expect(findActionSchema.safeParse(input).success).toBe(false);
    }
  });

  it("returns relevant bounded, deterministic results and no arbitrary fallback", () => {
    const ids = (input: unknown) =>
      response(input).data.actions.map(
        (action: { actionId: string }) => action.actionId,
      );
    expect(
      ids({ query: "test cases", area: "tms" }).some((id: string) =>
        id.includes("test-scenario"),
      ),
    ).toBe(true);
    expect(ids({ query: "manual step outcome", area: "tms" })).toContain(
      "testportal-update-manual-test-run-step",
    );
    for (const area of ["core", "tms"])
      expect(ids({ query: "available projects", area })).toContain(
        "testportal-get-available-projects",
      );
    expect(
      ids({ query: "available projects" }).filter(
        (id: string) => id === "testportal-get-available-projects",
      ),
    ).toHaveLength(1);
    expect(ids({ query: "quasarzyx" })).toEqual([]);
    expect(response({ query: "scenario", limit: 1 }).data).toMatchObject({
      hasMore: true,
    });
    expect(ids({ query: "scenario", limit: 5 })).toEqual(
      ids({ query: "scenario", limit: 5 }),
    );
    const ties = indexActions([
      ["testportal-get-test-scenario", "same", {}, async () => ({})],
      ["testportal-get-result-by-id", "same", {}, async () => ({})],
    ]);
    const tied = findAction(ties, { query: "same" });
    const tiedActions = JSON.parse(tied.content[0]?.text ?? "{}").actions;
    expect(
      tiedActions.map((action: { actionId: string }) => action.actionId),
    ).toEqual(["testportal-get-result-by-id", "testportal-get-test-scenario"]);
    expect(
      tiedActions.map((action: { areas: string[] }) => action.areas),
    ).toEqual([["core"], ["tms"]]);
  });

  it("looks up every action without executing it and distinguishes mismatch from unknown", () => {
    for (const actionId of catalog.keys())
      expect(response({ actionId }).data.actions[0].actionId).toBe(actionId);
    expect(
      response({ actionId: "testportal-current-time", area: "tms" }).isError,
    ).toBeUndefined();
    expect(
      response({ actionId: "testportal-get-results", area: "tms" }).data.kind,
    ).toBe("area_mismatch");
    expect(response({ actionId: "missing" }).data.kind).toBe("unknown_action");
  });
});
