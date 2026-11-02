// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import type { Spec } from "@prisma/client";
import { specModel } from "@/models/specModel";
import {
  normalizeJsonStringArray,
  normalizeJsonUnknownArray,
} from "@/lib/jsonPayloads";
import type { StructuredSpec } from "@/types";

export interface ListSpecsInput {
  projectId: string;
  search?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}

export interface ListSpecsResponse {
  projectId: string;
  specs: Array<
    Omit<Spec, "tags" | "annotations"> & {
      tags: string[];
      annotations: unknown[];
    }
  >;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const specService = {
  async listSpecs(input: ListSpecsInput): Promise<ListSpecsResponse> {
    if (!input.projectId) throw new Error("Project ID is required");
    const page = input.page === undefined ? 1 : input.page;
    const limit = input.limit === undefined ? 30 : input.limit;
    if (!Number.isInteger(page) || page < 1)
      throw new Error("page must be a positive integer");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new Error("limit must be a positive integer no greater than 100");
    const search = input.search?.trim();
    const filter = {
      projectId: input.projectId,
      ...(search ? { search } : {}),
    };
    const [specs, total] = await Promise.all([
      specModel.list(filter, page, limit),
      specModel.count(filter),
    ]);
    return {
      projectId: input.projectId,
      specs: specs.map((spec) => ({
        ...spec,
        tags: normalizeJsonStringArray(spec.tags),
        annotations: normalizeJsonUnknownArray(spec.annotations),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getSpecById(
    specId: string,
    projectId: string,
  ): Promise<StructuredSpec> {
    if (!specId) {
      throw new Error("Spec ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const spec = await specModel.findById(specId, projectId);

    if (!spec) {
      throw new Error(`Spec with ID ${specId} not found`);
    }

    return {
      ...spec,
      tags: normalizeJsonStringArray(spec.tags),
      annotations: normalizeJsonUnknownArray(spec.annotations),
    };
  },

  async deleteSpec(specId: string, projectId: string): Promise<void> {
    if (!specId) {
      throw new Error("Spec ID is required");
    }

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    await specModel.delete(specId, projectId);
  },
};
