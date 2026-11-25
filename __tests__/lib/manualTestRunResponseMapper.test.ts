// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  mapEnvironmentProperties,
  mapHasBeenReopened,
  mapScenarioEvidence,
  mapStepEvidence,
} from "@/lib/manualTestRunResponseMapper";

describe("manual test run response compatibility mapping", () => {
  it("returns empty environment and requirement context for records without Phase 2 JSON", () => {
    expect(mapEnvironmentProperties(undefined)).toEqual([]);
    expect(mapScenarioEvidence({})).toEqual({
      priority: "medium",
      requirementContext: [],
      executionComment: null,
      defectReference: null,
    });
  });

  it("returns unavailable evidence and independent false step flags for old snapshots", () => {
    expect(mapStepEvidence({})).toEqual({
      comment: null,
      failedFlag: false,
      failedComment: null,
      blockedFlag: false,
      blockedComment: null,
    });
  });

  it("derives reopened state from lifecycle intervals", () => {
    expect(mapHasBeenReopened([])).toBe(false);
    expect(mapHasBeenReopened([{ id: "initial" }])).toBe(false);
    expect(mapHasBeenReopened([{ id: "initial" }, { id: "reopened" }])).toBe(true);
  });

  it("retains valid stored properties and context while dropping malformed JSON entries", () => {
    expect(mapEnvironmentProperties([
      { name: "Browser", value: "Firefox" },
      { name: 5, value: "invalid" },
    ])).toEqual([{ name: "Browser", value: "Firefox" }]);
    expect(mapScenarioEvidence({
      requirementContext: [{ type: "ticket", reference: "TP-60", title: "Manual runs", url: null }],
      executionComment: "Blocked by setup",
      defectReference: "https://tracker.test/BUG-1",
    })).toEqual({
      priority: "medium",
      requirementContext: [{ type: "ticket", reference: "TP-60", title: "Manual runs", url: null }],
      executionComment: "Blocked by setup",
      defectReference: "https://tracker.test/BUG-1",
    });
  });
});
