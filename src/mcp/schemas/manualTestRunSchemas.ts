// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod/v3";
import {
  MANUAL_TEST_RUN_STATUSES,
  MANUAL_TEST_RUN_STEP_STATUSES,
  MANUAL_TEST_RUN_TERMINAL_STATUSES,
} from "@/types/manualTestRuns";
import type { MCPToolSchema } from "@/types";

const uuid = () => z.string().uuid();
const note = z.string().trim().min(1).nullable();
const key = z.string().trim().min(1).max(100).refine((value) => !/[\r\n]/.test(value)).nullable();
const keyFilter = z.string().trim().min(1).max(100).refine((value) => !/[\r\n]/.test(value));
const environment = z.string().trim().max(200).regex(/^[^\r\n]*$/).nullable().transform((value) => value || null);
const runStatus = z.enum(MANUAL_TEST_RUN_STATUSES);
const stepStatus = z.enum(MANUAL_TEST_RUN_STEP_STATUSES);
const terminalStatus = z.enum(MANUAL_TEST_RUN_TERMINAL_STATUSES);
const page = z.number().int().min(1).default(1);
const limit = z.number().int().min(1).max(100).default(30);
const timestamp = z.string().refine((value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) return false;
  const [, year, month, day, hour, minute, second, offsetHour, offsetMinute] = match;
  const date = new Date(`${year}-${month}-${day}T00:00:00Z`);
  return date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() + 1 === Number(month) &&
    date.getUTCDate() === Number(day) &&
    Number(hour) <= 23 && Number(minute) <= 59 && Number(second) <= 59 &&
    (offsetHour === undefined || (Number(offsetHour) <= 23 && Number(offsetMinute) <= 59));
}, "Must be an RFC 3339 timestamp with an explicit timezone");

const runIds = { projectId: uuid(), runId: uuid() };

export const startManualTestRunSchema = z.object({
  projectId: uuid(), scenarioId: uuid(), notes: note.optional(), runKey: key.optional(),
  environmentProfileId: uuid().optional(), browser: environment.optional(),
  operatingSystem: environment.optional(), device: environment.optional(),
  apiEnvironment: environment.optional(), build: environment.optional(), deployment: environment.optional(),
}).strict() satisfies MCPToolSchema;

export const getManualTestRunSchema = z.object(runIds).strict() satisfies MCPToolSchema;

export const updateManualTestRunSchema = z.object({
  ...runIds, notes: note.optional(), runKey: key.optional(),
}).strict().refine((value) => value.notes !== undefined || value.runKey !== undefined, {
  message: "At least one editable field (notes or runKey) is required",
}) satisfies MCPToolSchema;

export const updateManualTestRunStepSchema = z.object({
  ...runIds, stepId: uuid(), status: stepStatus.optional(), notes: note.optional(),
}).strict().refine((value) => value.status !== undefined || value.notes !== undefined, {
  message: "At least one editable field (status or notes) is required",
}) satisfies MCPToolSchema;

export const completeManualTestRunSchema = z.object({
  ...runIds, status: terminalStatus, notes: note.optional(),
}).strict() satisfies MCPToolSchema;

const dateRangeRefinement = (value: { startedFrom?: string | undefined; startedBefore?: string | undefined }, ctx: z.RefinementCtx): void => {
  if (value.startedFrom && value.startedBefore && Date.parse(value.startedFrom) >= Date.parse(value.startedBefore)) {
    ctx.addIssue({ code: "custom", path: ["startedFrom"], message: "startedFrom must be earlier than startedBefore" });
  }
};

export const listManualTestRunsSchema = z.object({
  projectId: uuid(), testScenarioId: uuid().optional(), sourceScenarioKey: keyFilter.optional(),
  status: runStatus.optional(), startedFrom: timestamp.optional(), startedBefore: timestamp.optional(), page, limit,
}).strict().superRefine(dateRangeRefinement) satisfies MCPToolSchema;

export const listTestScenarioManualRunsSchema = z.object({
  projectId: uuid(), scenarioId: uuid(), status: runStatus.optional(),
  startedFrom: timestamp.optional(), startedBefore: timestamp.optional(), page, limit,
}).strict().superRefine(dateRangeRefinement) satisfies MCPToolSchema;

export const listActiveUsersSchema = z.object({}).strict() satisfies MCPToolSchema;

export const reassignManualTestRunExecutorSchema = z.object({
  ...runIds, executedById: uuid(),
}).strict() satisfies MCPToolSchema;

export type StartManualTestRunInput = z.infer<typeof startManualTestRunSchema>;
export type GetManualTestRunInput = z.infer<typeof getManualTestRunSchema>;
export type UpdateManualTestRunInput = z.infer<typeof updateManualTestRunSchema>;
export type UpdateManualTestRunStepInput = z.infer<typeof updateManualTestRunStepSchema>;
export type CompleteManualTestRunInput = z.infer<typeof completeManualTestRunSchema>;
export type ListManualTestRunsInput = z.input<typeof listManualTestRunsSchema>;
export type ListTestScenarioManualRunsInput = z.input<typeof listTestScenarioManualRunsSchema>;
export type ReassignManualTestRunExecutorInput = z.infer<typeof reassignManualTestRunExecutorSchema>;
