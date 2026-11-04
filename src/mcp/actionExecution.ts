// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ActionTool } from "@/mcp/actionCatalog";
import { parseActionInput } from "@/mcp/actionSchemas";
import { actionError } from "@/mcp/actionDiscovery";

export const executeActionSchema = z
  .object({
    actionId: z
      .string()
      .min(1)
      .refine((value) => value.trim().length > 0, "actionId must be nonblank"),
    arguments: z.record(z.unknown()),
  })
  .strict();

export const executeAction = async (
  catalog: Map<string, ActionTool>,
  input: z.infer<typeof executeActionSchema>,
): Promise<CallToolResult> => {
  const tool = catalog.get(input.actionId);
  if (!tool)
    return {
      ...actionError("unknown_action", input.actionId, "Unknown action ID."),
    };
  let parsed: unknown;
  try {
    parsed = await parseActionInput(tool[2], input.arguments);
  } catch (error) {
    if (!(error instanceof z.ZodError)) throw error;
    const issues = error.issues.map((issue) => ({
      path: issue.path.join("."),
      message:
        issue.code === "custom"
          ? issue.message
          : `Invalid value (${issue.code}).`,
    }));
    return {
      ...actionError(
        "invalid_arguments",
        input.actionId,
        "Action arguments failed validation.",
        issues,
      ),
    };
  }
  // The allowlisted handler is paired with its original validator in the catalog.
  return (await tool[3](parsed as never)) as CallToolResult;
};
