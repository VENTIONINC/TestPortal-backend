import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3ArtifactConfigurationError extends Error {
  constructor(message = "S3 artifact signing is not configured") {
    super(message);
    this.name = "S3ArtifactConfigurationError";
  }
}

export interface SignedArtifactUrl {
  url: string;
  expiresAt: string;
}

const getArtifactConfig = () => {
  const region = process.env.AWS_REGION ?? "";
  const bucket = process.env.AWS_S3_ARTIFACT_BUCKET ?? "";
  const signedUrlTtlSeconds = Number(
    process.env.S3_SIGNED_URL_TTL_SECONDS ?? "300",
  );

  if (!region || !bucket) {
    throw new S3ArtifactConfigurationError(
      "S3 artifact signing requires AWS_REGION and AWS_S3_ARTIFACT_BUCKET",
    );
  }

  if (!Number.isFinite(signedUrlTtlSeconds) || signedUrlTtlSeconds <= 0) {
    throw new S3ArtifactConfigurationError(
      "S3_SIGNED_URL_TTL_SECONDS must be a positive number",
    );
  }

  return { region, bucket, signedUrlTtlSeconds };
};

export const s3ArtifactService = {
  async createSignedArtifactUrl(objectKey: string): Promise<SignedArtifactUrl> {
    if (!objectKey) {
      throw new Error("Artifact object key is required");
    }

    const { region, bucket, signedUrlTtlSeconds } = getArtifactConfig();
    const client = new S3Client({ region });
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });
    const url = await getSignedUrl(client, command, {
      expiresIn: signedUrlTtlSeconds,
    });
    const expiresAt = new Date(
      Date.now() + signedUrlTtlSeconds * 1000,
    ).toISOString();

    return { url, expiresAt };
  },
};
