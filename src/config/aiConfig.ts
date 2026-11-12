// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { aiConfigSchema, type AiConfig } from "@/config/aiConfigSchema";
import { ROOT_DIR } from "@/root/path.config.js";

export type { AiOperationName } from "@/config/aiConfigSchema";

export const CANONICAL_OPENAI_BASE_URL = "https://api.openai.com/v1";

export interface AiConfigEnvironment {
  AI_API_BASE_URL?: string;
  AI_CONFIG_PATH?: string;
  OPENAI_API_KEY?: string;
}

export interface AiConnection {
  baseUrl: string;
  connectionLabel: "openai" | "custom";
}

export interface AiConfigSnapshot {
  connection: Readonly<AiConnection>;
  operations: AiConfig["operations"];
}

type ConfigFilePath = string | URL;

export interface AiConfigStoreDependencies {
  env?: () => AiConfigEnvironment;
  cwd?: () => string;
  readFile?: (path: ConfigFilePath, encoding: "utf8") => Promise<string>;
  defaultConfigPath?: ConfigFilePath;
}

export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

const privateApiKeys = new WeakMap<AiConfigSnapshot, string>();

export function getAiApiKeyForClient(
  snapshot: AiConfigSnapshot,
): string | undefined {
  return privateApiKeys.get(snapshot);
}

export function normalizeAiBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new AiConfigurationError(
      "AI_API_BASE_URL must be a valid HTTP or HTTPS URL.",
    );
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new AiConfigurationError(
      "AI_API_BASE_URL must use HTTP or HTTPS and cannot include credentials, a query, or a fragment.",
    );
  }

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  const normalized = url.toString();
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const nested of Object.values(value)) {
      deepFreeze(nested);
    }
  }
  return value;
}

function safeSchemaMessage(error: { issues: Array<{ path: PropertyKey[] }> }) {
  const locations = Array.from(
    new Set(
      error.issues.map((issue) =>
        issue.path.length > 0 ? issue.path.map(String).join(".") : "root",
      ),
    ),
  );
  return `AI configuration is invalid at ${locations.join(", ")}. Check the documented version 1 settings.`;
}

export function createAiConfigStore(
  dependencies: AiConfigStoreDependencies = {},
) {
  const read = dependencies.readFile ?? readFile;
  const getEnvironment = dependencies.env ?? (() => process.env);
  let initialization: Promise<AiConfigSnapshot> | undefined;
  let snapshot: AiConfigSnapshot | undefined;

  const load = async (): Promise<AiConfigSnapshot> => {
    const env = getEnvironment();
    const baseUrl = normalizeAiBaseUrl(
      env.AI_API_BASE_URL ?? CANONICAL_OPENAI_BASE_URL,
    );
    const selectedPath = env.AI_CONFIG_PATH;
    const configPath: ConfigFilePath = selectedPath
      ? resolve(dependencies.cwd?.() ?? process.cwd(), selectedPath)
      : (dependencies.defaultConfigPath ??
        resolve(ROOT_DIR, "src/config/ai-config.default.json"));

    let contents: string;
    try {
      contents = await read(configPath, "utf8");
    } catch {
      throw new AiConfigurationError(
        selectedPath
          ? "Could not read the file selected by AI_CONFIG_PATH. Check that it exists and is readable."
          : "Could not read the packaged default AI configuration. Verify the backend build includes ai-config.default.json.",
      );
    }

    let json: unknown;
    try {
      json = JSON.parse(contents);
    } catch {
      throw new AiConfigurationError(
        "The selected AI configuration is not valid JSON. Correct the file and restart the backend.",
      );
    }

    const parsed = aiConfigSchema.safeParse(json);
    if (!parsed.success) {
      throw new AiConfigurationError(safeSchemaMessage(parsed.error));
    }

    const connection: AiConnection = {
      baseUrl,
      connectionLabel:
        baseUrl === CANONICAL_OPENAI_BASE_URL ? "openai" : "custom",
    };
    const loadedSnapshot = deepFreeze({
      connection,
      operations: parsed.data.operations,
    });
    if (env.OPENAI_API_KEY) {
      privateApiKeys.set(loadedSnapshot, env.OPENAI_API_KEY);
    }
    return loadedSnapshot;
  };

  return {
    initialize(): Promise<AiConfigSnapshot> {
      initialization ??= load().then((loaded) => {
        snapshot = loaded;
        return loaded;
      });
      return initialization;
    },
    getSnapshot(): AiConfigSnapshot {
      if (!snapshot) {
        throw new AiConfigurationError(
          "AI configuration has not been initialized. Initialize it during backend startup before acquiring an AI client.",
        );
      }
      return snapshot;
    },
  };
}

const aiConfigStore = createAiConfigStore();

export const initializeAiConfig = () => aiConfigStore.initialize();
export const getAiConfigSnapshot = () => aiConfigStore.getSnapshot();
