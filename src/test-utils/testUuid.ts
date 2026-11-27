// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export function testUuid(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 0xffffffffffff) {
    throw new RangeError("Test UUID index must be an unsigned 48-bit integer");
  }

  return `00000000-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;
}
