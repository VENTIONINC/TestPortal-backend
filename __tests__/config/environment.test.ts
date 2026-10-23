// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { resolveDecisionsConfiguration } from "@/config/environment";

describe("resolveDecisionsConfiguration", () => {
  it.each([undefined, "false", " FALSE ", " false\t"]) (
    "disables Decisions for %s",
    (flag) => expect(resolveDecisionsConfiguration(flag, undefined)).toEqual({ enabled: false, apiKey: "" }),
  );

  it.each(["true", " TRUE ", " true\t"]) ("normalizes enabled flag %s", (flag) => {
    expect(resolveDecisionsConfiguration(flag, " key ")).toEqual({ enabled: true, apiKey: "key" });
  });

  it.each(["", " \t", "yes", "1", "enabled"]) ("rejects invalid flag %j without echoing it", (flag) => {
    expect(() => resolveDecisionsConfiguration(flag, "secret-value")).toThrow(
      "USE_DECISIONS_API must be true or false.",
    );
  });

  it.each([undefined, "", " \t"]) ("requires a nonblank key when enabled", (apiKey) => {
    expect(() => resolveDecisionsConfiguration("true", apiKey)).toThrow(
      "OPENROUTER_API_KEY is required when USE_DECISIONS_API is true.",
    );
  });
});
