// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  writeEvaluationReport,
  type EvaluationReportInput,
} from "../../__prompts-tests__/stored-results-analysis/runners/evaluation-report";

describe("writeEvaluationReport", () => {
  let outputDirectory: string;

  beforeEach(async () => {
    outputDirectory = await mkdtemp(
      path.join(os.tmpdir(), "stored-results-report-"),
    );
  });

  afterEach(async () => {
    await rm(outputDirectory, { recursive: true, force: true });
  });

  const input: EvaluationReportInput = {
    provider: "typesafe",
    model: "jev-1.13.0",
    suite: "smoke",
    durationMs: 1250,
    requestCount: 2,
    usage: { inputTokens: 40, outputTokens: 12, totalTokens: 52 },
    cases: [
      {
        id: "case-1",
        name: "network timeout",
        expectedCategory: "infra",
        actualCategory: "infra",
        correct: true,
        confidence: 0.91,
        probabilities: {
          infra: 0.91,
          performance: 0.03,
          script: 0.02,
          bug: 0.02,
          other: 0.02,
        },
        inputTokens: 20,
        outputTokens: 6,
      },
      {
        id: "case-2",
        name: "assertion failure",
        expectedCategory: "bug",
        actualCategory: "other",
        correct: false,
        confidence: 0.6,
        probabilities: {
          infra: 0.05,
          performance: 0.1,
          script: 0.1,
          bug: 0.15,
          other: 0.6,
        },
        inputTokens: 20,
        outputTokens: 6,
      },
    ],
  };

  test("writes timestamped and latest reports with aggregate metrics", async () => {
    const paths = await writeEvaluationReport(input, {
      outputDirectory,
      now: new Date("2026-10-14T12:30:00.000Z"),
    });

    const timestamped = JSON.parse(
      await readFile(paths.timestampedReportPath, "utf8"),
    );
    const latest = JSON.parse(await readFile(paths.latestReportPath, "utf8"));

    expect(paths.timestampedReportPath).toContain("2026-10-14T12-30-00-000Z");
    expect(timestamped).toMatchObject({
      provider: "typesafe",
      model: "jev-1.13.0",
      suite: "smoke",
      totalCases: 2,
      correctCases: 1,
      accuracy: 0.5,
      durationMs: 1250,
      requestCount: 2,
      usage: { inputTokens: 40, outputTokens: 12, totalTokens: 52 },
      cases: input.cases,
    });
    expect(latest).toEqual(timestamped);
  });

  test("updates latest.json while keeping prior timestamped reports", async () => {
    const first = await writeEvaluationReport(input, {
      outputDirectory,
      now: new Date("2026-10-14T12:30:00.000Z"),
    });
    const firstLatestContents = await readFile(first.latestReportPath, "utf8");
    const firstTimestampedContents = await readFile(
      first.timestampedReportPath,
      "utf8",
    );
    const secondInput = { ...input, suite: "regression" };
    const second = await writeEvaluationReport(secondInput, {
      outputDirectory,
      now: new Date("2026-10-14T12:31:00.000Z"),
    });

    expect(second.timestampedReportPath).not.toBe(first.timestampedReportPath);
    expect(firstLatestContents).toBe(firstTimestampedContents);
    await expect(
      readFile(first.timestampedReportPath, "utf8"),
    ).resolves.toBe(firstTimestampedContents);
    expect(second.latestReportPath).toBe(first.latestReportPath);
    await expect(
      readFile(second.latestReportPath, "utf8").then((contents) =>
        JSON.parse(contents),
      ),
    ).resolves.toMatchObject({ suite: "regression" });
  });
});
