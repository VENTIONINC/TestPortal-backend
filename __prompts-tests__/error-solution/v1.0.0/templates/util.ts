import type { ErrorSolutionInput } from "./types";

export function pick<T>(i: number, arr: T[]): T {
  if (arr.length === 0) {
    throw new Error("Cannot pick from empty array");
  }
  return arr[i % arr.length] as T;
}

export function makeCaseBase(
  _i: number,
  cfg: {
    name: string;
    errorMessage: string;
    errorStack: string;
    errorLocation: string;
    analysisCategory: string;
  },
): { name: string; input: ErrorSolutionInput } {
  const input: ErrorSolutionInput = {
    errorMessage: cfg.errorMessage,
    errorStack: cfg.errorStack,
    errorLocation: cfg.errorLocation,
    analysisCategory: cfg.analysisCategory,
  };

  return { name: cfg.name, input };
}
