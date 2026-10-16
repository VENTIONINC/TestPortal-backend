// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0


import { jest } from "@jest/globals";
import type { Response } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";

const service = {
  list: jest.fn<() => Promise<unknown>>(),
  create: jest.fn<() => Promise<unknown>>(),
  update: jest.fn<() => Promise<unknown>>(),
  remove: jest.fn<() => Promise<void>>(),
};
jest.mock("@/services/manualRunEnvironmentProfileService", () => ({
  manualRunEnvironmentProfileService: service,
  ProfileNotFoundError: class ProfileNotFoundError extends Error {},
}));
import { manualRunEnvironmentProfileController as controller } from "@/controllers/manualRunEnvironmentProfileController";

const projectId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const profileId = "33333333-3333-4333-8333-333333333333";
function request(body: unknown = {}) {
  return { params: { projectId, profileId }, body, user: { id: ownerId } } as AuthenticatedRequest<{ projectId: string; profileId: string }>;
}
function response() {
  const res = { status: jest.fn(), json: jest.fn(), send: jest.fn() };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

describe("environment profile controller", () => {
  beforeEach(() => jest.clearAllMocks());
  it("creates a validated profile for the authenticated owner", async () => {
    const profile = { id: profileId, name: "Desktop" };
    service.create.mockResolvedValue(profile);
    const res = response();
    await controller.create(request({ name: " Desktop ", browser: " Chrome " }), res);
    expect(service.create).toHaveBeenCalledWith(projectId, ownerId, { name: "Desktop", browser: "Chrome" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(profile);
  });
  it("rejects invalid and empty update bodies", async () => {
    const res = response();
    await controller.update(request({}), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.update).not.toHaveBeenCalled();
  });
  it("returns scoped profiles and deletes by project, owner, and id", async () => {
    service.list.mockResolvedValue([]);
    const res = response();
    await controller.list(request(), res);
    await controller.remove(request(), res);
    expect(service.list).toHaveBeenCalledWith(projectId, ownerId);
    expect(service.remove).toHaveBeenCalledWith(projectId, ownerId, profileId);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
