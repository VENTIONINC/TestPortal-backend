import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z as baseZ } from "zod";

extendZodWithOpenApi(baseZ);

export const z = baseZ;
export type ZodWithOpenApi = typeof z;
