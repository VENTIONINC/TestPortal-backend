import levenshtein from "fast-levenshtein";
import stringSimilarity from "string-similarity";
import { dbClient } from "@/prisma/client";
import type {
  PrismaResultError,
  PrismaAssumption,
  ResultErrorWithRelations,
} from "@/types/database";

interface TargetResultError extends PrismaResultError {
  message: string;
  callLog: string;
  callStack: string;
  id: number;
  type: string;
}

export async function runReview(
  targetResultError: TargetResultError,
): Promise<ResultErrorWithRelations | null> {
  const start = new Date();

  const resultErrors: ResultErrorWithRelations[] =
    await dbClient.resultError.findMany({
      where: {
        type: targetResultError.type,
        assumptions: {
          some: {},
        },
      },
      include: {
        assumptions: {
          include: {
            issue: true,
          },
        },
        result: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

  const targetCallLog = JSON.parse(
    targetResultError.callLog ?? "[]",
  ) as string[];
  const targetCallStack = JSON.parse(
    targetResultError.callStack ?? "[]",
  ) as string[];

  for (const resultError of resultErrors) {
    const messageLengthDiff = Math.abs(
      targetResultError.message.length - resultError.message.length,
    );
    if (messageLengthDiff > targetResultError.message.length * 0.5) {
      continue;
    }

    const errorSimilarity = calculateErrorSimilarity(
      targetResultError.message,
      resultError.message,
    );

    const callLog = JSON.parse(resultError.callLog ?? "[]") as string[];
    const callStack = JSON.parse(resultError.callStack ?? "[]") as string[];

    const callLogSimilarity = compareStackTraces(targetCallLog, callLog);
    const stackSimilarity = compareStackTraces(targetCallStack, callStack);

    // const ERROR_THRESHOLD = 0.85;
    // const CALL_LOG_THRESHOLD = 0.7;
    // const STACK_THRESHOLD = 0.7;
    const FINAL_SCORE_THRESHOLD = 0.7;

    const finalScore =
      errorSimilarity * 0.4 + callLogSimilarity * 0.3 + stackSimilarity * 0.3;

    if (finalScore >= FINAL_SCORE_THRESHOLD) {
      let assumptionRecord = await dbClient.assumption.findFirst({
        where: {
          resultErrorId: targetResultError.id,
        },
      });

      if (!assumptionRecord) {
        let bestAssumption = resultError.assumptions.find(
          (a: PrismaAssumption) => a.isConfirmed,
        );

        if (!bestAssumption) {
          const sorted = resultError.assumptions.sort(
            (a: PrismaAssumption, b: PrismaAssumption) => a.score - b.score,
          );
          bestAssumption = sorted[0];
        }

        if (bestAssumption) {
          assumptionRecord = await dbClient.assumption.create({
            data: {
              isConfirmed: false,
              score: finalScore,
              madeBy: "bot",
              issue: { connect: { id: bestAssumption.issueId } },
              resultError: { connect: { id: targetResultError.id } },
            },
          });
        }
      }

      if (assumptionRecord) {
        await dbClient.resultError.update({
          where: { id: targetResultError.id },
          data: {
            assumptions: {
              connect: { id: assumptionRecord.id },
            },
          },
        });

        console.log(
          `✅ Assumption ${assumptionRecord.id} automatically linked to result ${
            targetResultError.id
          }, time: ${new Date().getTime() - start.getTime()}`,
        );

        break;
      }
    }
  }

  return dbClient.resultError.findUnique({
    where: {
      id: targetResultError.id,
    },
    include: {
      result: true,
      assumptions: {
        include: {
          issue: true,
        },
      },
    },
  });
}

/**
 * Calculates similarity between two error messages.
 * Uses both Levenshtein distance and Jaro-Winkler similarity.
 */
export function calculateErrorSimilarity(
  message1: string,
  message2: string,
): number {
  if (!message1 || !message2) return 0;

  const normalizedMessage1 = normalizeMessage(message1);
  const normalizedMessage2 = normalizeMessage(message2);

  // 1. Levenshtein Distance Similarity
  const levDistance = levenshtein.get(normalizedMessage1, normalizedMessage2);
  const maxLength = Math.max(
    normalizedMessage1.length,
    normalizedMessage2.length,
  );
  const levenshteinSimilarity = 1 - levDistance / maxLength;

  // 2. Jaro-Winkler Similarity (from string-similarity)
  const jaroWinklerSimilarity = stringSimilarity.compareTwoStrings(
    normalizedMessage1,
    normalizedMessage2,
  );

  return levenshteinSimilarity * 0.4 + jaroWinklerSimilarity * 0.6;
}

/**
 * Compare two stack traces and calculate similarity (0 to 1)
 */
export function compareStackTraces(stack1: string[], stack2: string[]): number {
  if (!stack1.length || !stack2.length) return 0;

  const normalizedStack1 = stack1.map(normalizeFrame);
  const normalizedStack2 = stack2.map(normalizeFrame);
  const topFrames1 = normalizedStack1.slice(0, 3);
  const topFrames2 = normalizedStack2.slice(0, 3);

  // Jaccard Similarity (Intersection over Union)
  const intersection = topFrames1.filter((frame) => topFrames2.includes(frame));
  const union = new Set([...topFrames1, ...topFrames2]);

  const jaccardSimilarity = intersection.length / union.size;

  const combined1 = normalizedStack1.join("\n");
  const combined2 = normalizedStack2.join("\n");
  const sequenceSimilarity = stringSimilarity.compareTwoStrings(
    combined1,
    combined2,
  );

  return jaccardSimilarity * 0.6 + sequenceSimilarity * 0.4;
}

/**
 * Normalizes an error message:
 * - Removes dynamic content (numbers, timestamps, etc.)
 * - Converts to lowercase
 */
function normalizeMessage(message: string): string {
  return message.toLowerCase().replace(/\d+/g, "").trim();
}

/**
 * Normalize stack frames by removing dynamic line/column numbers
 * Example: 'at /path/to/file.ts:385:34' → 'at /path/to/file.ts'
 */
function normalizeFrame(frame: string): string {
  return frame.replace(/:\d+:\d+$/, "").trim();
}
