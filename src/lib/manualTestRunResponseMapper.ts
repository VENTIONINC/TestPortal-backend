// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type {
  ManualRunEnvironmentProperty,
  ManualTestRunRequirementContext,
} from "@/types/manualTestRuns";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mapEnvironmentProperties(
  value: unknown,
): ManualRunEnvironmentProperty[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    isRecord(entry) &&
    typeof entry.name === "string" &&
    typeof entry.value === "string"
      ? [{ name: entry.name, value: entry.value }]
      : [],
  );
}

export function mapRequirementContext(
  value: unknown,
): ManualTestRunRequirementContext[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) =>
    isRecord(entry) &&
    (entry.type === "requirement" || entry.type === "ticket") &&
    typeof entry.reference === "string" &&
    typeof entry.title === "string"
      ? [
          {
            type: entry.type,
            reference: entry.reference,
            title: entry.title,
            url: typeof entry.url === "string" ? entry.url : null,
          },
        ]
      : [],
  );
}

export function mapScenarioEvidence<
  T extends {
    priority?: "low" | "medium" | "high" | null;
    requirementContext?: unknown;
    executionComment?: string | null;
    defectReference?: string | null;
  },
>(scenario: T) {
  return {
    priority: scenario.priority ?? "medium",
    requirementContext: mapRequirementContext(scenario.requirementContext),
    executionComment: scenario.executionComment ?? null,
    defectReference: scenario.defectReference ?? null,
  };
}

export function mapStepEvidence<
  T extends {
    comment?: string | null;
    failedFlag?: boolean | null;
    failedComment?: string | null;
    blockedFlag?: boolean | null;
    blockedComment?: string | null;
  },
>(step: T) {
  return {
    comment: step.comment ?? null,
    failedFlag: step.failedFlag ?? false,
    failedComment: step.failedComment ?? null,
    blockedFlag: step.blockedFlag ?? false,
    blockedComment: step.blockedComment ?? null,
  };
}

export function mapHasBeenReopened(intervals: unknown): boolean {
  return Array.isArray(intervals) && intervals.length > 1;
}
