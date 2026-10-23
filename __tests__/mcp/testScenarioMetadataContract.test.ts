// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import {
  createTestScenarioSchema,
  updateTestScenarioSchema,
} from "@/mcp/schemas/testScenarioSchemas";
const projectId = "11111111-1111-4111-8111-111111111111";
const scenarioId = "22222222-2222-4222-8222-222222222222";
describe("scenario MCP metadata", () => {
  it("accepts trimmed HTTP metadata on create and rejects creator spoofing", () => {
    expect(
      createTestScenarioSchema.parse({
        projectId,
        title: "Case",
        priority: "high",
        relatedIssueUrl: " https://example.com/TP-20 ",
      }),
    ).toMatchObject({
      priority: "high",
      relatedIssueUrl: "https://example.com/TP-20",
    });
    expect(
      createTestScenarioSchema.safeParse({
        projectId,
        title: "Case",
        createdById: scenarioId,
      }).success,
    ).toBe(false);
  });
  it("supports metadata-only updates and null clears while rejecting invalid metadata", () => {
    expect(
      updateTestScenarioSchema.parse({ projectId, scenarioId, priority: null }),
    ).toEqual({ projectId, scenarioId, priority: null });
    for (const metadata of [
      { priority: "urgent" },
      { relatedIssueUrl: "/TP-20" },
      { relatedIssueUrl: "ftp://example.com" },
      { objective: "obsolete" },
    ]) {
      expect(
        updateTestScenarioSchema.safeParse({
          projectId,
          scenarioId,
          ...metadata,
        }).success,
      ).toBe(false);
    }
  });
});
