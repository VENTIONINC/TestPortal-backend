// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import { decodeTestPortalExtension } from "@/lib/ctrfTestPortalExtension";

describe("decodeTestPortalExtension", () => {
  it("decodes ordered error identity and valid diagnostics", () => {
    expect(decodeTestPortalExtension({
      testPortal: {
        version: 1,
        errors: [
          { index: 1, message: "second", stack: "two", generatedTestCase: "generated" },
          { index: 0, message: "first", rawLogs: ["log"], sourceSnippet: { path: "a.ts", text: "bad()", startLine: 4, failingLine: 4 } },
        ],
      },
    })).toEqual([
      { index: 0, message: "first", rawLogs: ["log"], sourceSnippet: { path: "a.ts", text: "bad()", startLine: 4, failingLine: 4 } },
      { index: 1, message: "second", stack: "two", generatedTestCase: "generated" },
    ]);
  });

  it("drops malformed optional fields independently", () => {
    expect(decodeTestPortalExtension({ testPortal: { version: 1, errors: [{ index: 0, message: "valid", rawLogs: ["ok", 1], sourceSnippet: { path: "a", text: "x", startLine: 0, failingLine: 1 }, generatedTestCase: "valid" }] } })).toEqual([
      { index: 0, message: "valid", generatedTestCase: "valid" },
    ]);
  });

  it.each([undefined, null, {}, { testPortal: { version: 2, errors: [] } }])(
    "safely ignores missing, malformed, or unsupported data",
    (value) => expect(decodeTestPortalExtension(value)).toEqual([]),
  );
});
