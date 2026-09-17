// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { buildIssueParams, buildResultParams } from "@/lib/params-builder";

describe("buildIssueParams", () => {
  it("preserves an exact lowercase issue category", () => {
    expect(
      buildIssueParams({
        projectId: "project-1",
        category: "performance",
      }),
    ).toMatchObject({ projectId: "project-1", category: "performance" });
  });

  it("preserves an exact execution type", () => {
    expect(
      buildIssueParams({
        projectId: "project-1",
        type: "Custom Release",
      }),
    ).toMatchObject({ projectId: "project-1", type: "Custom Release" });
  });

  it("omits the reserved all sentinel", () => {
    expect(
      buildIssueParams({
        projectId: "project-1",
        type: "all",
      }),
    ).toEqual({ projectId: "project-1" });
  });
});

describe("buildResultParams", () => {
  it.each([
    ["2026-07-02, 2026-07-04", ["2026-07-02", "2026-07-04"]],
    [["2026-07-02", "2026-07-04"], ["2026-07-02", "2026-07-04"]],
  ])("parses selected result dates from %p", (dates, expected) => {
    expect(
      buildResultParams({
        projectId: "project-1",
        dates,
      }),
    ).toMatchObject({ dates: expected });
  });

  it("omits the reserved all sentinel for result type filters", () => {
    expect(
      buildResultParams({
        projectId: "project-1",
        type: "all",
      }),
    ).toEqual({ projectId: "project-1" });
  });
});
