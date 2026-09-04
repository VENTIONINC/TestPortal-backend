// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  createTestScenarioSchema,
  updateTestScenarioSchema,
} from "@/schemas/testScenarioSchemas";

const projectId = "11111111-1111-1111-1111-111111111111";

describe("create test scenario schema", () => {
  it.each([
    [
      { projectId, title: " Scenario ", contentMd: "# Exact" },
      { projectId, title: "Scenario", contentMd: "# Exact" },
    ],
    [
      {
        projectId,
        title: "Scenario",
        contentMd: "  # Exact\n",
        details: "  Human-readable details  ",
      },
      {
        projectId,
        title: "Scenario",
        contentMd: "  # Exact\n",
        details: "Human-readable details",
      },
    ],
  ])("accepts %j", (body, expected) => {
    expect(createTestScenarioSchema.parse(body)).toEqual(expected);
  });

  it.each([
    { projectId, title: "Scenario", contentMd: "# Exact", details: "" },
    { projectId, title: "Scenario", contentMd: "# Exact", details: "   " },
    { projectId, title: "Scenario", contentMd: "# Exact", details: null },
    {
      projectId,
      title: "Scenario",
      contentMd: "# Exact",
      createdById: "22222222-2222-2222-2222-222222222222",
    },
  ])("rejects invalid or unsupported input %j", (body) => {
    expect(createTestScenarioSchema.safeParse(body).success).toBe(false);
  });
});

describe("update test scenario schema", () => {
  it.each([
    [{ title: "  Updated title  " }, { title: "Updated title" }],
    [{ contentMd: "  # Updated\n" }, { contentMd: "  # Updated\n" }],
    [{ details: "  Updated details  " }, { details: "Updated details" }],
    [{ details: null }, { details: null }],
    [
      { title: " Updated ", contentMd: "# Updated" },
      { title: "Updated", contentMd: "# Updated" },
    ],
    [
      { title: " Updated ", details: " Details " },
      { title: "Updated", details: "Details" },
    ],
    [
      { contentMd: "# Updated", details: null },
      { contentMd: "# Updated", details: null },
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
    { details: "" },
    { details: "   " },
    { details: 123 },
    { title: "Updated", details: 123 },
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
