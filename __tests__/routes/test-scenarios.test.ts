// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { jest } from "@jest/globals";

const authMiddlewareMock = jest.fn();
const controllerMocks = {
  create: jest.fn(),
  list: jest.fn(),
  getById: jest.fn(),
  delete: jest.fn(),
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

  it("registers exactly create, list, detail, and delete operations", () => {
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
});
