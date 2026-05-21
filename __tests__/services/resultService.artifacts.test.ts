// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import { resultService } from "@/services/resultService";
import { resultModel } from "@/models/resultModel";
import { s3ArtifactService } from "@/services/s3ArtifactService";
import type { ResultWithRelations } from "@/types";

jest.mock("@/models/resultModel");
jest.mock("@/services/s3ArtifactService", () => {
  class S3ArtifactConfigurationError extends Error {}

  return {
    S3ArtifactConfigurationError,
    s3ArtifactService: {
      createSignedArtifactUrl: jest.fn(),
    },
  };
});

jest.mock("@/prisma/client", () => ({
  dbClient: {},
}));

const mockResultModel = resultModel as jest.Mocked<typeof resultModel>;
const mockS3ArtifactService = s3ArtifactService as jest.Mocked<
  typeof s3ArtifactService
>;

const baseResult = {
  id: "result-1",
  artifactProvider: "s3",
  artifactObjectKey: "private/object.zip",
  errors: [],
  spec: {},
  execution: {},
} as unknown as ResultWithRelations;

describe("resultService artifact support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("adds artifact availability summaries without exposing private storage fields", async () => {
    mockResultModel.findMany.mockResolvedValue([baseResult]);
    mockResultModel.count.mockResolvedValue(1);

    const response = await resultService.getResults({
      projectId: "project-1",
    });

    expect(response.results[0]).toEqual(
      expect.objectContaining({
        id: "result-1",
        artifact: {
          provider: "s3",
          available: true,
        },
      }),
    );
    expect(response.results[0]).not.toHaveProperty("artifactObjectKey");
    expect(response.results[0]).not.toHaveProperty("artifactProvider");
  });

  it("returns a signed S3 URL for a project-scoped result artifact", async () => {
    mockResultModel.findArtifactById.mockResolvedValue({
      id: "result-1",
      artifactProvider: "s3",
      artifactObjectKey: "private/object.zip",
    });
    mockS3ArtifactService.createSignedArtifactUrl.mockResolvedValue({
      url: "https://signed.example.com/private/object.zip",
      expiresAt: "2026-05-18T10:05:00.000Z",
    });

    const response = await resultService.getSignedArtifactUrl(
      "result-1",
      "project-1",
    );

    expect(mockS3ArtifactService.createSignedArtifactUrl).toHaveBeenCalledWith(
      "private/object.zip",
    );
    expect(response).toEqual({
      provider: "s3",
      url: "https://signed.example.com/private/object.zip",
      expiresAt: "2026-05-18T10:05:00.000Z",
    });
  });

  it("throws not found when a project-scoped result has no artifact", async () => {
    mockResultModel.findArtifactById.mockResolvedValue({
      id: "result-1",
      artifactProvider: null,
      artifactObjectKey: null,
    });

    await expect(
      resultService.getSignedArtifactUrl("result-1", "project-1"),
    ).rejects.toThrow("Result artifact not found");
  });

  it("throws access denied when the result exists outside the requested project scope", async () => {
    mockResultModel.findArtifactById.mockResolvedValue(null);
    mockResultModel.existsById.mockResolvedValue(true);

    await expect(
      resultService.getSignedArtifactUrl("result-1", "project-2"),
    ).rejects.toThrow("Result artifact access denied");
  });
});
