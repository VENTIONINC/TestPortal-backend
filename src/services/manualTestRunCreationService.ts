// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { manualTestRunCreationModel } from "@/models/manualTestRunCreationModel";
import {
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
  type CreateManualTestRunParams,
  type ManualTestRunResponse,
} from "@/types/manualTestRuns";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SOURCE_KEYS = ["scenarioIds", "suiteId"] as const;
const ENVIRONMENT_KEYS = [
  "browser",
  "operatingSystem",
  "device",
  "apiEnvironment",
  "build",
  "deployment",
] as const;
const RUN_KEYS = ["title", "environmentProperties"] as const;

function requireUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ManualTestRunValidationError(`${label} must be a valid UUID`);
  }
}

function validateInput(input: CreateManualTestRunParams): void {
  requireUuid(input.projectId, "Project ID");
  requireUuid(input.executedById, "Starter ID");
  const values = input as unknown as Record<string, unknown>;
  const unknownKey = Object.keys(values).find(
    (key) =>
      ![
        "projectId",
        "executedById",
        ...SOURCE_KEYS,
        ...ENVIRONMENT_KEYS,
        ...RUN_KEYS,
      ].includes(key),
  );
  if (unknownKey) {
    throw new ManualTestRunValidationError(`Unknown field '${unknownKey}'`);
  }

  const hasScenarioIds = Object.hasOwn(values, "scenarioIds");
  const hasSuiteId = Object.hasOwn(values, "suiteId");
  if (hasScenarioIds === hasSuiteId) {
    throw new ManualTestRunValidationError(
      "Exactly one of scenarioIds or suiteId must be provided",
    );
  }
  for (const key of ENVIRONMENT_KEYS) {
    const value = values[key];
    if (value !== undefined && value !== null && typeof value !== "string") {
      throw new ManualTestRunValidationError(`${key} must be a string or null`);
    }
  }
  if (input.title !== undefined && !input.title.trim()) {
    throw new ManualTestRunValidationError("Run name must not be blank");
  }
  if (input.environmentProperties !== undefined) {
    if (input.environmentProperties.length > 100) {
      throw new ManualTestRunValidationError(
        "environmentProperties must contain no more than 100 entries",
      );
    }
    input.environmentProperties.forEach((property, index) => {
      if (!property.name.trim()) {
        throw new ManualTestRunValidationError(
          `Environment property ${index + 1} must have a name`,
        );
      }
    });
  }
  if (hasSuiteId) {
    requireUuid(values.suiteId, "Suite ID");
    return;
  }

  const scenarioIds = values.scenarioIds;
  if (!Array.isArray(scenarioIds) || scenarioIds.length === 0) {
    throw new ManualTestRunValidationError(
      "At least one scenario ID must be provided",
    );
  }
  scenarioIds.forEach((id, index) =>
    requireUuid(id, `Scenario ID ${index + 1}`),
  );
  if (new Set(scenarioIds).size !== scenarioIds.length) {
    throw new ManualTestRunValidationError("Scenario IDs must be unique");
  }
}

export const manualTestRunCreationService = {
  async createRun(
    input: CreateManualTestRunParams,
  ): Promise<ManualTestRunResponse> {
    validateInput(input);
    const normalizedInput =
      input.title === undefined
        ? input
        : { ...input, title: input.title.trim() };
    const run =
      await manualTestRunCreationModel.createFromCatalog(normalizedInput);
    if (!run) {
      throw new ManualTestRunNotFoundError(
        "Manual test run source not found in the requested project",
      );
    }
    return run;
  },
};
