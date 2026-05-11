// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import type { TestCase } from "../types";
import { makeCaseBase, makeUuid, pick } from "../util";

/**
 * Template factory for script/automation selector errors
 * Generates test cases for selector not found issues in test automation
 * @param i - Index for generating variations
 * @returns Test case with script category expectations
 */
export function scriptSelectorNotFound(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "script: selector not found",
    status: i % 4 === 0 ? "flaky" : "failed", // Some selector issues are flaky
    specKey: pick(i, [
      "e2e/dashboard.spec.ts > Dashboard > should show user data",
      "e2e/profile.spec.ts > User Profile > should display avatar",
      "e2e/settings.spec.ts > Settings Page > should update preferences",
    ]),
    specTitle: pick(i, [
      "should show user data",
      "should display avatar",
      "should update preferences",
    ]),
    executionName: pick(i, [
      "Chrome - Production",
      "Chrome - CI",
      "Firefox - Staging",
    ]),
    duration: pick(i, [5000, 12000, 25000, 8500]),
    retry: i % 4 === 0 ? 1 : 0, // Flaky tests usually have retry
    errorMessage: pick(i, [
      "Error: locator('#user-card') not found",
      "Error: No node found for selector: [data-testid='user-card']",
      "Error: selector '.profile-avatar' not found in DOM",
      "Error: Element [data-cy='settings-form'] not found in DOM",
    ]),
    errorStack: pick(i, [
      "at DashboardPage.waitForUserCard (pages/dashboard.ts:55:10)",
      "at ProfilePage.waitForAvatar (pages/profile.ts:32:8)",
      "at SettingsPage.updateForm (pages/settings.ts:78:12)",
    ]),
    errorLocation: pick(i, [
      "pages/dashboard.ts:55:10",
      "pages/profile.ts:32:8",
      "pages/settings.ts:78:12",
    ]),
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["script", "selector", "automation"],
    input: { ...base.input, id: makeUuid(2000 + i) }, // UUID offset: 2000
    expect: {
      category: "script",
      status: base.input.status,
      errorQuality: base.input.status === "failed" ? "required" : "null",
      confidenceMin: 3,
      confidenceMax: 5,
    },
  };
}
