// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

const singleLine = (value: string): boolean => !/[\r\n]/.test(value);

export const editableTestManagementKeySchema = z
  .string()
  .trim()
  .min(1, "Key must not be blank")
  .max(100, "Key must be no more than 100 characters")
  .refine(singleLine, "Key must be a single line")
  .nullable();

export const testManagementKeyFilterSchema = z
  .string()
  .trim()
  .min(1, "Key filter must not be blank")
  .max(100, "Key filter must be no more than 100 characters")
  .refine(singleLine, "Key filter must be a single line");
