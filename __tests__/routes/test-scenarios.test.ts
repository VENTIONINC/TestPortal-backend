// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

const authMiddlewareMock = jest.fn<
  (req: Request, res: Response, next: NextFunction) => void
>();
const controllerMocks = {
  create: jest.fn<(req: Request, res: Response) => void>(),
  list: jest.fn<(req: Request, res: Response) => void>(),
  addSpecLink: jest.fn<(req: Request, res: Response) => void>(),
  listSpecLinks: jest.fn<(req: Request, res: Response) => void>(),
  removeSpecLink: jest.fn<(req: Request, res: Response) => void>(),
  getResults: jest.fn<(req: Request, res: Response) => void>(),
  getIssues: jest.fn<(req: Request, res: Response) => void>(),
  getById: jest.fn<(req: Request, res: Response) => void>(),
  delete: jest.fn<(req: Request, res: Response) => void>(),
};

jest.mock("@/middleware/authMiddleware", () => ({
  authMiddleware: authMiddlewareMock,
}));

jest.mock("@/controllers/testScenarioController", () => ({
  testScenarioController: controllerMocks,
}));

import router from "@/routes/test-scenarios";
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

describe("test-scenario routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("registers the five integration operations alongside scenario CRUD", () => {
    const routes = routeLayers()
      .filter((layer) => layer.route)
      .map((layer) => {
        const route = layer.route;
        if (!route) throw new Error("Route metadata is missing");
        return `${Object.keys(route.methods)[0]} ${route.path}`;
      });

    expect(routes).toEqual([
      "post /v2/test-scenarios",
      "get /v2/test-scenarios",
      "post /v2/test-scenarios/:scenarioId/spec-links",
      "get /v2/test-scenarios/:scenarioId/spec-links",
      "delete /v2/test-scenarios/:scenarioId/spec-links/:specId",
      "get /v2/test-scenarios/:scenarioId/results",
      "get /v2/test-scenarios/:scenarioId/issues",
      "get /v2/test-scenarios/:scenarioId",
      "delete /v2/test-scenarios/:scenarioId",
    ]);
    expect(routes.some((route) => route.startsWith("patch "))).toBe(false);
    expect(routes.some((route) => route.startsWith("put "))).toBe(false);
  });

  it("puts JWT authentication before every scenario controller", () => {
    for (const layer of routeLayers()) {
      const route = layer.route;
      if (!route) continue;

      expect(route.stack.some((entry) => entry.handle === authMiddleware)).toBe(
        true,
      );
    }
  });

  it("keeps nested integration routes before the scenario detail route", () => {
    const routes = routeLayers()
      .filter((layer) => layer.route)
      .map((layer) => layer.route?.path);
    const detailIndex = routes.indexOf("/v2/test-scenarios/:scenarioId");
    const nestedIndexes = routes
      .map((route, index) => (route?.startsWith("/v2/test-scenarios/:scenarioId/") ? index : -1))
      .filter((index) => index >= 0);

    expect(detailIndex).toBeGreaterThan(-1);
    expect(nestedIndexes.every((index) => index < detailIndex)).toBe(true);
  });

  it("mounts the router in the central API router", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/routes/index.ts"),
      "utf8",
    );

    expect(source).toContain('import testScenarios from "@/routes/test-scenarios"');
    expect(source).toContain("router.use(testScenarios)");
  });

  it("does not introduce MCP operations", () => {
    expect(controllerMocks).not.toHaveProperty("mcp");
  });

  it("hands each integration route to the matching controller after auth", () => {
    const expectedHandlers = new Map([
      ["post /v2/test-scenarios/:scenarioId/spec-links", controllerMocks.addSpecLink],
      ["get /v2/test-scenarios/:scenarioId/spec-links", controllerMocks.listSpecLinks],
      ["delete /v2/test-scenarios/:scenarioId/spec-links/:specId", controllerMocks.removeSpecLink],
      ["get /v2/test-scenarios/:scenarioId/results", controllerMocks.getResults],
      ["get /v2/test-scenarios/:scenarioId/issues", controllerMocks.getIssues],
    ]);

    for (const [routeName, controller] of expectedHandlers) {
      const route = routeLayers().find((layer) => {
        const metadata = layer.route;
        return metadata && `${Object.keys(metadata.methods)[0]} ${metadata.path}` === routeName;
      });

      expect(route?.route?.stack.some((entry) => entry.handle === controller)).toBe(true);
    }
  });
});
