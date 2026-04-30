import { pathToFileURL } from "node:url";
import { formatPreviewSeedSummary, writePreviewSeedArtifact } from "./preview-seed/io";
import { generatePreviewSeedArtifact } from "./preview-seed/generator";

export function runPreviewSeed(): { outputPath: string } {
  const artifact = generatePreviewSeedArtifact();
  const outputPath = writePreviewSeedArtifact(artifact);
  console.log(formatPreviewSeedSummary(artifact, outputPath));
  return { outputPath };
}

function isDirectExecution(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectExecution()) {
  runPreviewSeed();
}
