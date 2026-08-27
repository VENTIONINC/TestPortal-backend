// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { updateTestScenarioSchema } from "@/schemas/testScenarioSchemas";

describe("update test scenario schema", () => {
  it.each([
    [{ title: "  Updated title  " }, { title: "Updated title" }],
    [{ contentMd: "  # Updated\n" }, { contentMd: "  # Updated\n" }],
    [
      { title: " Updated ", contentMd: "# Updated" },
      { title: "Updated", contentMd: "# Updated" },
    ],
  ])("accepts %j", (body, expected) => {
    expect(updateTestScenarioSchema.parse(body)).toEqual(expected);
  });

  it.each([
    {},
    { title: "" },
    { title: "   " },
    { contentMd: "" },
    { title: null },
    { contentMd: null },
    { title: 123 },
    { contentMd: 123 },
    { unknown: "value" },
    { title: "Updated", unknown: "value" },
    { projectId: "11111111-1111-1111-1111-111111111111" },
    { title: "Updated", createdById: "22222222-2222-2222-2222-222222222222" },
    { contentMd: "# Updated", createdAt: "2026-01-01T00:00:00.000Z" },
    { contentMd: "# Updated", updatedAt: "2026-01-01T00:00:00.000Z" },
    null,
  ])("rejects %j", (body) => {
    expect(updateTestScenarioSchema.safeParse(body).success).toBe(false);
  });
});
