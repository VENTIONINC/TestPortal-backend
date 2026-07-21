// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import "@/test-utils/testEnv";
import { jest } from "@jest/globals";
import crypto from "crypto";
import { uploadApiKeyModel } from "@/models/uploadApiKeyModel";
import { uploadApiKeyService } from "@/services/uploadApiKeyService";

jest.mock("@/models/uploadApiKeyModel");

const mockUploadApiKeyModel = uploadApiKeyModel as jest.Mocked<
  typeof uploadApiKeyModel
>;

function signedUploadKey(params: {
  keyId: string;
  projectId: string;
  ownerId: string;
  secret: string;
}): string {
  const payload = `upload_${params.keyId}_${params.projectId}_${params.ownerId}_1780000000000_abcdef`;
  const signature = crypto
    .createHmac("sha256", params.secret)
    .update(payload)
    .digest("hex");

  return `${payload}.${signature}`;
}

describe("uploadApiKeyService security", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.API_KEY_SECRET = "test-api-key-secret";
  });

  afterEach(() => {
    delete process.env.API_KEY_SECRET;
  });

  it("rejects a signed upload key when payload project/owner do not match the stored key record", async () => {
    const keyId = "11111111-1111-4111-8111-111111111111";
    const forgedKey = signedUploadKey({
      keyId,
      projectId: "22222222-2222-4222-8222-222222222222",
      ownerId: "33333333-3333-4333-8333-333333333333",
      secret: process.env.API_KEY_SECRET as string,
    });

    mockUploadApiKeyModel.findById.mockResolvedValue({
      id: keyId,
      projectId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      ownerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      isActive: true,
    } as Awaited<ReturnType<typeof uploadApiKeyModel.findById>>);

    await expect(uploadApiKeyService.validateApiKey(forgedKey)).rejects.toThrow(
      "API key payload does not match stored key record",
    );
  });
});
