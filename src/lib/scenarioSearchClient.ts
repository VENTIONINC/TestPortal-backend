// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";

const relatedMatchesSchema = z
  .array(
    z
      .object({
        scenarioId: z.string().uuid(),
        revision: z.number().int().positive(),
        excerpt: z.string().min(1).max(400),
      })
      .strict(),
  )
  .max(10);

export type RelatedScenarioMatch = z.infer<typeof relatedMatchesSchema>[number];

export class ScenarioSearchUnavailableError extends Error {
  constructor(cause: unknown) {
    super("Scenario search is unavailable", { cause });
    this.name = "ScenarioSearchUnavailableError";
  }
}

export const scenarioSearchClient = {
  async related(
    projectId: string,
    sourceScenarioId: string,
  ): Promise<RelatedScenarioMatch[]> {
    try {
      const baseUrl = process.env.SCENARIO_SEARCH_URL;
      const token = process.env.SCENARIO_SEARCH_TOKEN;
      if (!baseUrl || !token)
        throw new Error("Scenario search is not configured");

      const url = new URL("/internal/v1/scenarios/related", baseUrl);
      if (url.protocol !== "https:" || url.username || url.password) {
        throw new Error("Scenario search requires a credential-free HTTPS URL");
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId, sourceScenarioId }),
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`Search service returned HTTP ${response.status}`);
      }
      return relatedMatchesSchema.parse(await response.json());
    } catch (error) {
      throw new ScenarioSearchUnavailableError(error);
    }
  },
};
