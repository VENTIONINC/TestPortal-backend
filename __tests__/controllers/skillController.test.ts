// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { SkillController } from "@/controllers/skillController";
import {
  SkillArtifactError,
  skillArtifactService,
} from "@/services/skillArtifactService";
import {
  createMockRequest,
  createMockResponse,
} from "@/test-utils/httpMocks";

describe("SkillController", () => {
  const metadata = {
    id: "6f5b8b53-5128-4b05-a8bf-b1d532f3a8d9",
    name: "developer-code-assistant",
    title: "Developer Code Analysis Assistant",
    description: "Analyzes code-level issues from Test Portal failures.",
    category: "development",
    source: "system" as const,
    readOnly: true,
    version: "1.0.0",
    license: "Apache-2.0",
    compatibility: "Requires repository access.",
    downloadUrl: "/api/v2/skills/6f5b8b53-5128-4b05-a8bf-b1d532f3a8d9/archive",
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns the skills catalog", async () => {
    jest.spyOn(skillArtifactService, "listSkills").mockResolvedValue([metadata]);
    const req = createMockRequest();
    const res = createMockResponse();

    await SkillController.listSkills(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ skills: [metadata] });
  });

  it("returns skill detail for a known skill id", async () => {
    jest.spyOn(skillArtifactService, "getSkill").mockResolvedValue({
      metadata,
      content: "---\nname: developer-code-assistant\n---\n",
    });
    const req = createMockRequest({
      params: { id: metadata.id },
    });
    const res = createMockResponse();

    await SkillController.getSkill(req, res);

    expect(skillArtifactService.getSkill).toHaveBeenCalledWith(
      metadata.id,
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      metadata,
      content: "---\nname: developer-code-assistant\n---\n",
    });
  });

  it("returns not found for unknown skill id detail requests", async () => {
    jest.spyOn(skillArtifactService, "getSkill").mockResolvedValue(null);
    const req = createMockRequest({ params: { id: "missing-skill-id" } });
    const res = createMockResponse();

    await SkillController.getSkill(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Skill not found" });
  });

  it("returns archive download content with attachment headers", async () => {
    const archiveContent = Buffer.from("zip content");
    jest.spyOn(skillArtifactService, "downloadSkillArchive").mockResolvedValue({
      content: archiveContent,
      contentType: "application/zip",
      filename: "developer-code-assistant.zip",
    });
    const req = createMockRequest({
      params: { id: metadata.id },
    });
    const res = createMockResponse<Buffer>();

    await SkillController.downloadSkillArchive(req, res);

    expect(skillArtifactService.downloadSkillArchive).toHaveBeenCalledWith(
      metadata.id,
    );
    expect(res.statusCode).toBe(200);
    expect(res.get("content-type")).toBe("application/zip");
    expect(res.get("content-disposition")).toBe(
      'attachment; filename="developer-code-assistant.zip"',
    );
    expect(res.body).toBe(archiveContent);
  });

  it("returns not found for unknown archive downloads", async () => {
    jest
      .spyOn(skillArtifactService, "downloadSkillArchive")
      .mockResolvedValue(null);
    const req = createMockRequest({ params: { id: "missing-skill-id" } });
    const res = createMockResponse();

    await SkillController.downloadSkillArchive(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Skill not found" });
  });

  it("maps invalid configured artifacts to server errors", async () => {
    jest.spyOn(console, "error").mockImplementation();
    jest.spyOn(skillArtifactService, "listSkills").mockRejectedValue(
      new SkillArtifactError("Invalid", "INVALID_ARTIFACT"),
    );
    const req = createMockRequest();
    const res = createMockResponse();

    await SkillController.listSkills(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: "Configured skill artifact is invalid" });
  });
});
