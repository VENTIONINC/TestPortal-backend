// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

export function performanceResourceConstraint(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "performance: runtime resource constraint",
    status: "failed",
    specKey: pick(i, [
      "load/export.spec.ts > Export > should build a large report",
      "api/search.spec.ts > Search API > should process concurrent queries",
      "e2e/media.spec.ts > Media > should render image gallery",
    ]),
    specTitle: pick(i, [
      "should build a large report",
      "should process concurrent queries",
      "should render image gallery",
    ]),
    executionName: pick(i, ["Load Tests - CI", "Chrome - CI"]),
    duration: pick(i, [58000, 90000, 120000]),
    retry: 0,
    errorMessage: pick(i, [
      "JavaScript heap out of memory while generating report",
      "Worker pool exhausted; request remained queued for 90000ms",
      "Browser process killed after exceeding memory limit while rendering gallery",
    ]),
    errorStack: pick(i, [
      "at ReportBuilder.render (src/report-builder.ts:144:18)",
      "at SearchWorkerPool.acquire (src/workers/search.ts:93:11)",
      "at GalleryPage.renderAll (pages/gallery.ts:110:7)",
    ]),
    errorLocation: pick(i, [
      "load/export.spec.ts:81:5",
      "api/search.spec.ts:96:8",
      "e2e/media.spec.ts:62:9",
    ]),
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["performance", "resources"],
    input: { ...base.input, id: makeUuid(7000 + i) },
    expect: {
      category: "performance",
      status: "failed",
      errorQuality: "required",
      confidenceMin: 3,
      confidenceMax: 5,
    },
  };
}
