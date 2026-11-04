// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { createProfileSchema, updateProfileSchema, listProfileSchema } from "@/mcp/schemas/manualRunEnvironmentProfileSchemas";
import { profileCreateSchema, profileUpdateSchema } from "@/schemas/manualRunEnvironmentProfileSchemas";
import { mcpManualRunEnvironmentProfileHandler as handler } from "@/handlers/mcpManualRunEnvironmentProfileHandler";
import { createProfileTool, deleteProfileTool } from "@/mcp/tools/manual-run-environment-profiles";
import { manualRunEnvironmentProfileService as service } from "@/services/manualRunEnvironmentProfileService";
import type { MCPToolResponse } from "@/types";

jest.mock("@/services/manualRunEnvironmentProfileService", () => ({ manualRunEnvironmentProfileService: { create: jest.fn(), update: jest.fn(), remove: jest.fn(), list: jest.fn() } }));
const projectId = "11111111-1111-4111-8111-111111111111";
const profileId = "22222222-2222-4222-8222-222222222222";

describe("environment profile MCP contracts", () => {
  it.each([
    { name: " name ", browser: "  Firefox  ", device: " " },
    { name: "a", browser: null },
    { name: "" }, { name: null }, { name: "a\nb" }, { name: "x".repeat(101) },
    { name: "a", browser: "x".repeat(201) }, { name: "a", device: "x\ny" },
    { name: "a", browser: 12 }, { name: "a", ownerId: projectId }, { name: "a", build: "x" },
  ])("matches REST create validation for %j", (data) => {
    const rest = profileCreateSchema.safeParse(data);
    const mcp = createProfileSchema.safeParse({ projectId, ...data });
    expect(mcp.success).toBe(rest.success);
    if (rest.success && mcp.success) { const { projectId: _, ...parsed } = mcp.data; expect(parsed).toEqual(rest.data); }
  });
  it.each([{}, { browser: null }, { browser: " " }, { name: "  renamed " }, { device: "x\ny" }, { deployment: "x" }])("matches REST update validation for %j", (data) => {
    const rest = profileUpdateSchema.safeParse(data);
    const mcp = updateProfileSchema.safeParse({ projectId, profileId, ...data });
    expect(mcp.success).toBe(rest.success);
    if (rest.success && mcp.success) { const { projectId: _, profileId: __, ...parsed } = mcp.data; expect(parsed).toEqual(rest.data); }
  });
  it("rejects invalid identifiers and unknown input", () => {
    expect(listProfileSchema.safeParse({ projectId: "bad" }).success).toBe(false);
    expect(listProfileSchema.safeParse({ projectId, ownerId: profileId }).success).toBe(false);
  });
  it("forwards trusted creator, preserves omission, and returns JSON acknowledgement and service errors", async () => {
    jest.mocked(service.create).mockResolvedValue({ id: profileId } as never);
    const response = await createProfileTool("trusted")[3]({ projectId, name: "Name" }) as MCPToolResponse;
    expect(service.create).toHaveBeenCalledWith(projectId, "trusted", { name: "Name" });
    expect(JSON.parse(response.content[0]?.text ?? "")).toEqual({ id: profileId });
    await handler.update({ projectId, profileId, browser: null });
    expect(service.update).toHaveBeenCalledWith(projectId, profileId, { browser: null });
    const deleted = await deleteProfileTool[3]({ projectId, profileId }) as MCPToolResponse;
    expect(JSON.parse(deleted.content[0]?.text ?? "")).toEqual({ projectId, profileId, deleted: true });
    jest.mocked(service.remove).mockRejectedValueOnce(new Error("Profile not found"));
    expect((await deleteProfileTool[3]({ projectId, profileId }) as MCPToolResponse).isError).toBe(true);
  });
});

