// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { NextFunction, Request, Response } from "express";
import { jest } from "@jest/globals";

const authMiddlewareMock = jest.fn<(req: Request, res: Response, next: NextFunction) => void>();
const controllerMocks = {
  create: jest.fn<(req: Request, res: Response) => void>(),
  list: jest.fn<(req: Request, res: Response) => void>(),
  getById: jest.fn<(req: Request, res: Response) => void>(),
  reorder: jest.fn<(req: Request, res: Response) => void>(),
  bulkUpdate: jest.fn<(req: Request, res: Response) => void>(),
  updateResult: jest.fn<(req: Request, res: Response) => void>(),
  updateAssignee: jest.fn<(req: Request, res: Response) => void>(),
  complete: jest.fn<(req: Request, res: Response) => void>(),
  delete: jest.fn<(req: Request, res: Response) => void>(),
  reopen: jest.fn<(req: Request, res: Response) => void>(),
};

jest.mock("@/middleware/authMiddleware", () => ({ authMiddleware: authMiddlewareMock }));
jest.mock("@/controllers/manualTestRunCreationController", () => ({ manualTestRunCreationController: { create: controllerMocks.create } }));
jest.mock("@/controllers/manualTestRunHistoryController", () => ({ manualTestRunHistoryController: { list: controllerMocks.list, getById: controllerMocks.getById } }));
jest.mock("@/controllers/manualTestRunMutationController", () => ({ manualTestRunMutationController: { reorder: controllerMocks.reorder, bulkUpdate: controllerMocks.bulkUpdate, updateResult: controllerMocks.updateResult, updateAssignee: controllerMocks.updateAssignee } }));
jest.mock("@/controllers/manualTestRunLifecycleController", () => ({ manualTestRunLifecycleController: { complete: controllerMocks.complete, reopen: controllerMocks.reopen, delete: controllerMocks.delete } }));

import router from "@/routes/manual-test-runs";
import { authMiddleware } from "@/middleware/authMiddleware";

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: unknown }> };
}
const routeLayers = (): RouteLayer[] => (router as unknown as { stack: RouteLayer[] }).stack;

describe("manual test run routes", () => {
  const expected = new Map([
    ["post /v2/manual-test-runs", controllerMocks.create],
    ["get /v2/manual-test-runs", controllerMocks.list],
    ["get /v2/manual-test-runs/:runId", controllerMocks.getById],
    ["delete /v2/manual-test-runs/:runId", controllerMocks.delete],
    ["put /v2/manual-test-runs/:runId/scenarios/order", controllerMocks.reorder],
    ["post /v2/manual-test-runs/:runId/scenarios/bulk", controllerMocks.bulkUpdate],
    ["put /v2/manual-test-runs/:runId/scenarios/:scenarioId/result", controllerMocks.updateResult],
    ["patch /v2/manual-test-runs/:runId/scenarios/:scenarioId/assignee", controllerMocks.updateAssignee],
    ["post /v2/manual-test-runs/:runId/complete", controllerMocks.complete],
    ["post /v2/manual-test-runs/:runId/reopen", controllerMocks.reopen],
  ]);

  it("registers the complete project-scoped aggregate contract", () => {
    const routes = routeLayers().filter((layer) => layer.route).map((layer) => {
      const route = layer.route!;
      return `${Object.keys(route.methods)[0]} ${route.path}`;
    });
    expect(routes).toEqual([...expected.keys()]);
  });

  it("puts JWT authentication before every controller", () => {
    for (const layer of routeLayers()) {
      const route = layer.route;
      if (!route) continue;
      expect(route.stack.some((entry) => entry.handle === authMiddleware)).toBe(true);
    }
  });

  it("hands each operation to its matching controller", () => {
    for (const [routeName, controller] of expected) {
      const route = routeLayers().find((layer) => {
        const metadata = layer.route;
        return metadata && `${Object.keys(metadata.methods)[0]} ${metadata.path}` === routeName;
      });
      expect(route?.route?.stack.some((entry) => entry.handle === controller)).toBe(true);
    }
  });
});
