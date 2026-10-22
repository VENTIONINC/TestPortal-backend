// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { HTTPClient, OpenRouter, type Fetcher } from "@openrouter/sdk";
import {
  ConnectionError,
  InvalidRequestError,
  RequestAbortedError,
  RequestTimeoutError,
  SDKValidationError,
  UnexpectedClientError,
} from "@openrouter/sdk/models/errors";

import {
  openRouterDecisionsRequestSchema,
  type OpenRouterDecisionsRequest,
} from "./schemas";

export const OPENROUTER_DECISIONS_ENDPOINT =
  "https://openrouter.ai/api/alpha/decisions";
export const DEFAULT_OPENROUTER_TIMEOUT_MS = 30_000;
export const DEFAULT_OPENROUTER_MAX_RETRIES = 0;
export const MAX_OPENROUTER_RETRIES = 3;
const OPENROUTER_DECISIONS_ORIGIN = "https://openrouter.ai";
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

interface TransportConfig {
  apiKey: string;
  fetchImpl: typeof fetch;
  timeoutMs: number;
  maxRetries: number;
  sleep: (milliseconds: number) => Promise<void>;
}

function validateTransportOptions(
  options: OpenRouterTransportOptions,
): TransportConfig {
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

function retryDelayMs(retryAfter: string | null, attempt: number): number {
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

function mapSdkFailure(
  failure: unknown,
  attempts: number,
  timedOut: boolean,
): OpenRouterDecisionsError {
  if (failure instanceof InvalidRequestError || failure instanceof SDKValidationError) {
    return new OpenRouterDecisionsError(
      "configuration",
      "OpenRouter Decisions rejected the request configuration",
      { attempts },
    );
  }
  if (
    timedOut ||
    failure instanceof RequestTimeoutError ||
    failure instanceof RequestAbortedError
  ) {
    return new OpenRouterDecisionsError(
      "timeout",
      "OpenRouter request timed out",
      { attempts },
    );
  }
  if (failure instanceof ConnectionError || failure instanceof UnexpectedClientError) {
    return new OpenRouterDecisionsError(
      "network",
      "OpenRouter network request failed",
      { attempts },
    );
  }
  return new OpenRouterDecisionsError(
    attempts === 0 ? "configuration" : "upstream",
    attempts === 0
      ? "OpenRouter Decisions rejected the request configuration"
      : "OpenRouter request failed",
    { attempts },
  );
}

async function parseCapturedSuccess(
  response: Response,
  attempts: number,
): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new OpenRouterDecisionsError(
      "invalid_response",
      "OpenRouter returned malformed JSON",
      { attempts, status: response.status },
    );
  }
}

/** Submit through the SDK while keeping application retry and response policy local. */
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
  const request = {
    ...parsedRequest.data,
    provider: { allowFallbacks: false },
  };
  const startedAt = Date.now();
  let attempts = 0;

  while (attempts <= config.maxRetries) {
    let capturedResponse: Response | undefined;
    let retryAfter: string | null = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    const httpClient = new HTTPClient({
      fetcher: ((input, init) => config.fetchImpl(input, init)) as Fetcher,
    });
    httpClient.addHook("beforeRequest", () => {
      attempts += 1;
    });
    httpClient.addHook("response", (response) => {
      capturedResponse = response.clone();
      retryAfter = response.headers.get("retry-after");
    });

    try {
      const client = new OpenRouter({
        apiKey: config.apiKey,
        httpClient,
        retryConfig: { strategy: "none" },
      });
      await client.alpha.decisions.create(
        { decisionsRequest: request },
        {
          serverURL: OPENROUTER_DECISIONS_ORIGIN,
          retries: { strategy: "none" },
          retryCodes: [],
          signal: controller.signal,
        },
      );

      if (!capturedResponse) {
        throw new OpenRouterDecisionsError(
          "upstream",
          "OpenRouter request completed without a captured response",
          { attempts },
        );
      }

      const status = capturedResponse.status;
      if (status < 200 || status >= 300) {
        throw new OpenRouterDecisionsError(
          classifyStatus(status),
          `OpenRouter request failed with HTTP ${status}`,
          { status, attempts },
        );
      }

      if (controller.signal.aborted) {
        throw new OpenRouterDecisionsError(
          "timeout",
          `OpenRouter request timed out after ${config.timeoutMs}ms`,
          { status, attempts },
        );
      }

      const data = await parseCapturedSuccess(capturedResponse, attempts);
      return { data, attempts, durationMs: Date.now() - startedAt };
    } catch (error) {
      let failure: OpenRouterDecisionsError;
      if (error instanceof OpenRouterDecisionsError) {
        failure = error;
      } else if (
        capturedResponse &&
        capturedResponse.status >= 200 &&
        capturedResponse.status < 300
      ) {
        if (controller.signal.aborted) {
          failure = new OpenRouterDecisionsError(
            "timeout",
            `OpenRouter request timed out after ${config.timeoutMs}ms`,
            { status: capturedResponse.status, attempts },
          );
        } else {
          const data = await parseCapturedSuccess(capturedResponse, attempts);
          return { data, attempts, durationMs: Date.now() - startedAt };
        }
      } else if (capturedResponse) {
        const status = capturedResponse.status;
        failure = new OpenRouterDecisionsError(
          classifyStatus(status),
          `OpenRouter request failed with HTTP ${status}`,
          { status, attempts },
        );
      } else {
        failure = mapSdkFailure(error, attempts, controller.signal.aborted);
      }

      const retryableStatus =
        failure.status !== undefined &&
        (failure.kind === "rate_limit" || failure.kind === "upstream") &&
        isRetryableStatus(failure.status);
      if (
        (failure.kind === "network" ||
          failure.kind === "timeout" ||
          retryableStatus) &&
        attempts <= config.maxRetries
      ) {
        clearTimeout(timeout);
        await config.sleep(
          retryDelayMs(retryableStatus ? retryAfter : null, attempts),
        );
        continue;
      }
      throw failure;
    } finally {
      clearTimeout(timeout);
      if (capturedResponse?.body && !capturedResponse.bodyUsed) {
        await capturedResponse.body.cancel().catch(() => undefined);
      }
    }
  }

  throw new OpenRouterDecisionsError(
    "upstream",
    "OpenRouter request exhausted its retry limit",
    { attempts },
  );
}
