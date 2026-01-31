export interface BuildInfo {
  name: string;
  component: "backend";
  version: string;
  buildHash: string;
  buildTime: string;
  env: string;
  runtime: {
    node: string;
  };
  deployment?: {
    imageTag: string;
  };
}

const DEFAULT_APP_NAME = "TestPortal";
const DEFAULT_APP_ENV = "prod";
const DEFAULT_VERSION = "0.0.0";

export function shortenHash(hash: string, length = 8): string {
  const trimmed = hash.trim();
  if (!trimmed) {
    return "";
  }

  const targetLength = Math.max(7, Math.min(12, length));
  if (trimmed.length <= targetLength) {
    return trimmed;
  }

  return trimmed.slice(0, targetLength);
}

export function getBuildInfo(): BuildInfo {
  const name = process.env.APP_NAME ?? DEFAULT_APP_NAME;
  const version =
    process.env.APP_VERSION ??
    process.env.npm_package_version ??
    DEFAULT_VERSION;
  const buildHash = shortenHash(process.env.BUILD_HASH ?? "");
  const buildTime = process.env.BUILD_TIME ?? "";
  const env = process.env.APP_ENV ?? DEFAULT_APP_ENV;
  const imageTag = process.env.IMAGE_TAG;

  return {
    name,
    component: "backend",
    version,
    buildHash,
    buildTime,
    env,
    runtime: {
      node: process.version,
    },
    ...(imageTag ? { deployment: { imageTag } } : {}),
  };
}
