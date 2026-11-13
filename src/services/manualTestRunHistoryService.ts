// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { getManualRunPeriodBounds } from "@/lib/manualTestRunPeriod";
import { manualTestRunHistoryModel } from "@/models/manualTestRunHistoryModel";
import {
  ManualTestRunNotFoundError,
  ManualTestRunValidationError,
  type GetManualTestRunParams,
  type ListManualTestRunsParams,
  type ManualTestRunPage,
  type ManualTestRunResponse,
  type ManualTestRunPeriod,
  type ManualTestRunShowFilter,
} from "@/types/manualTestRuns";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PERIODS: readonly ManualTestRunPeriod[] = [
  "recent",
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
  "any_time",
  "custom",
];
const SHOW_FILTERS: readonly ManualTestRunShowFilter[] = [
  "in_progress",
  "completed",
  "all",
];
const ALLOWED_KEYS = [
  "projectId",
  "runId",
  "page",
  "limit",
  "search",
  "show",
  "period",
  "timeZone",
  "dateFrom",
  "dateTo",
] as const;

function requireUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new ManualTestRunValidationError(`${label} must be a valid UUID`);
  }
}

function validateKeys(value: object, allowed: readonly string[]): void {
  const unknownKey = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknownKey) {
    throw new ManualTestRunValidationError(`Unknown field '${unknownKey}'`);
  }
}

function validateListParams(
  params: ListManualTestRunsParams,
): Required<
  Pick<
    ListManualTestRunsParams,
    "projectId" | "page" | "limit" | "search" | "show" | "period" | "timeZone"
  >
> &
  Pick<ListManualTestRunsParams, "dateFrom" | "dateTo"> {
  validateKeys(params, ALLOWED_KEYS);
  requireUuid(params.projectId, "Project ID");
  const page = params.page ?? 1;
  const limit = params.limit ?? 30;
  if (!Number.isInteger(page) || page < 1) {
    throw new ManualTestRunValidationError("page must be a positive integer");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ManualTestRunValidationError(
      "limit must be a positive integer no greater than 100",
    );
  }
  const show = params.show ?? "in_progress";
  if (!SHOW_FILTERS.includes(show)) {
    throw new ManualTestRunValidationError("show is not a valid run filter");
  }
  const period = params.period ?? "recent";
  if (!PERIODS.includes(period)) {
    throw new ManualTestRunValidationError("period is not a valid run period");
  }
  const timeZone = params.timeZone ?? "UTC";
  if (typeof timeZone !== "string" || !timeZone.trim()) {
    throw new ManualTestRunValidationError(
      "timeZone must be an IANA time-zone identifier",
    );
  }
  if (params.search !== undefined && typeof params.search !== "string") {
    throw new ManualTestRunValidationError("search must be a string");
  }
  const search = params.search?.trim() ?? "";
  if (period === "custom") {
    if (params.dateFrom === undefined || params.dateTo === undefined) {
      throw new ManualTestRunValidationError(
        "Custom period requires dateFrom and dateTo",
      );
    }
  } else if (params.dateFrom !== undefined || params.dateTo !== undefined) {
    throw new ManualTestRunValidationError(
      "dateFrom and dateTo are only valid for a custom period",
    );
  }
  try {
    getManualRunPeriodBounds({
      period,
      now: new Date(),
      timeZone,
      ...(params.dateFrom !== undefined ? { dateFrom: params.dateFrom } : {}),
      ...(params.dateTo !== undefined ? { dateTo: params.dateTo } : {}),
    });
  } catch (error) {
    throw new ManualTestRunValidationError(
      error instanceof Error ? error.message : "Invalid period filter",
    );
  }
  return {
    projectId: params.projectId,
    page,
    limit,
    search,
    show,
    period,
    timeZone,
    ...(params.dateFrom !== undefined ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo !== undefined ? { dateTo: params.dateTo } : {}),
  };
}

export const manualTestRunHistoryService = {
  async listRuns(params: ListManualTestRunsParams): Promise<ManualTestRunPage> {
    const normalized = validateListParams(params);
    return await manualTestRunHistoryModel.list(normalized);
  },

  async getRun(params: GetManualTestRunParams): Promise<ManualTestRunResponse> {
    validateKeys(params, ["projectId", "runId"]);
    requireUuid(params.projectId, "Project ID");
    requireUuid(params.runId, "Run ID");
    const run = await manualTestRunHistoryModel.findById(
      params.projectId,
      params.runId,
    );
    if (!run) {
      throw new ManualTestRunNotFoundError(
        `Manual test run with id '${params.runId}' not found in the requested project`,
      );
    }
    return run;
  },
};
