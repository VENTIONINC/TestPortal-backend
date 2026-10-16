// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";

export const TEST_SCENARIO_MARKDOWN_FORMAT_VERSION = 1;

export interface TestScenarioMarkdownStep {
  action: string;
  expectedResult: string | null;
}

export interface TestScenarioMarkdownSource {
  title: string;
  details: string | null;
  objective: string | null;
  preconditions: string | null;
  testData: string | null;
  steps: readonly TestScenarioMarkdownStep[];
  expectedResult: string | null;
  notes: string | null;
}

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, "\n");
}

function escapeTitle(value: string): string {
  return normalizeLineEndings(value).replace(/[\r\n]+/g, " ").replace(/([\\`*_{}[\]()#+.!|>~-])/g, "\\$1");
}

function section(title: string, value: string): string[] {
  return [`## ${title}`, normalizeLineEndings(value)];
}

export function renderTestScenarioMarkdown(
  source: TestScenarioMarkdownSource,
): string {
  const blocks: string[][] = [[`# ${escapeTitle(source.title)}`]];

  const optionalSections: Array<[string, string | null]> = [
    ["Details", source.details],
    ["Objective", source.objective],
    ["Preconditions", source.preconditions],
    ["Test Data", source.testData],
  ];

  for (const [title, value] of optionalSections) {
    if (value !== null) {
      blocks.push(section(title, value));
    }
  }

  const stepLines: string[] = ["## Steps"];
  if (source.steps.length === 0) {
    stepLines.push("_No steps defined._");
  } else {
    source.steps.forEach((step, index) => {
      stepLines.push(`### Step ${index + 1}`);
      stepLines.push(normalizeLineEndings(step.action));
      if (step.expectedResult !== null) {
        stepLines.push("**Expected result:**");
        stepLines.push(normalizeLineEndings(step.expectedResult));
      }
    });
  }
  blocks.push(stepLines);

  for (const [title, value] of [
    ["Expected Result", source.expectedResult],
    ["Notes", source.notes],
  ] as const) {
    if (value !== null) {
      blocks.push(section(title, value));
    }
  }

  return `${blocks.map((block) => block.join("\n")).join("\n\n").replace(/\n+$/, "")}\n`;
}

export function hashTestScenarioMarkdown(contentMd: string): string {
  return createHash("sha256").update(contentMd, "utf8").digest("hex");
}
