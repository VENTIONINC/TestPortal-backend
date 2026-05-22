// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z as baseZ } from "zod";

extendZodWithOpenApi(baseZ);

export const z = baseZ;
export type ZodWithOpenApi = typeof z;
