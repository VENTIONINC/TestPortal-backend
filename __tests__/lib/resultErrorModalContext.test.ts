// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

import {
  RESULT_ERROR_MODAL_CONTEXT_LIMITS,
  normalizeGeneratedTestCase,
  normalizeResultErrorLogs,
  normalizeResultErrorModalContext,
  normalizeResultErrorSourceSnippet,
} from "@/lib/resultErrorModalContext";

describe("resultErrorModalContext", () => {
  describe("normalizeResultErrorLogs", () => {
    it("accepts string and string array inputs within the byte limit", () => {
      expect(normalizeResultErrorLogs("browser started")).toEqual([
        "browser started",
      ]);
      expect(normalizeResultErrorLogs(["first", "second"])).toEqual([
        "first",
        "second",
      ]);
    });

    it("drops empty and blank-only log payloads", () => {
      expect(normalizeResultErrorLogs("")).toBeNull();
      expect(normalizeResultErrorLogs([])).toBeNull();
      expect(normalizeResultErrorLogs([""])).toBeNull();
      expect(normalizeResultErrorLogs(["", ""])).toBeNull();
    });

    it("rejects invalid shapes and oversized joined payloads", () => {
      expect(normalizeResultErrorLogs(["valid", 1])).toBeNull();
      expect(
        normalizeResultErrorLogs("x".repeat(RESULT_ERROR_MODAL_CONTEXT_LIMITS.rawLogsBytes + 1)),
      ).toBeNull();
      expect(
        normalizeResultErrorLogs([
          "x".repeat(RESULT_ERROR_MODAL_CONTEXT_LIMITS.rawLogsBytes),
          "overflow",
        ]),
      ).toBeNull();
    });

    it("accepts payloads at the exact byte boundary", () => {
      const logs = ["x".repeat(RESULT_ERROR_MODAL_CONTEXT_LIMITS.rawLogsBytes)];
      expect(normalizeResultErrorLogs(logs)).toEqual(logs);
    });
  });

  describe("normalizeResultErrorSourceSnippet", () => {
    const validSnippet = {
      path: "checkout.spec.ts",
      text: "await checkout.open();\nawait submit.click();",
      startLine: 10,
      failingLine: 11,
    };

    it("accepts a valid snippet", () => {
      expect(normalizeResultErrorSourceSnippet(validSnippet)).toEqual(
        validSnippet,
      );
    });

    it("strips ANSI formatting while preserving snippet metadata and lines", () => {
      expect(
        normalizeResultErrorSourceSnippet({
          path: "/function/api/buildings.request.ts",
          text:
            "\u001b[0m \u001b[90m45 |\u001b[39m if (!building) {\n\u001b[90m46 |\u001b[39m console.log(building);\n\u001b[31m\u001b[1m>\u001b[22m\u001b[39m \u001b[90m47 |\u001b[39m throw new Error('not found');",
          startLine: 45,
          failingLine: 47,
        }),
      ).toEqual({
        path: "/function/api/buildings.request.ts",
        text:
          " 45 | if (!building) {\n46 | console.log(building);\n> 47 | throw new Error('not found');",
        startLine: 45,
        failingLine: 47,
      });
    });

    it("strips OSC hyperlinks terminated by BEL and ST", () => {
      expect(
        normalizeResultErrorSourceSnippet({
          path: "checkout.spec.ts",
          text:
            "await expect(\u001b]8;;https://example.test\u0007link\u001b]8;;\u0007).toBeVisible();\nconst next = \u001b]8;;https://example.test\u001b\\link\u001b]8;;\u001b\\;",
          startLine: 1,
          failingLine: 2,
        }),
      ).toEqual({
        path: "checkout.spec.ts",
        text: "await expect(link).toBeVisible();\nconst next = link;",
        startLine: 1,
        failingLine: 2,
      });
    });

    it("applies the byte limit to cleaned snippet text", () => {
      expect(
        normalizeResultErrorSourceSnippet({
          path: "checkout.spec.ts",
          text: `${"\u001b[31m".repeat(
            RESULT_ERROR_MODAL_CONTEXT_LIMITS.sourceSnippetBytes,
          )}await submit.click();`,
          startLine: 1,
          failingLine: 1,
        }),
      ).toEqual({
        path: "checkout.spec.ts",
        text: "await submit.click();",
        startLine: 1,
        failingLine: 1,
      });
    });

    it("rejects failingLine values outside the represented line range", () => {
      expect(
        normalizeResultErrorSourceSnippet({
          ...validSnippet,
          text: "line 10\nline 11\nline 12\n",
          failingLine: 13,
        }),
      ).toBeNull();
      expect(
        normalizeResultErrorSourceSnippet({
          ...validSnippet,
          failingLine: 9,
        }),
      ).toBeNull();
    });

    it("still accepts failingLine on the last real line when text ends with a newline", () => {
      expect(
        normalizeResultErrorSourceSnippet({
          path: "checkout.spec.ts",
          text: "line 10\nline 11\nline 12\n",
          startLine: 10,
          failingLine: 12,
        }),
      ).toEqual({
        path: "checkout.spec.ts",
        text: "line 10\nline 11\nline 12\n",
        startLine: 10,
        failingLine: 12,
      });
    });

    it("rejects invalid shapes and oversized fields", () => {
      expect(normalizeResultErrorSourceSnippet(null)).toBeNull();
      expect(normalizeResultErrorSourceSnippet([])).toBeNull();
      expect(
        normalizeResultErrorSourceSnippet({
          ...validSnippet,
          path: "x".repeat(RESULT_ERROR_MODAL_CONTEXT_LIMITS.pathBytes + 1),
        }),
      ).toBeNull();
      expect(
        normalizeResultErrorSourceSnippet({
          ...validSnippet,
          text: "x".repeat(
            RESULT_ERROR_MODAL_CONTEXT_LIMITS.sourceSnippetBytes + 1,
          ),
        }),
      ).toBeNull();
    });
  });

  describe("normalizeGeneratedTestCase", () => {
    it("accepts non-empty strings within the byte limit", () => {
      expect(
        normalizeGeneratedTestCase("test('checkout', async () => {});"),
      ).toBe("test('checkout', async () => {});");
    });

    it("rejects empty and oversized values", () => {
      expect(normalizeGeneratedTestCase("")).toBeNull();
      expect(
        normalizeGeneratedTestCase(
          "x".repeat(RESULT_ERROR_MODAL_CONTEXT_LIMITS.generatedTestCaseBytes + 1),
        ),
      ).toBeNull();
      expect(normalizeGeneratedTestCase(123)).toBeNull();
    });
  });

  describe("normalizeResultErrorModalContext", () => {
    it("normalizes each field independently", () => {
      expect(
        normalizeResultErrorModalContext({
          logs: ["browser started"],
          sourceSnippet: {
            path: "checkout.spec.ts",
            text: "await submit.click();",
            startLine: 12,
            failingLine: 12,
          },
          generatedTestCase: "test('checkout', async () => {});",
        }),
      ).toEqual({
        rawLogs: ["browser started"],
        sourceSnippet: {
          path: "checkout.spec.ts",
          text: "await submit.click();",
          startLine: 12,
          failingLine: 12,
        },
        generatedTestCase: "test('checkout', async () => {});",
      });
    });

    it("drops only invalid fields", () => {
      expect(
        normalizeResultErrorModalContext({
          logs: "",
          sourceSnippet: {
            path: "checkout.spec.ts",
            text: "await submit.click();",
            startLine: 12,
            failingLine: 11,
          },
          generatedTestCase: "test('still retained', () => {});",
        }),
      ).toEqual({
        rawLogs: null,
        sourceSnippet: null,
        generatedTestCase: "test('still retained', () => {});",
      });
    });
  });
});
