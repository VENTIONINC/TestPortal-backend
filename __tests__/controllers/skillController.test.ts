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
    name: "developer-code-assistant",
    title: "Developer Code Analysis Assistant",
    description: "Analyzes code-level issues from Test Portal failures.",
    category: "development",
    version: "1.0.0",
    license: "Apache-2.0",
    compatibility: "Requires repository access.",
    downloadUrl: "/api/v2/skills/developer-code-assistant/download",
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

  it("returns skill detail for a known skill", async () => {
    jest.spyOn(skillArtifactService, "getSkill").mockResolvedValue({
      metadata,
      content: "---\nname: developer-code-assistant\n---\n",
    });
    const req = createMockRequest({
      params: { name: "developer-code-assistant" },
    });
    const res = createMockResponse();

    await SkillController.getSkill(req, res);

    expect(skillArtifactService.getSkill).toHaveBeenCalledWith(
      "developer-code-assistant",
    );
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      metadata,
      content: "---\nname: developer-code-assistant\n---\n",
    });
  });

  it("returns not found for unknown skill detail requests", async () => {
    jest.spyOn(skillArtifactService, "getSkill").mockResolvedValue(null);
    const req = createMockRequest({ params: { name: "missing-skill" } });
    const res = createMockResponse();

    await SkillController.getSkill(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Skill not found" });
  });

  it("returns Markdown download content with attachment headers", async () => {
    jest.spyOn(skillArtifactService, "downloadSkill").mockResolvedValue({
      content: "# Skill",
      contentType: "text/markdown; charset=utf-8",
      filename: "developer-code-assistant-SKILL.md",
    });
    const req = createMockRequest({
      params: { name: "developer-code-assistant" },
    });
    const res = createMockResponse();

    await SkillController.downloadSkill(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(res.get("content-disposition")).toBe(
      'attachment; filename="developer-code-assistant-SKILL.md"',
    );
    expect(res.body).toBe("# Skill");
  });

  it("returns archive download content with attachment headers", async () => {
    const archiveContent = Buffer.from("zip content");
    jest.spyOn(skillArtifactService, "downloadSkillArchive").mockResolvedValue({
      content: archiveContent,
      contentType: "application/zip",
      filename: "developer-code-assistant.zip",
    });
    const req = createMockRequest({
      params: { name: "developer-code-assistant" },
    });
    const res = createMockResponse<Buffer>();

    await SkillController.downloadSkillArchive(req, res);

    expect(skillArtifactService.downloadSkillArchive).toHaveBeenCalledWith(
      "developer-code-assistant",
    );
    expect(res.statusCode).toBe(200);
    expect(res.get("content-type")).toBe("application/zip");
    expect(res.get("content-disposition")).toBe(
      'attachment; filename="developer-code-assistant.zip"',
    );
    expect(res.body).toBe(archiveContent);
  });

  it("returns not found for unknown downloads", async () => {
    jest.spyOn(skillArtifactService, "downloadSkill").mockResolvedValue(null);
    const req = createMockRequest({ params: { name: "missing-skill" } });
    const res = createMockResponse();

    await SkillController.downloadSkill(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Skill not found" });
  });

  it("returns not found for unknown archive downloads", async () => {
    jest
      .spyOn(skillArtifactService, "downloadSkillArchive")
      .mockResolvedValue(null);
    const req = createMockRequest({ params: { name: "missing-skill" } });
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
