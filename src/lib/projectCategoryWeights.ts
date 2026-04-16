export const PROJECT_CATEGORY_KEYS = [
  "bug",
  "infra",
  "performance",
  "script",
  "other",
] as const;

export type ProjectCategoryKey = (typeof PROJECT_CATEGORY_KEYS)[number];

export interface ProjectCategoryWeights {
  bug: number;
  infra: number;
  performance: number;
  script: number;
  other: number;
}

export const DEFAULT_PROJECT_CATEGORY_WEIGHTS: ProjectCategoryWeights = {
  bug: 100,
  infra: 100,
  performance: 100,
  script: 100,
  other: 100,
};

const MIN_WEIGHT = 0;
const MAX_WEIGHT = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeProjectCategoryWeights(
  value: unknown,
): ProjectCategoryWeights {
  if (!isRecord(value)) {
    return { ...DEFAULT_PROJECT_CATEGORY_WEIGHTS };
  }

  const normalized = { ...DEFAULT_PROJECT_CATEGORY_WEIGHTS };

  for (const key of PROJECT_CATEGORY_KEYS) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      normalized[key] = candidate;
    }
  }

  return normalized;
}

export function parseProjectCategoryWeights(
  value: unknown,
): ProjectCategoryWeights {
  if (!isRecord(value)) {
    throw new Error("categoryWeights must be an object");
  }

  const keys = Object.keys(value);
  const expectedKeys = new Set<string>(PROJECT_CATEGORY_KEYS);

  for (const key of keys) {
    if (!expectedKeys.has(key)) {
      throw new Error(`categoryWeights contains unsupported category '${key}'`);
    }
  }

  for (const key of PROJECT_CATEGORY_KEYS) {
    if (!(key in value)) {
      throw new Error(`categoryWeights must include '${key}'`);
    }
  }

  const parsed = {} as ProjectCategoryWeights;

  for (const key of PROJECT_CATEGORY_KEYS) {
    const candidate = value[key];

    if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
      throw new Error(`categoryWeights.${key} must be a number`);
    }

    if (candidate < MIN_WEIGHT || candidate > MAX_WEIGHT) {
      throw new Error(
        `categoryWeights.${key} must be between ${MIN_WEIGHT} and ${MAX_WEIGHT}`,
      );
    }

    parsed[key] = candidate;
  }

  return parsed;
}
