import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

const TOKEN_HEADER = "x-support-token";

function constantTimeEquals(a: string, b: string): boolean {
  const expected = Buffer.from(a, "utf8");
  const provided = Buffer.from(b, "utf8");
  const sameLength = expected.length === provided.length;
  const safeBuffer = sameLength ? provided : Buffer.alloc(expected.length);
  const match = crypto.timingSafeEqual(expected, safeBuffer);
  return match && sameLength;
}

export function isSupportTokenConfigured(): boolean {
  return Boolean(process.env.SUPPORT_META_TOKEN);
}

export function supportTokenAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.SUPPORT_META_TOKEN;

  if (!expected) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const provided = req.get(TOKEN_HEADER) ?? "";
  const isValid = provided.length > 0 && constantTimeEquals(expected, provided);

  if (!isValid) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
