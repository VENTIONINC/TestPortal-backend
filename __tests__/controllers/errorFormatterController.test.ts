// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { errorFormatterController } from "@/controllers/errorFormatterController";
import { ProjectAccessError } from "@/services/projectAccessService";
import { createMockRequest, createMockResponse } from "@/test-utils/httpMocks";

jest.mock("@/services/errorFormatterService", () => ({
  errorFormatterService: {
    suggestFromResult: jest.fn(),
  },
}));

jest.mock("@/services/projectAccessService", () => {
  class MockProjectAccessError extends Error {
    constructor(
      message: string,
      public readonly statusCode: number,
    ) {
      super(message);
      this.name = "ProjectAccessError";
    }
  }

  return {
    ProjectAccessError: MockProjectAccessError,
    projectAccessService: {
      assertResultAccess: jest.fn(),
    },
  };
});

describe("errorFormatterController.suggestFromResult", () => {
  const errorFormatterServiceMock: {
    errorFormatterService: {
      suggestFromResult: jest.Mock;
    };
  } = jest.requireMock("@/services/errorFormatterService");

  const projectAccessServiceMock: {
    projectAccessService: {
      assertResultAccess: jest.Mock;
    };
  } = jest.requireMock("@/services/projectAccessService");

  const user = {
    id: "24de2184-e32b-4a88-b119-0f67d34496f1",
    name: "Owner",
    email: "owner@ventionteams.com",
    status: "active" as const,
    role: "member" as const,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  };

  const body = {
    resultId: "52073d0a-737f-4ecb-82ef-54fc040e6bfe",
    projectId: "0469e889-aa5d-4a12-9310-22b8aaed816e",
  };

  const assertResultAccessMock = projectAccessServiceMock.projectAccessService
    .assertResultAccess as jest.MockedFunction<
    (typeof projectAccessServiceMock.projectAccessService)["assertResultAccess"]
  >;
  const suggestFromResultMock = errorFormatterServiceMock.errorFormatterService
    .suggestFromResult as jest.MockedFunction<
    (typeof errorFormatterServiceMock.errorFormatterService)["suggestFromResult"]
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("checks result project access before generating an AI suggestion", async () => {
    assertResultAccessMock.mockImplementation(async () => undefined);
    suggestFromResultMock.mockImplementation(async () => ({
      category: "bug",
      description: "Suggested fix",
    }));

    const req = createMockRequest({ method: "POST", body, user });
    const res = createMockResponse();

    await errorFormatterController.suggestFromResult(req, res);

    expect(
      projectAccessServiceMock.projectAccessService.assertResultAccess,
    ).toHaveBeenCalledWith(user, body.resultId);
    expect(
      errorFormatterServiceMock.errorFormatterService.suggestFromResult,
    ).toHaveBeenCalledWith(body.resultId, body.projectId);
    expect(res.statusCode).toBe(200);
  });

  it("does not generate an AI suggestion when result access is denied", async () => {
    assertResultAccessMock.mockImplementation(async () => {
      throw new ProjectAccessError("Project access denied", 403);
    });

    const req = createMockRequest({ method: "POST", body, user });
    const res = createMockResponse();

    await errorFormatterController.suggestFromResult(req, res);

    expect(
      errorFormatterServiceMock.errorFormatterService.suggestFromResult,
    ).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Project access denied" });
  });
});
