// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  openRouterDecisionsRequestSchema,
  type OpenRouterDecisionsRequest,
} from "./schemas";

export const OPENROUTER_DECISIONS_ENDPOINT =
  "https://openrouter.ai/api/alpha/decisions";
export const DEFAULT_OPENROUTER_TIMEOUT_MS = 30_000;
export const DEFAULT_OPENROUTER_MAX_RETRIES = 0;
export const MAX_OPENROUTER_RETRIES = 3;
const MAX_TIMEOUT_MS = 120_000;
const MAX_RETRY_AFTER_MS = 2_000;

export type OpenRouterErrorKind =
  | "configuration"
  | "authentication"
  | "credit"
  | "rate_limit"
  | "timeout"
  | "network"
  | "upstream"
  | "refusal"
  | "invalid_response";

export class OpenRouterDecisionsError extends Error {
  readonly kind: OpenRouterErrorKind;
  readonly status: number | undefined;
  readonly attempts: number;

  constructor(
    kind: OpenRouterErrorKind,
    message: string,
    options: { status?: number; attempts?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "OpenRouterDecisionsError";
    this.kind = kind;
    this.status = options.status;
    this.attempts = options.attempts ?? 0;
  }
}

export interface OpenRouterTransportOptions {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface OpenRouterTransportResult {
  data: unknown;
  attempts: number;
  durationMs: number;
}

function validateTransportOptions(options: OpenRouterTransportOptions): {
  apiKey: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
  sleep: (milliseconds: number) => Promise<void>;
} {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new OpenRouterDecisionsError(
      "configuration",
      "OPENROUTER_API_KEY is required for OpenRouter Decisions",
    );
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_OPENROUTER_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    throw new OpenRouterDecisionsError(
      "configuration",
      `timeoutMs must be an integer between 1 and ${MAX_TIMEOUT_MS}`,
    );
  }

  const maxRetries = options.maxRetries ?? DEFAULT_OPENROUTER_MAX_RETRIES;
  if (
    !Number.isInteger(maxRetries) ||
    maxRetries < 0 ||
    maxRetries > MAX_OPENROUTER_RETRIES
  ) {
    throw new OpenRouterDecisionsError(
      "configuration",
      `maxRetries must be an integer between 0 and ${MAX_OPENROUTER_RETRIES}`,
    );
  }

  return {
    apiKey: apiKey.trim(),
    fetchImpl: options.fetchImpl ?? fetch,
    timeoutMs,
    maxRetries,
    sleep:
      options.sleep ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds))),
  };
}

function classifyStatus(status: number): OpenRouterErrorKind {
  if (status === 401 || status === 403) return "authentication";
  if (status === 402) return "credit";
  if (status === 429) return "rate_limit";
  return "upstream";
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryAfterMs(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
    }
    const dateDelay = Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(dateDelay) && dateDelay >= 0) {
      return Math.min(dateDelay, MAX_RETRY_AFTER_MS);
    }
  }
  return Math.min(200 * 2 ** (attempt - 1), MAX_RETRY_AFTER_MS);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new OpenRouterDecisionsError(
      "invalid_response",
      "OpenRouter returned malformed JSON",
      { status: response.status, cause },
    );
  }
}

/** Submit a validated request with one bounded timeout per transport attempt. */
export async function submitOpenRouterDecision(
  input: OpenRouterDecisionsRequest,
  options: OpenRouterTransportOptions = {},
): Promise<OpenRouterTransportResult> {
  const parsedRequest = openRouterDecisionsRequestSchema.safeParse(input);
  if (!parsedRequest.success) {
    throw new OpenRouterDecisionsError(
      "configuration",
      "Invalid OpenRouter Decisions request",
    );
  }
  const config = validateTransportOptions(options);
  const body = {
    ...parsedRequest.data,
    provider: { allow_fallbacks: false as const },
  };
  const startedAt = Date.now();
  let attempts = 0;

  while (attempts <= config.maxRetries) {
    attempts += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await config.fetchImpl(OPENROUTER_DECISIONS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = new OpenRouterDecisionsError(
          classifyStatus(response.status),
          `OpenRouter request failed with HTTP ${response.status}`,
          { status: response.status, attempts },
        );
        if (isRetryableStatus(response.status) && attempts <= config.maxRetries) {
          const delay = retryAfterMs(response, attempts);
          clearTimeout(timeout);
          await config.sleep(delay);
          continue;
        }
        throw error;
      }

      const data = await readJson(response);
      return { data, attempts, durationMs: Date.now() - startedAt };
    } catch (error) {
      if (error instanceof OpenRouterDecisionsError) {
        if (error.attempts === 0) {
          throw new OpenRouterDecisionsError(error.kind, error.message, {
            ...(error.status === undefined ? {} : { status: error.status }),
            attempts,
            cause: error,
          });
        }
        throw error;
      }
      const timedOut = controller.signal.aborted;
      const kind = timedOut ? "timeout" : "network";
      const failure = new OpenRouterDecisionsError(
        kind,
        timedOut
          ? `OpenRouter request timed out after ${config.timeoutMs}ms`
          : "OpenRouter network request failed",
        { attempts },
      );
      if (attempts <= config.maxRetries) {
        clearTimeout(timeout);
        await config.sleep(Math.min(200 * 2 ** (attempts - 1), MAX_RETRY_AFTER_MS));
        continue;
      }
      throw failure;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new OpenRouterDecisionsError(
    "upstream",
    "OpenRouter request exhausted its retry limit",
    { attempts },
  );
}
