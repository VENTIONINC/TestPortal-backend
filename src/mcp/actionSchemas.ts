// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import type { MCPToolSchema } from "@/types";

/** Normalize the raw shapes accepted by the MCP SDK without tightening them. */
export const normalizeActionSchema = (schema: MCPToolSchema): z.ZodTypeAny => {
  if (schema instanceof z.ZodType) return schema;
  // Registered raw shapes consist of Zod fields; the broader legacy type also
  // permits JSON-like fields, which the SDK does not accept as a Zod shape.
  return z.object(schema as z.ZodRawShape);
};

/** Match the existing TMS registration's strict structural pass before effects. */
export const parseActionInput = async (
  schema: MCPToolSchema,
  input: unknown,
): Promise<unknown> => {
  const normalized = normalizeActionSchema(schema);
  if (!(schema instanceof z.ZodType)) return normalized.parseAsync(input);
  let structural: z.ZodTypeAny = normalized;
  while (structural instanceof z.ZodEffects)
    structural = structural.innerType();
  if (structural instanceof z.ZodObject) {
    const parsed = await structural.strict().parseAsync(input);
    return normalized.parseAsync(parsed);
  }
  return normalized.parseAsync(input);
};
