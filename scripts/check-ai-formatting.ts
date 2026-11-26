// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import dotenv from "dotenv";

import { initializeAiConfig } from "@/config/aiConfig";
import {
  errorFormatterSchema,
  type ErrorFormatterInput,
} from "@/schemas/errorFormatterSchemas";
import { errorFormatterService } from "@/services/errorFormatterService";

const syntheticInput: ErrorFormatterInput = {
  name: "Synthetic checkout timeout",
  description:
    "Synthetic request timed out after 250ms at tests/ai-formatting-check.spec.ts:12:3.",
};

export interface AiFormattingCheckDependencies {
  initialize?: () => Promise<unknown>;
  format?: (input: ErrorFormatterInput) => Promise<unknown>;
  writeSuccess?: (value: string) => void;
  writeFailure?: (value: string) => void;
}

export async function runAiFormattingCheck(
  dependencies: AiFormattingCheckDependencies = {},
): Promise<number> {
  dotenv.config();
  try {
    await (dependencies.initialize ?? initializeAiConfig)();
    const result = await (
      dependencies.format ?? errorFormatterService.formatErrorMessage
    )(syntheticInput);
    const parsed = errorFormatterSchema.safeParse(result);
    if (!parsed.success) {
      throw new Error("Synthetic formatting output did not match the schema");
    }

    (dependencies.writeSuccess ?? console.log)(
      JSON.stringify({ status: "ok", result: parsed.data }),
    );
    return 0;
  } catch {
    (dependencies.writeFailure ?? console.error)(
      "Synthetic AI formatting check failed. Review the safe backend diagnostic.",
    );
    return 1;
  }
}

const entrypoint = process.argv[1]?.split(/[\\/]/).at(-1);
if (
  entrypoint === "check-ai-formatting.ts" ||
  entrypoint === "check-ai-formatting.js"
) {
  void runAiFormattingCheck().then((exitCode) => {
    process.exitCode = exitCode;
  });
}
