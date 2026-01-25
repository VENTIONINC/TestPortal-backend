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
    analysisConfidence: number | string;
    analysisConclusion: string;
    errorQuality: number | string;
    errorQualityConclusion: string;
  },
): { name: string; input: ErrorSolutionInput } {
  const input: ErrorSolutionInput = {
    errorMessage: cfg.errorMessage,
    errorStack: cfg.errorStack,
    errorLocation: cfg.errorLocation,
    analysisCategory: cfg.analysisCategory,
    analysisConfidence: cfg.analysisConfidence,
    analysisConclusion: cfg.analysisConclusion,
    errorQuality: cfg.errorQuality,
    errorQualityConclusion: cfg.errorQualityConclusion,
  };

  return { name: cfg.name, input };
}
