// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { GetPromptRequestSchema, JSONRPCRequestSchema } from "@modelcontextprotocol/sdk/types.js";

export const normalizePromptRequest = (body: unknown): unknown => {
  if (Array.isArray(body)) return body.map(normalizePromptRequest);
  const parsed = GetPromptRequestSchema.safeParse(body);
  if (!parsed.success || !JSONRPCRequestSchema.safeParse(body).success || parsed.data.params.name !== "tms-workflow-assistant") return body;
  if (typeof body !== "object" || body === null || !("id" in body)) return body;
  const envelope = body as Record<string, unknown>;
  const params = envelope.params as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(params, "arguments")) return body;
  return { ...envelope, params: { ...params, arguments: {} } };
};
