// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import express from "express";
import JSZip from "jszip";
import request from "supertest";

import skillRoutes from "@/routes/skillRoutes";
import { skillArtifactService } from "@/services/skillArtifactService";

jest.mock("@/middleware/authMiddleware", () => ({
  authMiddleware: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (req.headers.authorization === "Bearer valid-token") {
      next();
      return;
    }

    res.status(401).json({ error: "Unauthorized" });
  },
}));

const app = express();
app.use(skillRoutes);

const skillId = "6f5b8b53-5128-4b05-a8bf-b1d532f3a8d9";
const createZip = async (): Promise<Buffer> => {
  const zip = new JSZip();
  zip.file(
    "custom/SKILL.md",
    "---\nname: custom-skill\ndescription: Route test skill.\n---\n\n# Custom\n",
  );
  return await zip.generateAsync({ type: "nodebuffer" });
};

describe("skill mutation routes", () => {
  const catalog: Array<{
    id: string;
    name: string;
    title: string;
    description: string;
    category: string;
    source: "custom";
    readOnly: false;
    downloadUrl: string;
  }> = [];

  beforeEach(() => {
    catalog.length = 0;
    jest.spyOn(skillArtifactService, "listSkills").mockImplementation(async () => [
      ...catalog,
    ]);
    jest
      .spyOn(skillArtifactService, "createCustomSkill")
      .mockImplementation(async (input) => {
        const metadata = {
          id: skillId,
          name: "custom-skill",
          title: input.title,
          description: "Route test skill.",
          category: input.category,
          source: "custom" as const,
          readOnly: false as const,
          downloadUrl: `/api/v2/skills/${skillId}/download`,
        };
        catalog.push(metadata);
        return metadata;
      });
    jest
      .spyOn(skillArtifactService, "replaceCustomSkill")
      .mockImplementation(async (id, input) => {
        const metadata = catalog.find((skill) => skill.id === id);
        if (!metadata) {
          throw new Error("Missing route fixture");
        }
        metadata.title = input.title;
        metadata.category = input.category;
        return metadata;
      });
    jest
      .spyOn(skillArtifactService, "deleteCustomSkill")
      .mockImplementation(async (id) => {
        const index = catalog.findIndex((skill) => skill.id === id);
        if (index >= 0) {
          catalog.splice(index, 1);
        }
        return { id };
      });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("rejects unauthenticated multipart uploads before package handling", async () => {
    const response = await request(app)
      .post("/v2/skills")
      .field("title", "Custom Skill")
      .field("category", "testing")
      .attach("package", await createZip(), "custom.zip");

    expect(response.status).toBe(401);
    expect(skillArtifactService.createCustomSkill).not.toHaveBeenCalled();
  });

  it("exposes the authenticated custom skill lifecycle in the catalog", async () => {
    const zip = await createZip();
    const created = await request(app)
      .post("/v2/skills")
      .set("Authorization", "Bearer valid-token")
      .field("title", "Custom Skill")
      .field("category", "testing")
      .attach("package", zip, "transport-name.zip");

    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      id: skillId,
      name: "custom-skill",
      title: "Custom Skill",
      source: "custom",
      readOnly: false,
    });

    const listedAfterCreate = await request(app)
      .get("/v2/skills")
      .set("Authorization", "Bearer valid-token");
    expect(listedAfterCreate.body.skills).toHaveLength(1);

    const replaced = await request(app)
      .put(`/v2/skills/${skillId}`)
      .set("Authorization", "Bearer valid-token")
      .field("title", "Updated Skill")
      .field("category", "operations")
      .attach("package", zip, "replacement.zip");
    expect(replaced.status).toBe(200);
    expect(replaced.body).toMatchObject({
      id: skillId,
      title: "Updated Skill",
      category: "operations",
    });

    const deleted = await request(app)
      .delete(`/v2/skills/${skillId}`)
      .set("Authorization", "Bearer valid-token");
    expect(deleted.status).toBe(204);

    const listedAfterDelete = await request(app)
      .get("/v2/skills")
      .set("Authorization", "Bearer valid-token");
    expect(listedAfterDelete.body).toEqual({ skills: [] });
  });
});
