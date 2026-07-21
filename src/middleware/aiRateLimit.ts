// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import type { Request } from "express";
import type { AuthenticatedRequest } from "@/middleware/authMiddleware";

const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const AI_RATE_LIMIT_MAX_REQUESTS = 20;

const aiRateLimitKey = (req: Request): string => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (userId) {
    return `user:${userId}`;
  }

  return req.ip ? `ip:${ipKeyGenerator(req.ip)}` : "unknown-client";
};

export const aiRateLimit = rateLimit({
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
  limit: AI_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: aiRateLimitKey,
  message: {
    error:
      "Too many AI requests. Please wait before requesting another AI analysis.",
  },
});

export const aiInsightsRateLimit = rateLimit({
  windowMs: AI_RATE_LIMIT_WINDOW_MS,
  limit: AI_RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: aiRateLimitKey,
  skip: (req) =>
    !(
      req.body &&
      typeof req.body === "object" &&
      "includeAiInsights" in req.body &&
      req.body.includeAiInsights === true
    ),
  message: {
    error:
      "Too many AI insight requests. Please wait before requesting another AI insight.",
  },
});
