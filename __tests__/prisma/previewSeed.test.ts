import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { generatePreviewSeedArtifact } from "../../prisma/seed/preview-seed/generator";
import {
  formatPreviewSeedSummary,
  writePreviewSeedArtifact,
} from "../../prisma/seed/preview-seed/io";
import { loadFixtureTemplates } from "../../prisma/seed/preview-seed/fixtureLoader";

describe("preview seed generator", () => {
  const fixturesDir = path.join(process.cwd(), "prisma", "seed", "example-reports");

  it("loads and flattens fixture templates from the example reports", () => {
    const loaded = loadFixtureTemplates(fixturesDir);

    expect(loaded.fixtureNames.length).toBeGreaterThan(0);
    expect(loaded.cases.length).toBeGreaterThan(100);
    expect(
      loaded.cases.some((testCase) => testCase.resultTemplates.some((result) => result.status === "failed")),
    ).toBe(true);
  });

  it("generates deterministic artifacts for the fixed profile", () => {
    const left = generatePreviewSeedArtifact();
    const right = generatePreviewSeedArtifact();

    expect(left).toEqual(right);
  });

  it("produces referentially valid generated rows", () => {
    const artifact = generatePreviewSeedArtifact();
    const executionIds = new Set(artifact.executions.map((execution) => execution.id));
    const specIds = new Set(artifact.specs.map((spec) => spec.id));
    const resultIds = new Set(artifact.results.map((result) => result.id));
    const errorIds = new Set(artifact.resultErrors.map((error) => error.id));
    const issueIds = new Set(artifact.issues.map((issue) => issue.id));

    for (const execution of artifact.executions) {
      expect(execution.projectId).toBe(artifact.project.id);
    }

    for (const spec of artifact.specs) {
      expect(spec.projectId).toBe(artifact.project.id);
    }

    for (const result of artifact.results) {
      expect(executionIds.has(result.executionId)).toBe(true);
      expect(specIds.has(result.specId)).toBe(true);
    }

    for (const error of artifact.resultErrors) {
      expect(error.resultId ? resultIds.has(error.resultId) : false).toBe(true);
    }

    for (const issue of artifact.issues) {
      expect(issue.projectId).toBe(artifact.project.id);
    }

    for (const assumption of artifact.assumptions) {
      expect(issueIds.has(assumption.issueId)).toBe(true);
      expect(assumption.resultErrorId ? errorIds.has(assumption.resultErrorId) : false).toBe(true);
    }

    for (const metric of artifact.dailyMetrics) {
      expect(metric.projectId).toBe(artifact.project.id);
    }
  });

  it("keeps the dataset in expected medium-profile ranges", () => {
    const artifact = generatePreviewSeedArtifact();
    const failedResults = artifact.results.filter((result) => result.status === "failed");
    const passedResults = artifact.results.filter((result) => result.status === "passed");
    const skippedResults = artifact.results.filter((result) => result.status === "skipped");

    expect(artifact.meta.rowCounts.executions).toBe(48);
    expect(artifact.meta.rowCounts.specs).toBeGreaterThan(100);
    expect(artifact.meta.rowCounts.results).toBeGreaterThan(2500);
    expect(artifact.meta.rowCounts.results).toBeLessThan(5000);
    expect(passedResults.length).toBeGreaterThan(failedResults.length);
    expect(failedResults.length).toBeGreaterThan(0);
    expect(skippedResults.length).toBeGreaterThan(0);
    expect(artifact.meta.rowCounts.issues).toBeGreaterThan(0);
    expect(artifact.meta.rowCounts.dailyMetrics).toBeGreaterThan(10);
  });

  it("writes one JSON artifact and produces a summary", () => {
    const artifact = generatePreviewSeedArtifact();
    const outputPath = path.join(
      os.tmpdir(),
      `preview-seed-test-${Date.now()}-${process.pid}.json`,
    );

    const writtenPath = writePreviewSeedArtifact(artifact, outputPath);
    const parsed = JSON.parse(fs.readFileSync(writtenPath, "utf8")) as typeof artifact;
    const summary = formatPreviewSeedSummary(artifact, writtenPath);

    expect(fs.existsSync(writtenPath)).toBe(true);
    expect(parsed.meta.rowCounts).toEqual(artifact.meta.rowCounts);
    expect(summary).toContain("Preview seed generated:");

    fs.unlinkSync(writtenPath);
  });
});
