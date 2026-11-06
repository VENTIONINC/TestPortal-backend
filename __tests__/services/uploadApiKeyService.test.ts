// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import crypto from "crypto";
import { jest } from "@jest/globals";
import { uploadApiKeyModel } from "@/models/uploadApiKeyModel";
import { uploadApiKeyService } from "@/services/uploadApiKeyService";

jest.mock("@/models/uploadApiKeyModel");

const secret = "upload-api-key-test-secret";
const keyId = "11111111-1111-4111-8111-111111111111";
const projectId = "22222222-2222-4222-8222-222222222222";
const ownerId = "33333333-3333-4333-8333-333333333333";

function createSignedKey(
  signedProjectId = projectId,
  signedOwnerId = ownerId,
): { token: string; payload: string } {
  const payload = `upload_${keyId}_${signedProjectId}_${signedOwnerId}_1780000000000_0123456789abcdef0123456789abcdef`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return { token: `${payload}.${signature}`, payload };
}

function storedRecord(overrides: Record<string, unknown> = {}) {
  const { payload } = createSignedKey();
  return {
    id: keyId,
    apiKey: payload,
    projectId,
    ownerId,
    isActive: true,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("uploadApiKeyService.validateApiKey", () => {
  beforeAll(() => {
    process.env.API_KEY_SECRET = secret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    delete process.env.API_KEY_SECRET;
  });

  it("accepts a signed key whose identifiers match the active stored record", async () => {
    const { token } = createSignedKey();
    (uploadApiKeyModel.findById as jest.Mock).mockResolvedValue(
      storedRecord() as never,
    );

    await expect(uploadApiKeyService.validateApiKey(token)).resolves.toEqual({
      keyId,
      projectId,
      ownerId,
    });
    expect(uploadApiKeyModel.findById).toHaveBeenCalledWith(keyId);
  });

  it.each([
    ["missing", null],
    ["revoked", storedRecord({ isActive: false })],
  ])("rejects a %s stored record", async (_label, record) => {
    const { token } = createSignedKey();
    (uploadApiKeyModel.findById as jest.Mock).mockResolvedValue(record as never);

    await expect(uploadApiKeyService.validateApiKey(token)).rejects.toThrow(
      "API key has been revoked or does not exist",
    );
  });

  it("rejects a signed project identifier that differs from storage", async () => {
    const signedProjectId = "44444444-4444-4444-8444-444444444444";
    const { token } = createSignedKey(signedProjectId, ownerId);
    (uploadApiKeyModel.findById as jest.Mock).mockResolvedValue(
      storedRecord() as never,
    );

    await expect(uploadApiKeyService.validateApiKey(token)).rejects.toThrow(
      "Invalid API key",
    );
  });

  it("rejects a signed owner identifier that differs from storage", async () => {
    const signedOwnerId = "55555555-5555-4555-8555-555555555555";
    const { token } = createSignedKey(projectId, signedOwnerId);
    (uploadApiKeyModel.findById as jest.Mock).mockResolvedValue(
      storedRecord() as never,
    );

    await expect(uploadApiKeyService.validateApiKey(token)).rejects.toThrow(
      "Invalid API key",
    );
  });

  it("rejects a signed payload that differs from the stored payload", async () => {
    const { token } = createSignedKey();
    (uploadApiKeyModel.findById as jest.Mock).mockResolvedValue(
      storedRecord({ apiKey: "different-payload" }) as never,
    );

    await expect(uploadApiKeyService.validateApiKey(token)).rejects.toThrow(
      "Invalid API key",
    );
  });
});
