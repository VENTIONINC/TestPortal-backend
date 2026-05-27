// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import type { StatusForAnalysis, TestInput } from "./types";

/**
 * Deterministic array selection based on index
 * @param i - Index for selection
 * @param arr - Array to select from
 * @returns Selected element using modulo for deterministic rotation
 */
export function pick<T>(i: number, arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("Cannot pick from empty array");
  }
  return arr[i % arr.length] as T;
}

/**
 * Generate stable UUID for test cases
 * Not a real UUID, but provides stable, unique identifiers for testing
 * @param i - Base number for UUID generation
 * @returns UUID-formatted string
 */
export function makeUuid(i: number): string {
  return `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
}

/**
 * Create base test case structure with common configuration
 * @param _i - Index (reserved for future use)
 * @param cfg - Configuration object with test details
 * @returns Object with name and input structure
 */
export function makeCaseBase(
  _i: number,
  cfg: {
    name: string;
    status: StatusForAnalysis;
    specKey: string;
    specTitle: string;
    duration: number;
    retry: number;
    executionName: string;
    errorMessage?: string;
    errorStack?: string | null;
    errorLocation?: string | null;
  },
): { name: string; input: TestInput } {
  const input: TestInput = {
    id: "placeholder", // Will be overwritten by template factory
    specKey: cfg.specKey,
    specTitle: cfg.specTitle,
    status: cfg.status,
    duration: cfg.duration,
    retry: cfg.retry,
    executionName: cfg.executionName,
    ...(cfg.errorMessage ? { errorMessage: cfg.errorMessage } : {}),
    ...(cfg.errorStack !== undefined ? { errorStack: cfg.errorStack } : {}),
    ...(cfg.errorLocation !== undefined
      ? { errorLocation: cfg.errorLocation }
      : {}),
  };

  return { name: cfg.name, input };
}
