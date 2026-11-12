// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
import { createHash } from "node:crypto";
import {
  hashTestScenarioMarkdown,
  renderTestScenarioMarkdown,
  TEST_SCENARIO_MARKDOWN_FORMAT_VERSION,
} from "@/lib/testScenarioMarkdown";

describe("test scenario Markdown projection", () => {
  it("renders every authored section in a deterministic order", () => {
    const content = renderTestScenarioMarkdown({
      title: "Login # flow!",
      details: "Details\r\nwith two lines",
      priority: "medium",
      relatedIssueUrl: "https://example.test/issue/20",
      preconditions: "User exists",
      testData: "email@example.com",
      steps: [
        {
          action: "Open page\r\nChoose account",
          expectedResult: "Page is visible",
        },
      ],

    });

    expect(content).toBe(
      "# Login \\# flow\\!\n\n" +
        "## Details\nDetails\nwith two lines\n\n" +
        "## Priority\nMedium\n\n" +
        "## Related issue URL\nhttps://example.test/issue/20\n\n" +
        "## Test setup\n### Preconditions\nUser exists\n### Test data\nemail@example.com\n\n" +
        "## Steps\n### Step 1\nOpen page\nChoose account\n**Expected result:**\nPage is visible\n",
    );
    expect(content).not.toContain("\r");
    expect(content.endsWith("\n")).toBe(true);
    expect(content.endsWith("\n\n")).toBe(false);
    expect(content.indexOf("## Details")).toBeLessThan(content.indexOf("## Test setup"));
    expect(content.indexOf("## Test setup")).toBeLessThan(content.indexOf("## Steps"));
    expect(content).not.toMatch(/## (Objective|Expected Result|Notes)/);
    expect(TEST_SCENARIO_MARKDOWN_FORMAT_VERSION).toBe(1);
  });

  it("represents an empty step collection and omits null sections", () => {
    expect(
      renderTestScenarioMarkdown({
        title: "Empty",
        details: null,
        priority: null,
        relatedIssueUrl: null,
        preconditions: null,
        testData: null,
        steps: [],

      }),
    ).toBe("# Empty\n\n## Steps\n_No steps defined._\n");
  });

  it("hashes exact UTF-8 projection bytes", () => {
    const content = "# ✓\n";
    expect(hashTestScenarioMarkdown(content)).toBe(
      createHash("sha256").update(content, "utf8").digest("hex"),
    );
    expect(hashTestScenarioMarkdown(content)).toBe(hashTestScenarioMarkdown(content));
    expect(hashTestScenarioMarkdown(content)).not.toBe(hashTestScenarioMarkdown(`${content}\n`));
  });

  it("generates TP-20 metadata and Test setup before steps without obsolete sections", () => {
    const source = {
      title: "TP-20", details: "Useful details", priority: "high" as const,
      relatedIssueUrl: "https://example.test/issue/20", preconditions: "Ready",
      testData: "Input", steps: [{ action: "Run", expectedResult: "Works" }],
      objective: "legacy", expectedResult: "legacy", notes: "legacy",
    };
    const content = renderTestScenarioMarkdown(source);
    expect(content).toContain("## Priority\nHigh");
    expect(content).toContain("## Related issue URL\nhttps://example.test/issue/20");
    expect(content).toContain("## Test setup\n### Preconditions\nReady\n### Test data\nInput");
    expect(content.indexOf("## Test setup")).toBeLessThan(content.indexOf("## Steps"));
    expect(content).toContain("**Expected result:**\nWorks");
    expect(content).not.toMatch(/## (Objective|Expected Result|Notes)/);
  });

});
