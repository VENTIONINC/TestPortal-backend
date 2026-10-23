// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Prisma } from "@prisma/client";
import type {
  PrismaResultError,
  PrismaSpec,
  ResultWithRelations,
  StructuredResultError,
  StructuredResultWithRelations,
  StructuredSpec,
} from "@/types";
import {
  normalizeResultErrorLogs,
  normalizeResultErrorSourceSnippet,
} from "@/lib/resultErrorModalContext";

type JsonArrayValue = Prisma.JsonArray | readonly Prisma.JsonValue[];

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((item): item is string => typeof item === "string");

const toStringArray = (value: JsonArrayValue): string[] => {
  const items: string[] = [];

  for (const item of value) {
    if (typeof item === "string") {
      items.push(item);
    }
  }

  return items;
};

export const normalizeJsonStringArray = (
  value: unknown,
): string[] => {
  if (value == null) {
    return [];
  }

  if (isStringArray(value)) {
    return [...value];
  }

  if (Array.isArray(value)) {
    return toStringArray(value);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? toStringArray(parsed) : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const normalizeJsonUnknownArray = (
  value: unknown,
): unknown[] => {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return [...value];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
};

export const normalizeJsonArrayForText = (
  value: unknown,
): string => JSON.stringify(normalizeJsonStringArray(value), null, 2);

export const normalizeSpecPayload = (spec: PrismaSpec): StructuredSpec => ({
  ...spec,
  tags: normalizeJsonStringArray(spec.tags),
  annotations: normalizeJsonUnknownArray(spec.annotations),
});

export const normalizeResultErrorPayload = (
  error: PrismaResultError,
): StructuredResultError => projectPublicPayload({
  ...error,
  callLog: normalizeJsonStringArray(error.callLog),
  callStack: normalizeJsonStringArray(error.callStack),
  rawLogs: normalizeResultErrorLogs(error.rawLogs) ?? [],
  sourceSnippet: normalizeResultErrorSourceSnippet(error.sourceSnippet),
});

export const normalizeResultPayload = (
  result: ResultWithRelations,
): StructuredResultWithRelations => projectPublicPayload({
  ...projectPublicResult(result),
  spec: normalizeSpecPayload(result.spec),
  errors: result.errors.map(normalizeResultErrorPayload),
});

/** Explicitly strip internal analysis lifecycle fields before public serialization. */
export function projectPublicResult<T extends object>(result: T): Omit<T, "analysisMetadata" | "analysisLastError"> {
  const { analysisMetadata: _metadata, analysisLastError: _lastError, ...publicResult } = result as T & {
    analysisMetadata?: unknown;
    analysisLastError?: unknown;
  };
  return publicResult;
}

/** Remove internal lifecycle fields recursively from nested public payloads. */
export function projectPublicPayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => projectPublicPayload(item)) as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return value;
    const projected: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      if (key !== "analysisMetadata" && key !== "analysisLastError") {
        projected[key] = projectPublicPayload(item);
      }
    }
    return projected as T;
  }
  return value;
}
