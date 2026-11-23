// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { json, Router, type RequestHandler } from "express";

export const manualTestRunJsonRoutes = {
  create: { method: "post", path: "/v2/manual-test-runs", limit: "2mb" },
  updateDetails: {
    method: "put",
    path: "/v2/manual-test-runs/:runId/details",
    limit: "2mb",
  },
  reorder: {
    method: "put",
    path: "/v2/manual-test-runs/:runId/scenarios/order",
    limit: "512kb",
  },
  bulkUpdate: {
    method: "post",
    path: "/v2/manual-test-runs/:runId/scenarios/bulk",
    limit: "512kb",
  },
} as const;

const scenarioTags = "/v2/projects/:projectId/scenario-tags";
export const scenarioTagSelectionRoutes = {
  preview: { method: "post", path: `${scenarioTags}/deletion/preview` },
  remove: { method: "post", path: `${scenarioTags}/deletion` },
  assign: { method: "put", path: `${scenarioTags}/assignment` },
  counts: { method: "post", path: `${scenarioTags}/selection-counts` },
} as const;

const fileUploadPaths = new Set([
  "/api/v2/upload-json-report",
  "/api/v2/upload-json-report-api-key",
  "/api/v2/upload-ctrf-report",
  "/api/v2/upload-ctrf-report-api-key",
]);

export const jsonBodyParser = Router();

// These routes parse JSON after authentication using their own limits.
const deferToRoute: RequestHandler = (_req, _res, next) => next("router");
for (const { method, path } of [...Object.values(manualTestRunJsonRoutes), ...Object.values(scenarioTagSelectionRoutes)]) {
  jsonBodyParser[method](`/api${path}`, deferToRoute);
}

const parseJson = json();
jsonBodyParser.use((req, res, next) => {
  if (fileUploadPaths.has(req.path)) return next();
  parseJson(req, res, next);
});
