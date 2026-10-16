// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { normalizeResultErrorModalContext } from "@/lib/resultErrorModalContext";

export interface NormalizedErrorDiagnostic {
  message: string;
  stack?: string;
  location?: { file: string; line: number; column?: number };
  rawLogs?: string[];
  sourceSnippet?: {
    path: string;
    text: string;
    startLine: number;
    failingLine: number;
  };
  generatedTestCase?: string;
}

export interface NormalizedTestAttempt {
  retry: number;
  status: string;
  duration: number;
  startTime: string | Date;
  workerIndex: number;
  errors: NormalizedErrorDiagnostic[];
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeLocation = (value: unknown) => {
  const location = asRecord(value);
  if (
    !location ||
    typeof location.file !== "string" ||
    !Number.isInteger(location.line)
  ) {
    return undefined;
  }
  return {
    file: location.file,
    line: location.line as number,
    ...(Number.isInteger(location.column)
      ? { column: location.column as number }
      : {}),
  };
};

const normalizeError = (value: unknown): NormalizedErrorDiagnostic | null => {
  const error = asRecord(value);
  if (!error || typeof error.message !== "string") return null;
  const location = normalizeLocation(error.location);
  return {
    message: error.message,
    ...(typeof error.stack === "string" ? { stack: error.stack } : {}),
    ...(location ? { location } : {}),
  };
};

const errorHeadline = (message: string): string =>
  message
    .split(/\r?\n/u)
    .find((line) => line.trim().length > 0)
    ?.trim() ?? "";

const errorIdentity = (error: NormalizedErrorDiagnostic): string => {
  if (error.location) {
    return [
      "located",
      error.location.file,
      error.location.line,
      error.location.column ?? "",
      errorHeadline(error.message),
    ].join("\u0000");
  }

  return ["unlocated", error.message, error.stack ?? ""].join("\u0000");
};

const nativeLogs = (attempt: Record<string, unknown>): string[] =>
  [attempt.stdout, attempt.stderr]
    .flatMap((value) => (Array.isArray(value) ? value : []))
    .map((entry) => {
      if (typeof entry === "string") return entry;
      const record = asRecord(entry);
      return typeof record?.text === "string" ? record.text : null;
    })
    .filter((entry): entry is string => entry !== null);

export const normalizePlaywrightAttempt = (
  value: unknown,
  specLocation: { file: string; line: number },
): NormalizedTestAttempt => {
  const attempt = asRecord(value) ?? {};
  const primarySource = normalizeError(attempt.error);
  const ordered = [
    ...(primarySource ? [primarySource] : []),
    ...(Array.isArray(attempt.errors)
      ? attempt.errors
          .map(normalizeError)
          .filter((error): error is NormalizedErrorDiagnostic => error !== null)
      : []),
  ].filter(
    (error, index, errors) =>
      errors.findIndex((candidate) => errorIdentity(candidate) === errorIdentity(error)) ===
      index,
  );

  const rawError = asRecord(attempt.error);
  const errorLocation = normalizeLocation(rawError?.location);
  const derivedSnippet =
    typeof rawError?.snippet === "string" && errorLocation
      ? {
          path: errorLocation.file,
          text: rawError.snippet,
          startLine: Math.min(specLocation.line, errorLocation.line),
          failingLine: errorLocation.line,
        }
      : undefined;
  const diagnostics = normalizeResultErrorModalContext({
    logs: attempt.logs ?? nativeLogs(attempt),
    sourceSnippet: attempt.sourceSnippet ?? derivedSnippet,
    generatedTestCase: attempt.generatedTestCase,
  });

  if (ordered[0]) {
    ordered[0] = {
      ...ordered[0],
      ...(diagnostics.rawLogs ? { rawLogs: diagnostics.rawLogs } : {}),
      ...(diagnostics.sourceSnippet
        ? { sourceSnippet: diagnostics.sourceSnippet }
        : {}),
      ...(diagnostics.generatedTestCase
        ? { generatedTestCase: diagnostics.generatedTestCase }
        : {}),
    };
  }

  return {
    retry: typeof attempt.retry === "number" ? attempt.retry : 0,
    status: typeof attempt.status === "string" ? attempt.status : "failed",
    duration: typeof attempt.duration === "number" ? attempt.duration : 0,
    startTime:
      typeof attempt.startTime === "string" || attempt.startTime instanceof Date
        ? attempt.startTime
        : new Date(0).toISOString(),
    workerIndex: typeof attempt.workerIndex === "number" ? attempt.workerIndex : 0,
    errors: ordered,
  };
};
