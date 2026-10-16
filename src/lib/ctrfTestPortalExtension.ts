// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { normalizeResultErrorModalContext } from "@/lib/resultErrorModalContext";

export interface DecodedCtrfError {
  index: number;
  message?: string;
  stack?: string;
  location?: { file: string; line: number; column?: number };
  rawLogs?: string[];
  sourceSnippet?: { path: string; text: string; startLine: number; failingLine: number };
  generatedTestCase?: string;
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const decodeLocation = (value: unknown) => {
  const item = asRecord(value);
  return item && typeof item.file === "string" && Number.isInteger(item.line)
    ? { file: item.file, line: item.line as number, ...(Number.isInteger(item.column) ? { column: item.column as number } : {}) }
    : undefined;
};

export const decodeTestPortalExtension = (value: unknown): DecodedCtrfError[] => {
  const root = asRecord(value);
  const namespace = asRecord(root?.testPortal);
  if (namespace?.version !== 1 || !Array.isArray(namespace.errors)) return [];

  return namespace.errors
    .slice(0, 100)
    .map((candidate): DecodedCtrfError | null => {
      const item = asRecord(candidate);
      if (!item || !Number.isInteger(item.index) || (item.index as number) < 0) return null;
      const diagnostics = normalizeResultErrorModalContext({
        logs: item.rawLogs,
        sourceSnippet: item.sourceSnippet,
        generatedTestCase: item.generatedTestCase,
      });
      const location = decodeLocation(item.location);
      return {
        index: item.index as number,
        ...(typeof item.message === "string" ? { message: item.message.slice(0, 10_000) } : {}),
        ...(typeof item.stack === "string" ? { stack: item.stack.slice(0, 10_000) } : {}),
        ...(location ? { location } : {}),
        ...(diagnostics.rawLogs ? { rawLogs: diagnostics.rawLogs } : {}),
        ...(diagnostics.sourceSnippet ? { sourceSnippet: diagnostics.sourceSnippet } : {}),
        ...(diagnostics.generatedTestCase ? { generatedTestCase: diagnostics.generatedTestCase } : {}),
      };
    })
    .filter((item): item is DecodedCtrfError => item !== null)
    .sort((left, right) => left.index - right.index);
};
