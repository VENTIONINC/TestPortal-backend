// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

const authMiddlewareMock = jest.fn<
  (req: Request, res: Response, next: NextFunction) => void
>();
const controllerMocks = {
  start: jest.fn<(req: Request, res: Response) => void>(),
  listByScenario: jest.fn<(req: Request, res: Response) => void>(),
  listByProject: jest.fn<(req: Request, res: Response) => void>(),
  getById: jest.fn<(req: Request, res: Response) => void>(),
  update: jest.fn<(req: Request, res: Response) => void>(),
  updateStep: jest.fn<(req: Request, res: Response) => void>(),
  complete: jest.fn<(req: Request, res: Response) => void>(),
};

jest.mock("@/middleware/authMiddleware", () => ({
  authMiddleware: authMiddlewareMock,
}));
jest.mock("@/controllers/manualTestRunController", () => ({
  manualTestRunController: controllerMocks,
}));

import router from "@/routes/manual-test-runs";
import { authMiddleware } from "@/middleware/authMiddleware";

interface RouteLayer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
    stack: Array<{ handle: unknown }>;
  };
}

const routeLayers = (): RouteLayer[] =>
  (router as unknown as { stack: RouteLayer[] }).stack;

describe("manual test run routes", () => {
  it("registers all seven operations", () => {
    const routes = routeLayers()
      .filter((layer) => layer.route)
      .map((layer) => {
        const route = layer.route;
        if (!route) throw new Error("Route metadata is missing");
        return `${Object.keys(route.methods)[0]} ${route.path}`;
      });

    expect(routes).toEqual([
      "post /v2/test-scenarios/:scenarioId/manual-runs",
      "get /v2/test-scenarios/:scenarioId/manual-runs",
      "get /v2/manual-test-runs",
      "get /v2/manual-test-runs/:runId",
      "patch /v2/manual-test-runs/:runId",
      "patch /v2/manual-test-runs/:runId/steps/:stepId",
      "post /v2/manual-test-runs/:runId/complete",
    ]);
  });

  it("puts JWT authentication before every controller", () => {
    for (const layer of routeLayers()) {
      const route = layer.route;
      if (!route) continue;
      expect(route.stack.some((entry) => entry.handle === authMiddleware)).toBe(
        true,
      );
    }
  });

  it("hands each operation to its matching controller", () => {
    const expected = new Map([
      ["post /v2/test-scenarios/:scenarioId/manual-runs", controllerMocks.start],
      [
        "get /v2/test-scenarios/:scenarioId/manual-runs",
        controllerMocks.listByScenario,
      ],
      ["get /v2/manual-test-runs", controllerMocks.listByProject],
      ["get /v2/manual-test-runs/:runId", controllerMocks.getById],
      ["patch /v2/manual-test-runs/:runId", controllerMocks.update],
      [
        "patch /v2/manual-test-runs/:runId/steps/:stepId",
        controllerMocks.updateStep,
      ],
      [
        "post /v2/manual-test-runs/:runId/complete",
        controllerMocks.complete,
      ],
    ]);

    for (const [routeName, controller] of expected) {
      const route = routeLayers().find((layer) => {
        const metadata = layer.route;
        return (
          metadata &&
          `${Object.keys(metadata.methods)[0]} ${metadata.path}` === routeName
        );
      });
      expect(route?.route?.stack.some((entry) => entry.handle === controller)).toBe(
        true,
      );
    }
  });
});
