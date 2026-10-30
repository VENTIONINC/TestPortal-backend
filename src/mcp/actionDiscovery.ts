// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import { actionKeywords, describeAction } from "@/mcp/actionMetadata";
import type { ActionTool } from "@/mcp/actionCatalog";
import type { MCPToolResponse } from "@/types";
import { createSuccessResponse } from "@/mcp/helpers/mcpHelpers";

export const findActionShape = z
  .object({
    query: z.string().trim().min(1).optional(),
    area: z.enum(["core", "tms"]).optional(),
    actionId: z.string().trim().min(1).optional(),
    limit: z.number().int().min(1).max(5).optional(),
  })
  .strict();
export const findActionSchema = findActionShape.superRefine((input, ctx) => {
  if (input.query && input.actionId)
    ctx.addIssue({
      code: "custom",
      message: "query and actionId are mutually exclusive",
    });
  if (input.limit !== undefined && !input.query)
    ctx.addIssue({
      code: "custom",
      path: ["limit"],
      message: "limit requires query",
    });
});
export type FindActionInput = z.infer<typeof findActionSchema>;

export const actionError = (
  kind: string,
  actionId: string,
  message: string,
  issues?: { path: string; message: string }[],
): MCPToolResponse => ({
  isError: true,
  content: [
    {
      type: "text",
      text: JSON.stringify({
        kind,
        actionId,
        message,
        ...(issues ? { issues } : {}),
      }),
    },
  ],
});

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const stopWords = new Set([
  "a",
  "an",
  "the",
  "to",
  "for",
  "of",
  "in",
  "on",
  "with",
  "and",
  "from",
  "testportal",
]);
const score = (query: string, id: string, description: string): number => {
  const phrase = normalize(query);
  const idText = normalize(id);
  const keywords = actionKeywords(id).map(normalize);
  const details = normalize(description);
  const tokens = phrase
    .split(" ")
    .filter((word) => word && !stopWords.has(word));
  if (!tokens.length) return 0;
  let rank = idText === phrase ? 1000 : idText.includes(phrase) ? 150 : 0;
  if (keywords.some((item) => item === phrase)) rank += 200;
  if (details.includes(phrase)) rank += 50;
  for (const token of tokens) {
    if (idText.split(" ").includes(token)) rank += 12;
    if (keywords.some((item) => item.split(" ").includes(token))) rank += 9;
    if (details.split(" ").includes(token)) rank += 2;
  }
  return rank;
};

export const findAction = (
  catalog: Map<string, ActionTool>,
  input: FindActionInput,
): MCPToolResponse => {
  if (input.actionId) {
    const tool = catalog.get(input.actionId);
    if (!tool)
      return actionError(
        "unknown_action",
        input.actionId,
        "Unknown action ID.",
      );
    const action = describeAction(tool);
    if (input.area && !action.areas.includes(input.area))
      return actionError(
        "area_mismatch",
        input.actionId,
        "Action is not in the requested area.",
      );
    return createSuccessResponse({
      mode: "lookup",
      actions: [action],
      hasMore: false,
      guidance: "Use execute-action with this actionId and arguments.",
    });
  }
  if (!input.query) {
    const areas = input.area ? [input.area] : ["core", "tms"];
    return createSuccessResponse({
      mode: "overview",
      areas,
      groups: {
        ...(areas.includes("core")
          ? { core: "Results, issues, assumptions, executions and Specs" }
          : {}),
        ...(areas.includes("tms")
          ? { tms: "Scenarios, manual run history and environment profiles" }
          : {}),
        shared: "Project discovery, status and current time",
      },
      actions: [],
      hasMore: false,
      guidance:
        "Search for an operation or retrieve a known actionId. Manual runs record outcomes; clients execute tests.",
    });
  }
  const query = input.query;
  const ranked = [...catalog.values()]
    .map((tool) => ({
      action: describeAction(tool),
      rank: score(query, tool[0], tool[1]),
    }))
    .filter(
      ({ action, rank }) =>
        rank > 0 && (!input.area || action.areas.includes(input.area)),
    )
    .sort(
      (a, b) =>
        b.rank - a.rank || a.action.actionId.localeCompare(b.action.actionId),
    );
  const limit = input.limit ?? 3;
  return createSuccessResponse({
    mode: "search",
    actions: ranked.slice(0, limit).map(({ action }) => action),
    hasMore: ranked.length > limit,
    guidance: ranked.length
      ? "Use an actionId with execute-action; retrieve exact contracts by actionId."
      : "No matches. Rephrase your query or remove the area filter.",
  });
};
