// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { buildResultParams } from "@/lib/params-builder";

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
});
