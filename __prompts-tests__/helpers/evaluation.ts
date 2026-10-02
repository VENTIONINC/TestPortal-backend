// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";

import type { AIMessage, UsageMetadata } from "@langchain/core/messages";
import type { LLMResult } from "@langchain/core/outputs";

export interface EvaluationTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
}

export function sumTokenUsage(
  entries: Array<UsageMetadata | null | undefined>,
): EvaluationTokenUsage | null {
  if (entries.length === 0 || entries.some((entry) => !entry)) return null;
  return entries.reduce<EvaluationTokenUsage>(
    (total, entry) => ({
      inputTokens: total.inputTokens + (entry?.input_tokens ?? 0),
      outputTokens: total.outputTokens + (entry?.output_tokens ?? 0),
      totalTokens: total.totalTokens + (entry?.total_tokens ?? 0),
      cachedInputTokens:
        (total.cachedInputTokens ?? 0) +
        (entry?.input_token_details?.cache_read ?? 0),
      reasoningTokens:
        (total.reasoningTokens ?? 0) +
        (entry?.output_token_details?.reasoning ?? 0),
    }),
    {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
      reasoningTokens: 0,
    },
  );
}

export function createUsageCollector() {
  const usageEntries: Array<UsageMetadata | null> = [];
  const callbacks = [
    {
      handleLLMEnd(result: LLMResult) {
        for (const generations of result.generations) {
          const generation = generations[0];
          const message =
            generation && "message" in generation
              ? (generation.message as AIMessage)
              : undefined;
          usageEntries.push(message?.usage_metadata ?? null);
        }
      },
    },
  ];
  return { usageEntries, callbacks };
}

export function writePromptEvaluationReport(directory: string, report: object) {
  const createdAt = new Date().toISOString();
  const serialized = `${JSON.stringify({ schemaVersion: 1, createdAt, ...report }, null, 2)}\n`;
  fs.mkdirSync(directory, { recursive: true });
  const archivedPath = path.join(
    directory,
    `${createdAt.replace(/[:.]/g, "-")}.json`,
  );
  const latestPath = path.join(directory, "latest.json");
  fs.writeFileSync(archivedPath, serialized, "utf8");
  fs.writeFileSync(latestPath, serialized, "utf8");
  return { archivedPath, latestPath };
}
