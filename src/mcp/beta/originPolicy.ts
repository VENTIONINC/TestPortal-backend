// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { NextFunction, Request, Response } from "express";

const ALLOWED_METHODS = "POST, OPTIONS";
const ALLOWED_HEADERS =
  "authorization, content-type, accept, mcp-protocol-version, mcp-method, mcp-name, last-event-id";

export const isMcpBetaPath = (path: string): boolean =>
  /^\/api\/v2\/mcp-beta\/?$/i.test(path);

const normalizeHttpOrigin = (value: string): string | undefined => {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }
    return url.origin;
  } catch {
    return undefined;
  }
};

export const parseMcpBetaAllowedOrigins = (
  rawValue: string | undefined,
): Set<string> => {
  const value = rawValue?.trim() ?? "";
  if (!value) return new Set();

  const entries = value.split(",").map((entry) => entry.trim());
  if (entries.some((entry) => !entry)) {
    throw new Error("MCP_BETA_ALLOWED_ORIGINS contains an empty origin entry");
  }

  const origins = new Set<string>();
  for (const entry of entries) {
    if (entry === "null" || entry.includes("*")) {
      throw new Error(
        `MCP_BETA_ALLOWED_ORIGINS must contain exact HTTP(S) origins: ${entry}`,
      );
    }

    const normalizedOrigin = normalizeHttpOrigin(entry);
    if (!normalizedOrigin) {
      throw new Error(
        `MCP_BETA_ALLOWED_ORIGINS must contain exact HTTP(S) origins: ${entry}`,
      );
    }

    origins.add(normalizedOrigin);
  }
  return origins;
};

let cachedValue: string | undefined;
let cachedOrigins = new Set<string>();

export const getMcpBetaAllowedOrigins = (): ReadonlySet<string> => {
  const value = process.env.MCP_BETA_ALLOWED_ORIGINS ?? "";
  if (value !== cachedValue) {
    cachedOrigins = parseMcpBetaAllowedOrigins(value);
    cachedValue = value;
  }
  return cachedOrigins;
};

/** Must run before global CORS so beta preflight is checked against this allowlist. */
export const enforceMcpBetaOrigin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  // Reject untrusted browser origins, including DNS-rebinding attempts.
  // Native clients may omit Origin.
  const origin = req.get("Origin");

  if (origin !== undefined) {
    const normalizedOrigin = normalizeHttpOrigin(origin);
    if (!normalizedOrigin) {
      res.status(403).send("Origin not allowed");
      return;
    }

    if (!getMcpBetaAllowedOrigins().has(normalizedOrigin)) {
      res.status(403).send("Origin not allowed");
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", normalizedOrigin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
    res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
};
