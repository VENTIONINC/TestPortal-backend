// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { errorFormatterController } from "@/controllers/errorFormatterController";
import { errorFormatterService } from "@/services/errorFormatterService";
import { executeController } from "@/test-utils/httpMocks";

describe("errorFormatterController.formatError", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("formats a generic error without category context and returns only the draft", async () => {
    jest.spyOn(errorFormatterService, "formatErrorMessage").mockResolvedValue({
      name: "Readable failure",
      description: "Actionable details",
    });

    const res = await executeController(errorFormatterController.formatError, {
      method: "POST",
      body: {
        name: "Original failure",
        description: "Original details",
      },
    });

    expect(errorFormatterService.formatErrorMessage).toHaveBeenCalledWith({
      name: "Original failure",
      description: "Original details",
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      name: "Readable failure",
      description: "Actionable details",
    });
  });

  it("prefers canonical contextCategory over the legacy category alias", async () => {
    jest.spyOn(errorFormatterService, "formatErrorMessage").mockResolvedValue({
      name: "Readable failure",
      description: "Actionable details",
    });

    await executeController(errorFormatterController.formatError, {
      method: "POST",
      body: {
        name: "Original failure",
        description: "Original details",
        contextCategory: "script",
        category: "ENVIRONMENT",
      },
    });

    expect(errorFormatterService.formatErrorMessage).toHaveBeenCalledWith({
      name: "Original failure",
      description: "Original details",
      contextCategory: "script",
    });
  });

  it("normalizes the deprecated legacy category alias case-insensitively", async () => {
    jest.spyOn(errorFormatterService, "formatErrorMessage").mockResolvedValue({
      name: "Readable failure",
      description: "Actionable details",
    });

    const res = await executeController(errorFormatterController.formatError, {
      method: "POST",
      body: {
        name: "Original failure",
        description: "Original details",
        category: "ENVIRONMENT",
      },
    });

    expect(errorFormatterService.formatErrorMessage).toHaveBeenCalledWith({
      name: "Original failure",
      description: "Original details",
      contextCategory: "infra",
    });
    expect(res.body).toEqual({
      name: "Readable failure",
      description: "Actionable details",
    });
    expect(res.body).not.toHaveProperty("category");
    expect(res.body).not.toHaveProperty("original");
  });

  it("treats an invalid legacy category as absent prompt context", async () => {
    jest.spyOn(errorFormatterService, "formatErrorMessage").mockResolvedValue({
      name: "Readable failure",
      description: "Actionable details",
    });

    await executeController(errorFormatterController.formatError, {
      method: "POST",
      body: {
        name: "Original failure",
        description: "Original details",
        category: "unknown-legacy-value",
      },
    });

    expect(errorFormatterService.formatErrorMessage).toHaveBeenCalledWith({
      name: "Original failure",
      description: "Original details",
    });
  });

  it("requires canonical contextCategory values to be lowercase", async () => {
    const res = await executeController(errorFormatterController.formatError, {
      method: "POST",
      body: {
        name: "Original failure",
        description: "Original details",
        contextCategory: "BUG",
      },
    });

    expect(errorFormatterService.formatErrorMessage).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(400);
  });
});

describe("errorFormatterController.suggestFromResult", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns only the result-based draft description", async () => {
    jest.spyOn(errorFormatterService, "suggestFromResult").mockResolvedValue({
      description: "Actionable investigation steps",
    });

    const res = await executeController(
      errorFormatterController.suggestFromResult,
      {
        method: "POST",
        body: {
          resultId: "7d9fac75-b4d1-4f94-b06a-f72755a9d284",
          projectId: "32655dc8-5a49-4074-aa5b-c3ac2d09c857",
        },
      },
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      description: "Actionable investigation steps",
    });
    expect(res.body).not.toHaveProperty("category");
  });
});
