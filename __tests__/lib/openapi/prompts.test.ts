// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { generateOpenAPISpec } from "@/lib/openapi";

it("publishes TMS arguments, modes and validation feedback", () => {
  const spec = generateOpenAPISpec();
  const schemas = spec.components?.schemas ?? {};
  expect(schemas.GeneratePromptRequest).toMatchObject({ properties: {
    project_id: { type: "string", format: "uuid" },
    task: { type: "string" },
    execution_mode: { enum: ["human_guided", "client_executed"] },
  } });
  expect(schemas.GeneratePromptRequest).not.toHaveProperty("required");
  expect((schemas.GeneratePromptRequest as { properties: Record<string, unknown> }).properties.execution_mode).not.toHaveProperty("default");
  expect(schemas.PromptParameter).toMatchObject({ properties: { enum: { type: "array" } } });
  expect(JSON.stringify(spec.paths?.["/api/v2/prompts/{name}/generate"])).toContain("tms-workflow-assistant");
  expect(JSON.stringify(spec.paths?.["/api/v2/prompts/{name}/generate"])).toContain("PromptValidationError");
});

