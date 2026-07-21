// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { projectModel } from "@/models/projectModel";
import { projectAccessService } from "@/services/projectAccessService";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";

jest.mock("@/models/projectModel");
jest.mock("@/prisma/client", () => ({
  dbClient: {
    issue: {
      findUnique: jest.fn(),
    },
    result: {
      findUnique: jest.fn(),
    },
    resultError: {
      findUnique: jest.fn(),
    },
    assumption: {
      findUnique: jest.fn(),
    },
  },
}));

const mockProjectModel = projectModel as jest.Mocked<typeof projectModel>;

const user = (
  id: string,
  role: "admin" | "member" = "member",
): NonNullable<AuthenticatedRequest["user"]> => ({
  id,
  role,
  status: "active",
  name: `${id} name`,
  email: `${id}@example.com`,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("projectAccessService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows the project owner to access a project", async () => {
    mockProjectModel.findById.mockResolvedValue({
      id: "project-a",
      ownerId: "user-a",
    } as Awaited<ReturnType<typeof projectModel.findById>>);

    await expect(
      projectAccessService.assertProjectAccess(user("user-a"), "project-a"),
    ).resolves.toEqual(expect.objectContaining({ id: "project-a" }));
  });

  it("denies a different member access to the project", async () => {
    mockProjectModel.findById.mockResolvedValue({
      id: "project-a",
      ownerId: "user-a",
    } as Awaited<ReturnType<typeof projectModel.findById>>);

    await expect(
      projectAccessService.assertProjectAccess(user("user-b"), "project-a"),
    ).rejects.toMatchObject({
      message: "Project access denied",
      statusCode: 403,
    });
  });

  it("allows admin users to access projects they do not own", async () => {
    mockProjectModel.findById.mockResolvedValue({
      id: "project-a",
      ownerId: "user-a",
    } as Awaited<ReturnType<typeof projectModel.findById>>);

    await expect(
      projectAccessService.assertProjectAccess(
        user("admin-user", "admin"),
        "project-a",
      ),
    ).resolves.toEqual(expect.objectContaining({ id: "project-a" }));
  });

  it("filters project lists by owner for non-admin users", () => {
    expect(projectAccessService.projectFilterForUser(user("user-a"))).toEqual({
      ownerId: "user-a",
    });
  });
});
