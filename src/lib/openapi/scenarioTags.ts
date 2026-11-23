// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import type { ZodTypeAny } from "zod";
import {
  tagSelection,
  tagDelete,
  tagUndo,
  tagPreview,
  selectedScenarioIds,
  assignmentBody,
  inlineTagBody,
  tagSummary,
  tagFields,
  tagItemParams,
  tagProjectParams,
  managedTag,
} from "@/schemas/scenarioTagSchemas";
import { ErrorResponseSchema } from "./common";
import { z } from "./zod";

const content = (schema: ZodTypeAny) => ({ "application/json": { schema } });
const response = (description: string, schema: ZodTypeAny) => ({
  description,
  content: content(schema),
});
const path = "/api/v2/projects/{projectId}/scenario-tags";
const meta = { tags: ["Test Scenarios"], security: [{ BearerAuth: [] }] };
const errors = {
  400: response("Invalid request", ErrorResponseSchema),
  401: response("Authentication required", ErrorResponseSchema),
  403: response("Inactive account", ErrorResponseSchema),
  404: response("Project or tag not found", ErrorResponseSchema),
  409: response("Name or deletion conflict", ErrorResponseSchema),
};
export function registerScenarioTagRoutes(registry: OpenAPIRegistry): void {
  const body = { required: true, content: content(tagFields) };
  registry.registerPath({
    ...meta,
    method: "get",
    path,
    request: { params: tagProjectParams },
    responses: {
      ...errors,
      200: response("Project tags with usage", managedTag.array()),
    },
  });
  registry.registerPath({
    ...meta,
    method: "post",
    path,
    request: { params: tagProjectParams, body },
    responses: { ...errors, 201: response("Created tag", managedTag) },
  });
  registry.registerPath({
    ...meta,
    method: "patch",
    path: `${path}/{tagId}`,
    request: { params: tagItemParams, body },
    responses: { ...errors, 200: response("Updated tag", managedTag) },
  });
  for (const [suffix, input, output] of [
    ["/deletion/preview", tagSelection, tagPreview],
    ["/deletion", tagDelete, tagUndo],
    ["/deletion/undo", tagUndo, null],
  ] as const) {
    registry.registerPath({
      ...meta,
      method: "post",
      path: path + suffix,
      request: {
        params: tagProjectParams,
        body: { required: true, content: content(input) },
      },
      responses: {
        ...errors,
        ...(output
          ? { 200: response("Tag deletion operation", output) }
          : { 204: { description: "Restored deletion" } }),
      },
    });
  }
  for (const [method, suffix, schema] of [
    ["post", "/inline", inlineTagBody],
    ["put", "/assignment", assignmentBody],
  ] as const) {
    registry.registerPath({
      ...meta,
      method,
      path: path + suffix,
      request: {
        params: tagProjectParams,
        body: { required: true, content: content(schema) },
      },
      responses: { ...errors, 200: response("Current tag", tagSummary) },
    });
  }
  registry.registerPath({
    ...meta,
    method: "post",
    path: `${path}/selection-counts`,
    request: {
      params: tagProjectParams,
      body: { required: true, content: content(selectedScenarioIds) },
    },
    responses: {
      ...errors,
      200: response("Assigned scenarios per tag", z.record(z.number().int())),
    },
  });
}
