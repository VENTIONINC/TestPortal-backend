// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  getAiApiKeyForClient,
  getAiConfigSnapshot,
  type AiConfigSnapshot,
} from "@/config/aiConfig";
import {
  GenerativeAiError,
  safeModelIdentifier,
  type AiFailureCategory,
} from "@/lib/generativeAi";

export const DECISIONS_REQUEST_TIMEOUT_MS = 30_000;

export interface DecisionsChoice {
  value: string;
  description: string;
}

export interface DecisionsChoiceQuestion {
  type: "choice";
  name: string;
  instructions: string;
  choices: DecisionsChoice[];
}

export interface DecisionsRequestInput {
  input: string;
  questions: DecisionsChoiceQuestion[];
}

export function buildDecisionsEndpoint(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/decisions`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeFailure(
  category: AiFailureCategory,
  snapshot: AiConfigSnapshot,
  requestedModel: string,
): GenerativeAiError {
  const safeRequestedModel = safeModelIdentifier(requestedModel);
  return new GenerativeAiError({
    category,
    connection: snapshot.connection.connectionLabel,
    ...(safeRequestedModel ? { requestedModel: safeRequestedModel } : {}),
  });
}

function isTimeoutError(error: unknown): boolean {
  if (!isRecord(error)) return false;
  return (
    error.name === "AbortError" ||
    error.name === "TimeoutError" ||
    error.code === "ETIMEDOUT" ||
    error.code === "UND_ERR_CONNECT_TIMEOUT" ||
    error.code === "ECONNRESET" ||
    error.code === "ECONNREFUSED"
  );
}

function categoryForStatus(status: number): AiFailureCategory {
  if (status === 401 || status === 402 || status === 403) {
    return "authentication/configuration";
  }
  if (status === 429) return "rate-limit";
  if (status === 400 || status === 404 || status === 422) {
    return "invalid-response";
  }
  if (status === 408 || status === 504 || status >= 500) {
    return "unavailable/timeout";
  }
  return "unknown";
}

/** Submit one native Decisions request through the configured shared connection. */
export async function submitDecisionsRequest(
  request: DecisionsRequestInput,
  snapshot: AiConfigSnapshot = getAiConfigSnapshot(),
): Promise<unknown> {
  const model = snapshot.operations.classification.decisions?.model;
  if (snapshot.classificationStrategy !== "decisions" || !model) {
    throw safeFailure("authentication/configuration", snapshot, "");
  }

  const apiKey = getAiApiKeyForClient(snapshot);
  if (!apiKey) {
    const safeRequestedModel = safeModelIdentifier(model);
    throw new GenerativeAiError({
      category: "authentication/configuration",
      connection: snapshot.connection.connectionLabel,
      configurationSetting: "OPENAI_API_KEY",
      ...(safeRequestedModel ? { requestedModel: safeRequestedModel } : {}),
    });
  }

  const payload = {
    model,
    input: request.input,
    questions: request.questions,
  };

  let response: Response;
  try {
    response = await fetch(
      buildDecisionsEndpoint(snapshot.connection.baseUrl),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
        redirect: "error",
        signal: AbortSignal.timeout(DECISIONS_REQUEST_TIMEOUT_MS),
      },
    );
  } catch (error) {
    throw safeFailure(
      isTimeoutError(error) ? "unavailable/timeout" : "unknown",
      snapshot,
      model,
    );
  }

  if (!response.ok) {
    throw safeFailure(categoryForStatus(response.status), snapshot, model);
  }

  try {
    return await response.json();
  } catch {
    throw safeFailure("invalid-response", snapshot, model);
  }
}
