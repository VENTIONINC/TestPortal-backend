import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PreviewSeedArtifact } from "./types";
import { FIXED_PROFILE } from "./utils";

export function getPreviewSeedOutputPath(): string {
  return path.join(os.tmpdir(), FIXED_PROFILE.outputFileName);
}

export function writePreviewSeedArtifact(
  artifact: PreviewSeedArtifact,
  outputPath = getPreviewSeedOutputPath(),
): string {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  return outputPath;
}

export function formatPreviewSeedSummary(
  artifact: PreviewSeedArtifact,
  outputPath: string,
): string {
  const { rowCounts } = artifact.meta;
  return [
    `Preview seed generated: ${outputPath}`,
    `Profile: ${artifact.meta.profile}`,
    `Project: ${artifact.project.name} (${artifact.project.id})`,
    `Executions: ${rowCounts.executions}`,
    `Specs: ${rowCounts.specs}`,
    `Results: ${rowCounts.results}`,
    `ResultErrors: ${rowCounts.resultErrors}`,
    `Issues: ${rowCounts.issues}`,
    `Assumptions: ${rowCounts.assumptions}`,
    `DailyMetrics: ${rowCounts.dailyMetrics}`,
  ].join("\n");
}
