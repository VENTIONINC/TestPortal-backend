// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { NextFunction, Request, RequestHandler, Response } from "express";
import express from "express";
import { jest } from "@jest/globals";
import request from "supertest";

const authMiddlewareMock = jest.fn<(req: Request, res: Response, next: NextFunction) => void>();
const controllerMocks = {
  create: jest.fn<(req: Request, res: Response) => void>(),
  list: jest.fn<(req: Request, res: Response) => void>(),
  getById: jest.fn<(req: Request, res: Response) => void>(),
  reorder: jest.fn<(req: Request, res: Response) => void>(),
  bulkUpdate: jest.fn<(req: Request, res: Response) => void>(),
  updateResult: jest.fn<(req: Request, res: Response) => void>(),
  updateAssignee: jest.fn<(req: Request, res: Response) => void>(),
  updateDetails: jest.fn<(req: Request, res: Response) => void>(),
  updateScenarioEvidence: jest.fn<(req: Request, res: Response) => void>(),
  complete: jest.fn<(req: Request, res: Response) => void>(),
  delete: jest.fn<(req: Request, res: Response) => void>(),
  reopen: jest.fn<(req: Request, res: Response) => void>(),
};

jest.mock("@/middleware/authMiddleware", () => ({ authMiddleware: authMiddlewareMock }));
jest.mock("@/controllers/manualTestRunCreationController", () => ({ manualTestRunCreationController: { create: controllerMocks.create } }));
jest.mock("@/controllers/manualTestRunHistoryController", () => ({ manualTestRunHistoryController: { list: controllerMocks.list, getById: controllerMocks.getById } }));
jest.mock("@/controllers/manualTestRunMutationController", () => ({ manualTestRunMutationController: { reorder: controllerMocks.reorder, bulkUpdate: controllerMocks.bulkUpdate, updateResult: controllerMocks.updateResult, updateAssignee: controllerMocks.updateAssignee, updateDetails: controllerMocks.updateDetails, updateScenarioEvidence: controllerMocks.updateScenarioEvidence } }));
jest.mock("@/controllers/manualTestRunLifecycleController", () => ({ manualTestRunLifecycleController: { complete: controllerMocks.complete, reopen: controllerMocks.reopen, delete: controllerMocks.delete } }));

import router from "@/routes/manual-test-runs";
import { authMiddleware } from "@/middleware/authMiddleware";
import { errorHandler } from "@/middleware/error-handler";
import { jsonBodyParser } from "@/middleware/json-body";
import { createMockRequest, createMockResponse } from "@/test-utils/httpMocks";

interface RouteLayer {
  route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: RequestHandler }> };
}
const routeLayers = (): RouteLayer[] => (router as unknown as { stack: RouteLayer[] }).stack;

describe("manual test run routes", () => {
  const expected = new Map([
    ["post /v2/manual-test-runs", controllerMocks.create],
    ["get /v2/manual-test-runs", controllerMocks.list],
    ["get /v2/manual-test-runs/:runId", controllerMocks.getById],
    ["delete /v2/manual-test-runs/:runId", controllerMocks.delete],
    ["put /v2/manual-test-runs/:runId/details", controllerMocks.updateDetails],
    ["patch /v2/manual-test-runs/:runId/scenarios/:scenarioId/evidence", controllerMocks.updateScenarioEvidence],
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
      expect(route.stack[0]?.handle).toBe(authMiddleware);
    }
  });

  it("hands each operation to its matching controller", async () => {
    for (const [routeName, controller] of expected) {
      const route = routeLayers().find((layer) => {
        const metadata = layer.route;
        return metadata && `${Object.keys(metadata.methods)[0]} ${metadata.path}` === routeName;
      });
      if (controller === controllerMocks.create) {
        const req = createMockRequest({
          method: "POST",
          user: {
            id: "user-1",
            name: "Test Runner",
            email: "runner@example.com",
            status: "active",
            role: "member",
            createdAt: new Date("2026-01-01"),
            updatedAt: new Date("2026-01-01"),
          },
        });
        const res = createMockResponse();
        await route?.route?.stack.at(-1)?.handle(req, res, jest.fn());
        expect(controller).toHaveBeenCalledWith(req, res);
      } else {
        expect(route?.route?.stack.some((entry) => entry.handle === controller)).toBe(true);
      }
    }
  });
});

describe("manual test run JSON body limits", () => {
  const base = "/api/v2/manual-test-runs";
  const runId = "00000000-0000-4000-8000-000000000001";
  const scenarioIds = Array.from(
    { length: 10_000 },
    (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
  );
  const cases = [
    {
      method: "post",
      path: base,
      controller: controllerMocks.create,
      limit: 2 * 1024 ** 2,
      body: { scenarioIds },
    },
    {
      method: "put",
      path: `${base}/${runId}/details`,
      controller: controllerMocks.updateDetails,
      limit: 2 * 1024 ** 2,
      body: { scenarioIds, title: "Regression run", environmentProperties: [] },
    },
    {
      method: "put",
      path: `${base}/${runId}/scenarios/order`,
      controller: controllerMocks.reorder,
      limit: 512 * 1024,
      body: { scenarioIds },
    },
    {
      method: "post",
      path: `${base}/${runId}/scenarios/bulk`,
      controller: controllerMocks.bulkUpdate,
      limit: 512 * 1024,
      body: { scenarioIds, result: "passed" },
    },
  ] as const;

  function createApp() {
    const app = express();
    app.use(jsonBodyParser);
    app.use("/api", router);
    app.use(errorHandler);
    return app;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    authMiddlewareMock.mockImplementation((_req, _res, next) => next());
  });

  it.each(cases)(
    "parses 10,000 IDs for $method $path within its limit",
    async ({ method, path, controller, limit, body }) => {
      controller.mockImplementationOnce((req, res) => {
        res.json({ scenarioCount: req.body.scenarioIds.length });
      });

      const operation = request(createApp())[method](path);
      const response = await operation
        .type("application/json")
        .send(JSON.stringify(body).padEnd(limit, " "));

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ scenarioCount: 10_000 });
    },
  );

  it.each(cases)(
    "rejects bodies over the limit for $method $path",
    async ({ method, path, controller, limit, body }) => {
      const operation = request(createApp())[method](path);
      const response = await operation
        .type("application/json")
        .send(JSON.stringify(body).padEnd(limit + 1, " "));

      expect(response.status).toBe(413);
      expect(authMiddlewareMock).toHaveBeenCalled();
      expect(controller).not.toHaveBeenCalled();
    },
  );

  it("keeps the 100 KiB limit for other routes", async () => {
    const response = await request(createApp())
      .post(`${base}/${runId}/complete`)
      .type("application/json")
      .send("{}".padEnd(100 * 1024 + 1, " "));

    expect(response.status).toBe(413);
    expect(controllerMocks.complete).not.toHaveBeenCalled();
  });

  it("authenticates scoped routes before parsing the body", async () => {
    authMiddlewareMock.mockImplementationOnce((_req, res) => {
      res.sendStatus(401);
    });

    const response = await request(createApp())
      .post(base)
      .type("application/json")
      .send("{");

    expect(response.status).toBe(401);
    expect(controllerMocks.create).not.toHaveBeenCalled();
  });
});
