// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { hasOpenAiCredentials } from "../testEnv";
import { runDatasetEvaluation } from "./runners/dataset-evaluation";
import { PROMPT_VERSIONS } from "./runners/versions";

(hasOpenAiCredentials ? describe : describe.skip)("Stored-results analysis smoke", () => {
  jest.setTimeout(120_000);
  it.each(Object.values(PROMPT_VERSIONS))(
    "satisfies $version expectations",
    async (version) => {
      const { failures } = await runDatasetEvaluation(version, "smoke");
      expect(failures).toEqual([]);
    },
  );
});
