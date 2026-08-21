// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export const ISSUE_SIMILARITY_WEIGHTS = {
  message: 0.5,
  stackShape: 0.3,
  specPath: 0.2,
} as const;

export const ISSUE_SIMILARITY_THRESHOLD = 0.65;
export const ISSUE_SIMILARITY_MIN_SIGNALS = 2;
const STACK_SHAPE_TOP_FRAMES = 5;

export interface IssueSimilarityEvidence {
  message?: string | null;
  callStack?: string[] | null;
  specPath?: string | null;
}

export interface IssueSimilarityScore {
  score: number;
  signals: {
    message: number | null;
    stackShape: number | null;
    specPath: number | null;
  };
}

export interface IssueSimilarityCandidate<TIssue = { id: string; name: string }> {
  issueId: string;
  issue: TIssue;
  evidence: IssueSimilarityEvidence[];
}

export interface IssueSimilaritySuggestion<TIssue = { id: string; name: string }>
  extends Omit<IssueSimilarityScore, "score"> {
  issueId: string;
  issue: TIssue;
  /** Rounded 0-100 match percentage for display. */
  score: number;
}

const normalizeWords = (value: string): string[] =>
  value
    .toLocaleLowerCase("en")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);

const diceSimilarity = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) return 0;
  const remaining = new Map<string, number>();
  for (const token of right) {
    remaining.set(token, (remaining.get(token) ?? 0) + 1);
  }
  let intersection = 0;
  for (const token of left) {
    const count = remaining.get(token) ?? 0;
    if (count > 0) {
      intersection += 1;
      remaining.set(token, count - 1);
    }
  }
  return (2 * intersection) / (left.length + right.length);
};

const normalizeFrame = (value: string): string =>
  value
    .toLocaleLowerCase("en")
    .replace(/\\/gu, "/")
    .replace(/:\d+(?::\d+)?(?=\)?$)/gu, "")
    .replace(/\s+/gu, " ")
    .trim();

const normalizePath = (value: string): string =>
  value
    .toLocaleLowerCase("en")
    .replace(/\\/gu, "/")
    .replace(/^(?:\.\/|\/)+/u, "")
    .replace(/\/+$/u, "");

const normalizeStackFrames = (stack: string[]): string[] =>
  stack.map(normalizeFrame).filter((frame) => frame.length > 0);

const compareStackShape = (left: string[], right: string[]): number => {
  const topLeft = left.slice(0, STACK_SHAPE_TOP_FRAMES);
  const topRight = right.slice(0, STACK_SHAPE_TOP_FRAMES);
  const compareLength = Math.max(topLeft.length, topRight.length);
  if (compareLength === 0) return 0;

  let matches = 0;
  for (let index = 0; index < compareLength; index += 1) {
    if (topLeft[index] === topRight[index]) {
      matches += 1;
    }
  }
  return matches / compareLength;
};

const comparableString = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const scoreIssueSimilarity = (
  target: IssueSimilarityEvidence,
  candidate: IssueSimilarityEvidence,
): IssueSimilarityScore | null => {
  const message =
    comparableString(target.message) && comparableString(candidate.message)
      ? diceSimilarity(
          normalizeWords(target.message),
          normalizeWords(candidate.message),
        )
      : null;
  const targetStack = target.callStack
    ? normalizeStackFrames(target.callStack)
    : [];
  const candidateStack = candidate.callStack
    ? normalizeStackFrames(candidate.callStack)
    : [];
  const stackShape =
    targetStack.length > 0 && candidateStack.length > 0
      ? compareStackShape(targetStack, candidateStack)
      : null;
  const specPath =
    comparableString(target.specPath) && comparableString(candidate.specPath)
      ? Number(normalizePath(target.specPath) === normalizePath(candidate.specPath))
      : null;

  const allSignals: Array<{ value: number | null; weight: number }> = [
    { value: message, weight: ISSUE_SIMILARITY_WEIGHTS.message },
    { value: stackShape, weight: ISSUE_SIMILARITY_WEIGHTS.stackShape },
    { value: specPath, weight: ISSUE_SIMILARITY_WEIGHTS.specPath },
  ];
  const weightedSignals = allSignals.filter(
    (signal): signal is { value: number; weight: number } =>
      signal.value !== null,
  );
  if (weightedSignals.length < ISSUE_SIMILARITY_MIN_SIGNALS) return null;

  const availableWeight = weightedSignals.reduce(
    (sum, signal) => sum + signal.weight,
    0,
  );
  const score =
    weightedSignals.reduce(
      (sum, signal) => sum + signal.value * signal.weight,
      0,
    ) / availableWeight;

  return { score, signals: { message, stackShape, specPath } };
};

export const selectBestIssueSuggestion = <TIssue>(
  target: IssueSimilarityEvidence,
  candidates: IssueSimilarityCandidate<TIssue>[],
  threshold = ISSUE_SIMILARITY_THRESHOLD,
): IssueSimilaritySuggestion<TIssue> | null => {
  const suggestions = candidates.flatMap((candidate) => {
    const scores = candidate.evidence
      .map((evidence) => scoreIssueSimilarity(target, evidence))
      .filter((score): score is IssueSimilarityScore => score !== null)
      .sort((left, right) => right.score - left.score);
    const best = scores[0];
    if (!best || best.score < threshold) return [];
    return [{ ...best, issueId: candidate.issueId, issue: candidate.issue }];
  });

  suggestions.sort(
    (left, right) =>
      right.score - left.score || left.issueId.localeCompare(right.issueId),
  );
  const best = suggestions[0];
  return best ? { ...best, score: Math.round(best.score * 100) } : null;
};
