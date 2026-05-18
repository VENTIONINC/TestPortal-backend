import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { executeController } from "@/test-utils/httpMocks";
import { resultController } from "@/controllers/resultController";
import {
  ResultArtifactNotFoundError,
  resultService,
} from "@/services/resultService";

describe("resultController.getSignedArtifactUrl", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns a signed artifact URL", async () => {
    jest.spyOn(resultService, "getSignedArtifactUrl").mockResolvedValue({
      provider: "s3",
      url: "https://signed.example.com/private/object.zip",
      expiresAt: "2026-05-18T10:05:00.000Z",
    });

    const res = await executeController(resultController.getSignedArtifactUrl, {
      params: { resultId: "result-1" },
      query: { projectId: "project-1" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      provider: "s3",
      url: "https://signed.example.com/private/object.zip",
      expiresAt: "2026-05-18T10:05:00.000Z",
    });
  });

  it("returns 404 for a missing artifact", async () => {
    jest
      .spyOn(resultService, "getSignedArtifactUrl")
      .mockRejectedValue(new ResultArtifactNotFoundError());

    const res = await executeController(resultController.getSignedArtifactUrl, {
      params: { resultId: "result-1" },
      query: { projectId: "project-1" },
    });

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: "Result artifact not found" });
  });

  it("returns 403 for an unauthorized project scope", async () => {
    jest
      .spyOn(resultService, "getSignedArtifactUrl")
      .mockRejectedValue(new Error("Result artifact access denied"));

    const res = await executeController(resultController.getSignedArtifactUrl, {
      params: { resultId: "result-1" },
      query: { projectId: "other-project" },
    });

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: "Result artifact access denied" });
  });

  it("returns 500 for missing S3 runtime configuration", async () => {
    jest
      .spyOn(resultService, "getSignedArtifactUrl")
      .mockRejectedValue(new Error("S3 artifact signing is not configured"));
    jest
      .spyOn(resultService, "isArtifactConfigurationError")
      .mockReturnValue(true);

    const res = await executeController(resultController.getSignedArtifactUrl, {
      params: { resultId: "result-1" },
      query: { projectId: "project-1" },
    });

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: "S3 artifact signing is not configured",
    });
  });
});
