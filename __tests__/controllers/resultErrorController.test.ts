// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executeController } from "@/test-utils/httpMocks";
import { resultErrorController } from "@/controllers/resultErrorController";
import { resultErrorService } from "@/services/resultErrorService";

const authenticatedUser = {
  id: "user-1",
  name: "Reviewer",
  email: "reviewer@example.com",
  status: "active" as const,
  role: "member" as const,
  createdAt: new Date("2026-08-27T09:00:00.000Z"),
  updatedAt: new Date("2026-08-27T09:00:00.000Z"),
};

describe("resultErrorController issue modal workflows", () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ["createIssue", 201],
    ["updateIssue", 200],
  ] as const)("passes the authenticated reviewer to %s", async (method, status) => {
    const controller: unknown = Reflect.get(resultErrorController, method);
    expect(controller).toEqual(expect.any(Function));
    if (typeof controller !== "function") return;

    const workflowResult = {
      issue: { id: "issue-1" },
      assumption: { id: "assumption-1" },
      result: { id: "result-1", analysisFeedbackCategory: "bug" },
    };
    const service = jest
      .spyOn(
        resultErrorService as unknown as Record<
          typeof method,
          (...args: unknown[]) => Promise<unknown>
        >,
        method,
      )
      .mockResolvedValue(workflowResult);

    const response = await executeController(
      async (req, res) => await controller(req, res),
      {
      method: method === "createIssue" ? "POST" : "PATCH",
      params: { resultErrorId: "error-1" },
      body: {
        projectId: "project-1",
        name: "Failure",
        category: "bug",
      },
      user: authenticatedUser,
      },
    );

    expect(service).toHaveBeenCalledWith(
      "error-1",
      {
        projectId: "project-1",
        name: "Failure",
        category: "bug",
      },
      "user-1",
    );
    expect(response.statusCode).toBe(status);
    expect(response.body).toEqual(workflowResult);
  });

  it("rejects a workflow request without an authenticated user", async () => {
    const controller: unknown = Reflect.get(resultErrorController, "createIssue");
    expect(controller).toEqual(expect.any(Function));
    if (typeof controller !== "function") return;

    const response = await executeController(
      async (req, res) => await controller(req, res),
      {
        method: "POST",
        params: { resultErrorId: "error-1" },
        body: {
          projectId: "project-1",
          name: "Failure",
          category: "bug",
        },
      },
    );

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ error: "User is not authenticated" });
  });
});

describe("resultErrorController.analyzeErrors", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when projectId is missing", async () => {
    const res = await executeController(resultErrorController.analyzeErrors, {
      method: "POST",
      body: { errorIds: ["err-1"] },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Failed to analyze result errors. Project ID is required",
    });
  });

  it("returns 400 when errorIds is missing", async () => {
    const res = await executeController(resultErrorController.analyzeErrors, {
      method: "POST",
      body: { projectId: "project-1" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error:
        "Failed to analyze result errors. Error IDs array is required and must not be empty",
    });
  });

  it("returns 200 with analysis payload", async () => {
    jest
      .spyOn(resultErrorService, "analyzeErrors")
      .mockResolvedValue({
        analyzedResults: 1,
        updatedResultIds: ["res-1"],
        skippedErrorIds: [],
        totalErrors: 1,
      });

    const res = await executeController(resultErrorController.analyzeErrors, {
      method: "POST",
      body: { projectId: "project-1", errorIds: ["err-1"] },
    });

    expect(resultErrorService.analyzeErrors).toHaveBeenCalledWith(
      "project-1",
      ["err-1"],
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      analyzedResults: 1,
      updatedResultIds: ["res-1"],
      skippedErrorIds: [],
      totalErrors: 1,
    });
  });

  it("returns 400 when service throws", async () => {
    jest
      .spyOn(resultErrorService, "analyzeErrors")
      .mockRejectedValue(new Error("Analysis failed"));

    const res = await executeController(resultErrorController.analyzeErrors, {
      method: "POST",
      body: { projectId: "project-1", errorIds: ["err-1"] },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: "Failed to analyze result errors. Analysis failed",
    });
  });
});

describe("resultErrorController.getModalContext", () => {
  const getController = () =>
    Reflect.get(resultErrorController, "getModalContext");

  afterEach(() => jest.restoreAllMocks());

  it("returns 400 when projectId is missing", async () => {
    const controller = getController();
    expect(controller).toEqual(expect.any(Function));
    if (typeof controller !== "function") return;

    const res = await executeController(controller, {
      params: { resultErrorId: "error-1" },
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Project ID is required" });
  });

  it("returns 200 with modal context", async () => {
    const controller = getController();
    expect(controller).toEqual(expect.any(Function));
    if (typeof controller !== "function") return;
    const context = {
      error: { id: "error-1" },
      result: { id: "result-1" },
      assignments: { confirmed: null, suggestions: [] },
    };
    jest
      .spyOn(resultErrorService, "getModalContext")
      .mockResolvedValue(context as never);

    const res = await executeController(controller, {
      params: { resultErrorId: "error-1" },
      query: { projectId: "project-1" },
    });

    expect(resultErrorService.getModalContext).toHaveBeenCalledWith(
      "error-1",
      "project-1",
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(context);
  });

  it("returns 404 for inaccessible or missing context", async () => {
    const controller = getController();
    expect(controller).toEqual(expect.any(Function));
    if (typeof controller !== "function") return;
    jest
      .spyOn(resultErrorService, "getModalContext")
      .mockRejectedValue(new Error("Result error with ID error-1 not found"));

    const res = await executeController(controller, {
      params: { resultErrorId: "error-1" },
      query: { projectId: "foreign-project" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: "Result error with ID error-1 not found",
    });
  });

  it("returns 500 for unexpected service failures", async () => {
    const controller = getController();
    expect(controller).toEqual(expect.any(Function));
    if (typeof controller !== "function") return;
    jest
      .spyOn(resultErrorService, "getModalContext")
      .mockRejectedValue(new Error("database unavailable"));

    const res = await executeController(controller, {
      params: { resultErrorId: "error-1" },
      query: { projectId: "project-1" },
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Failed to retrieve modal context" });
  });
});
