// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { playwrightArtifactService } from "@/services/playwrightArtifactService";

describe("playwrightArtifactService", () => {
  it("extracts a deterministic S3 object key from a supported attachment", () => {
    const artifact = playwrightArtifactService.extractS3ArtifactReference(
      {
        title: "C123 checkout creates an order",
        location: { file: "tests/checkout.spec.ts" },
      },
      {
        retry: 0,
        startTime: "2026-05-18T10:00:01.000Z",
        attachments: [
          {
            name: "s3-artifact",
            contentType: "application/x-s3-artifact",
            path: "test-results/checkout/order-trace.zip",
          },
        ],
      },
    );

    expect(artifact).toEqual({
      provider: "s3",
      objectKey:
        "playwright-artifacts/tests/checkout.spec.ts/C123-checkout-creates-an-order/1779098401000-0-order-trace.zip",
    });
  });

  it("returns null when no supported artifact attachment exists", () => {
    const artifact = playwrightArtifactService.extractS3ArtifactReference(
      {
        title: "C123 checkout creates an order",
        location: { file: "tests/checkout.spec.ts" },
      },
      {
        retry: 0,
        startTime: "2026-05-18T10:00:01.000Z",
        attachments: [
          {
            name: "stdout",
            contentType: "text/plain",
            path: "stdout.txt",
          },
        ],
      },
    );

    expect(artifact).toBeNull();
  });
});
