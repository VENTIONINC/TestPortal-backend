// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0


import { jest } from "@jest/globals";

const model = {
  projectAccessible: jest.fn<() => Promise<boolean>>(),
  list: jest.fn<() => Promise<unknown[]>>(),
  create: jest.fn<() => Promise<unknown>>(),
  update: jest.fn<() => Promise<unknown>>(),
  remove: jest.fn<() => Promise<boolean>>(),
};
jest.mock("@/models/manualRunEnvironmentProfileModel", () => ({ manualRunEnvironmentProfileModel: model }));
import { manualRunEnvironmentProfileService as service, ProfileNotFoundError } from "@/services/manualRunEnvironmentProfileService";

const projectId = "11111111-1111-4111-8111-111111111111";
const ownerId = "22222222-2222-4222-8222-222222222222";
const profileId = "33333333-3333-4333-8333-333333333333";

describe("manual environment profile scope", () => {
  beforeEach(() => { jest.clearAllMocks(); model.projectAccessible.mockResolvedValue(true); });
  it("lists profiles shared by the project", async () => {
    model.list.mockResolvedValue([{ id: profileId }]);
    expect(await service.list(projectId)).toEqual([{ id: profileId }]);
    expect(model.list).toHaveBeenCalledWith(projectId);
  });
  it("rejects inaccessible projects before any profile query", async () => {
    model.projectAccessible.mockResolvedValue(false);
    await expect(service.list(projectId, ownerId)).rejects.toBeInstanceOf(ProfileNotFoundError);
    expect(model.list).not.toHaveBeenCalled();
  });
  it("creates with creator attribution and scopes mutations to the project", async () => {
    model.create.mockResolvedValue({ id: profileId });
    model.update.mockResolvedValue({ id: profileId });
    model.remove.mockResolvedValue(true);
    await service.create(projectId, ownerId, { name: "Desktop" });
    await service.update(projectId, profileId, { name: "Laptop" });
    await service.remove(projectId, profileId);
    expect(model.create).toHaveBeenCalledWith(projectId, ownerId, { name: "Desktop" });
    expect(model.update).toHaveBeenCalledWith(projectId, profileId, { name: "Laptop" });
    expect(model.remove).toHaveBeenCalledWith(projectId, profileId);
  });
  it("does not disclose a missing or foreign profile", async () => {
    model.update.mockResolvedValue(null);
    model.remove.mockResolvedValue(false);
    await expect(service.update(projectId, profileId, { name: "Laptop" })).rejects.toBeInstanceOf(ProfileNotFoundError);
    await expect(service.remove(projectId, profileId)).rejects.toBeInstanceOf(ProfileNotFoundError);
  });
});
