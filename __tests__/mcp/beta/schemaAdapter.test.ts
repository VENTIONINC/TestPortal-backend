// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import { toStandardSchema } from "@/mcp/beta/schemaAdapter";
import { statusCheck } from "@/mcp/tools/status-check";
import { currentTime } from "@/mcp/tools/current-time";
import { getAvailableProjects } from "@/mcp/tools/projects";
import { getIssues, getIssueById, createIssue } from "@/mcp/tools/issues";
import { getResults, getResultById, getResultsStats } from "@/mcp/tools/results";
import {
  createAssumption,
  createUpdateAssumptionTool,
  getAssumptionById,
} from "@/mcp/tools/assumptions";
import { getExecutionById } from "@/mcp/tools/executions";
import {
  assignIssue,
  reviewError,
  bulkReview,
  getResultErrorById,
} from "@/mcp/tools/result-errors";
import { getSpecById } from "@/mcp/tools/specs";
import {
  deleteTestScenario,
  getTestScenario,
  listTestScenarios,
  updateTestScenario,
} from "@/mcp/tools/test-scenarios";
import * as testPortalAssistant from "@/mcp/prompts/test-portal-assistant/v1.0.0";
import * as issueAnalysisAssistant from "@/mcp/prompts/issue-analysis-assistant/v1.0.0";
import * as environmentPerformanceAssistant from "@/mcp/prompts/environment-performance-assistant/v1.0.0";
import * as developerCodeAssistant from "@/mcp/prompts/developer-code-assistant/v1.0.0";
import * as documentationArchitect from "@/mcp/prompts/documentation-architect/v1.0.0";

describe("MCP v2 Zod v3 schema adapter", () => {
  it("exports an object schema for Zod raw shapes", () => {
    const standard = toStandardSchema({
      required: z.string(),
      optional: z.number().optional(),
    });

    expect(standard["~standard"].jsonSchema.input({ target: "draft-2020-12" }))
      .toMatchObject({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        type: "object",
        required: ["required"],
        properties: {
          required: { type: "string" },
          optional: { type: "number" },
        },
      });
  });

  it("keeps Zod defaults, nullability, transforms, strictness, and refinements at runtime", async () => {
    const schema = z
      .object({
        name: z.string().trim().transform((value) => value.toUpperCase()),
        count: z.number().default(2),
        note: z.string().nullable().optional(),
      })
      .strict()
      .refine((value) => value.count > 0, "count must be positive");
    const standard = toStandardSchema(schema);
    const jsonSchema = standard["~standard"].jsonSchema.input({
      target: "draft-2020-12",
    });

    expect(jsonSchema).toMatchObject({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      additionalProperties: false,
      properties: {
        count: { default: 2, type: "number" },
      },
    });

    await expect(
      standard["~standard"].validate({ name: "  beta  ", note: null }),
    ).resolves.toEqual({ value: { name: "BETA", count: 2, note: null } });
    await expect(
      standard["~standard"].validate({ name: "beta", extra: true }),
    ).resolves.toMatchObject({ issues: [{ message: expect.any(String) }] });
    await expect(
      standard["~standard"].validate({ name: "beta", count: 0 }),
    ).resolves.toMatchObject({
      issues: [{ message: "count must be positive" }],
    });
  });

  it("exports supported primitive descriptors and rejects unknown descriptors", async () => {
    const standard = toStandardSchema({ page: { type: "number", default: 1 } });

    expect(standard["~standard"].jsonSchema.input({ target: "draft-2020-12" }))
      .toMatchObject({
        properties: { page: { default: 1, type: "number" } },
      });
    await expect(standard["~standard"].validate({})).resolves.toEqual({
      value: { page: 1 },
    });

    expect(() => toStandardSchema({ unsupported: { type: "array" } })).toThrow(
      "Unsupported MCP schema descriptor for unsupported: array",
    );
  });

  it("converts every currently registered tool and prompt input without fallback schemas", () => {
    const tools = [
      statusCheck,
      currentTime,
      getAvailableProjects,
      getIssues,
      getIssueById,
      createIssue,
      getResults,
      getResultById,
      getResultsStats,
      createAssumption,
      createUpdateAssumptionTool("catalog-test-user"),
      getAssumptionById,
      getExecutionById,
      assignIssue,
      reviewError,
      bulkReview,
      getResultErrorById,
      getSpecById,
      listTestScenarios,
      getTestScenario,
      updateTestScenario,
      deleteTestScenario,
    ];
    const prompts = [
      testPortalAssistant.testPortalAssistantParameters.argsSchema,
      issueAnalysisAssistant.issueAnalysisAssistantParameters.argsSchema,
      environmentPerformanceAssistant.environmentPerformanceAssistantParameters.argsSchema,
      developerCodeAssistant.developerCodeAssistantParameters.argsSchema,
      documentationArchitect.softwareDocumentationAssistantParameters.argsSchema,
    ];

    for (const [name, _description, inputSchema] of tools) {
      const converted = toStandardSchema(inputSchema)["~standard"].jsonSchema.input({
        target: "draft-2020-12",
      });
      expect(converted.type).toBe("object");
      expect(converted).not.toHaveProperty("$ref");
      expect(converted).not.toHaveProperty("additionalProperties", true);
      expect(name).toBeTruthy();
    }

    for (const inputSchema of prompts) {
      const converted = toStandardSchema(inputSchema)["~standard"].jsonSchema.input({
        target: "draft-2020-12",
      });
      expect(converted.type).toBe("object");
      expect(converted).not.toHaveProperty("$ref");
      expect(converted).not.toHaveProperty("additionalProperties", true);
    }
  });
});
