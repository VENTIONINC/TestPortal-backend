// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { ResultErrorSourceSnippet } from "@/types";

export const RESULT_ERROR_MODAL_CONTEXT_LIMITS = {
  rawLogsBytes: 256 * 1024,
  sourceSnippetBytes: 128 * 1024,
  generatedTestCaseBytes: 128 * 1024,
  pathBytes: 2 * 1024,
} as const;

const withinUtf8Limit = (value: string, limit: number): boolean =>
  Buffer.byteLength(value, "utf8") <= limit;

const ANSI_ESCAPE_CHARACTER = String.fromCharCode(0x1b);
const ANSI_BELL_CHARACTER = String.fromCharCode(0x07);
const ANSI_STRING_TERMINATOR = String.fromCharCode(0x9c);
const ANSI_OSC_SEQUENCE = new RegExp(
  `${ANSI_ESCAPE_CHARACTER}\\][^${ANSI_BELL_CHARACTER}${ANSI_ESCAPE_CHARACTER}]*?(?:${ANSI_BELL_CHARACTER}|${ANSI_ESCAPE_CHARACTER}\\\\|${ANSI_STRING_TERMINATOR})`,
  "gu",
);
const ANSI_ESCAPE_SEQUENCE = new RegExp(
  `[${ANSI_ESCAPE_CHARACTER}\\u009B][[\\]()#;?]*(?:(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-ORZcf-nqry=><~]))`,
  "gu",
);

const stripAnsiEscapeSequences = (text: string): string =>
  text
    .replace(ANSI_OSC_SEQUENCE, "")
    .replace(ANSI_ESCAPE_SEQUENCE, "");

const countRepresentedLines = (text: string): number => {
  if (text.length === 0) {
    return 1;
  }

  const lines = text.split(/\r?\n/u);
  const trailingEmptyLine =
    lines.length > 1 && lines[lines.length - 1] === "";

  return Math.max(1, lines.length - (trailingEmptyLine ? 1 : 0));
};

export const normalizeResultErrorLogs = (value: unknown): string[] | null => {
  const logs =
    typeof value === "string"
      ? [value]
      : Array.isArray(value) && value.every((item) => typeof item === "string")
        ? value
        : null;

  if (!logs || logs.length === 0 || logs.every((item) => item.length === 0)) {
    return null;
  }

  return withinUtf8Limit(
    logs.join("\n"),
    RESULT_ERROR_MODAL_CONTEXT_LIMITS.rawLogsBytes,
  )
    ? [...logs]
    : null;
};

export const normalizeResultErrorSourceSnippet = (
  value: unknown,
): ResultErrorSourceSnippet | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const { path, text, startLine, failingLine } = candidate;
  if (
    typeof path !== "string" ||
    typeof text !== "string"
  ) {
    return null;
  }

  const normalizedText = stripAnsiEscapeSequences(text);
  if (
    !Number.isInteger(startLine) ||
    !Number.isInteger(failingLine) ||
    (startLine as number) < 1 ||
    (failingLine as number) < (startLine as number) ||
    !withinUtf8Limit(path, RESULT_ERROR_MODAL_CONTEXT_LIMITS.pathBytes) ||
    !withinUtf8Limit(
      normalizedText,
      RESULT_ERROR_MODAL_CONTEXT_LIMITS.sourceSnippetBytes,
    )
  ) {
    return null;
  }

  const representedLineCount = countRepresentedLines(normalizedText);
  if ((failingLine as number) >= (startLine as number) + representedLineCount) {
    return null;
  }

  return {
    path,
    text: normalizedText,
    startLine: startLine as number,
    failingLine: failingLine as number,
  };
};

export const normalizeGeneratedTestCase = (value: unknown): string | null =>
  typeof value === "string" &&
  value.length > 0 &&
  withinUtf8Limit(
    value,
    RESULT_ERROR_MODAL_CONTEXT_LIMITS.generatedTestCaseBytes,
  )
    ? value
    : null;

export const normalizeResultErrorModalContext = (input: {
  logs?: unknown;
  sourceSnippet?: unknown;
  generatedTestCase?: unknown;
}) => ({
  rawLogs: normalizeResultErrorLogs(input.logs),
  sourceSnippet: normalizeResultErrorSourceSnippet(input.sourceSnippet),
  generatedTestCase: normalizeGeneratedTestCase(input.generatedTestCase),
});
