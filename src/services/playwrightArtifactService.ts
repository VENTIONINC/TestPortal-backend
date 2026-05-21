// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";

export interface S3ArtifactReference {
  provider: "s3";
  objectKey: string;
}

interface PlaywrightAttachmentLike {
  name?: unknown;
  contentType?: unknown;
  path?: unknown;
}

interface PlaywrightResultLike {
  retry?: unknown;
  startTime?: unknown;
  attachments?: unknown;
}

interface PlaywrightSpecLike {
  title?: unknown;
  location?: {
    file?: unknown;
  };
}

const SUPPORTED_ATTACHMENT_NAMES = new Set(["artifact", "s3-artifact"]);
const SUPPORTED_CONTENT_TYPES = new Set(["application/x-s3-artifact"]);

const sanitizeKeyPart = (value: string): string =>
  value
    .trim()
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9._/-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);

const isSupportedAttachment = (
  attachment: PlaywrightAttachmentLike,
): attachment is PlaywrightAttachmentLike & { path: string } => {
  if (typeof attachment.path !== "string" || !attachment.path.trim()) {
    return false;
  }

  const name =
    typeof attachment.name === "string" ? attachment.name.toLowerCase() : "";
  const contentType =
    typeof attachment.contentType === "string"
      ? attachment.contentType.toLowerCase()
      : "";

  return (
    SUPPORTED_ATTACHMENT_NAMES.has(name) ||
    SUPPORTED_CONTENT_TYPES.has(contentType)
  );
};

export const playwrightArtifactService = {
  extractS3ArtifactReference(
    spec: PlaywrightSpecLike,
    result: PlaywrightResultLike,
  ): S3ArtifactReference | null {
    if (!Array.isArray(result.attachments)) {
      return null;
    }

    const attachment = result.attachments.find((candidate): candidate is
      PlaywrightAttachmentLike & { path: string } => {
      if (!candidate || typeof candidate !== "object") {
        return false;
      }

      return isSupportedAttachment(candidate as PlaywrightAttachmentLike);
    });

    if (!attachment) {
      return null;
    }

    const file =
      typeof spec.location?.file === "string" ? spec.location.file : "unknown";
    const title = typeof spec.title === "string" ? spec.title : "unknown";
    const retry = typeof result.retry === "number" ? result.retry : 0;
    const startTime =
      typeof result.startTime === "string" || result.startTime instanceof Date
        ? new Date(result.startTime).getTime()
        : 0;
    const attachmentName = path.posix.basename(
      attachment.path.replace(/\\/g, "/"),
    );

    return {
      provider: "s3",
      objectKey: [
        "playwright-artifacts",
        sanitizeKeyPart(file),
        sanitizeKeyPart(title),
        `${Number.isNaN(startTime) ? 0 : startTime}-${retry}-${sanitizeKeyPart(
          attachmentName,
        )}`,
      ].join("/"),
    };
  },
};
