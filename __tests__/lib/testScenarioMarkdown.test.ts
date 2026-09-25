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
      objective: "Verify Unicode ✓",
      preconditions: "User exists",
      testData: "email@example.com",
      steps: [
        {
          action: "Open page\r\nChoose account",
          expectedResult: "Page is visible",
        },
      ],
      expectedResult: "Dashboard loads",
      notes: "Keep the code fence:\n```ts\nconst ok = true;\n```",
    });

    expect(content).toBe(
      "# Login \\# flow\\!\n\n" +
        "## Details\nDetails\nwith two lines\n\n" +
        "## Objective\nVerify Unicode ✓\n\n" +
        "## Preconditions\nUser exists\n\n" +
        "## Test Data\nemail@example.com\n\n" +
        "## Steps\n### Step 1\nOpen page\nChoose account\n**Expected result:**\nPage is visible\n\n" +
        "## Expected Result\nDashboard loads\n\n" +
        "## Notes\nKeep the code fence:\n```ts\nconst ok = true;\n```\n",
    );
    expect(content).not.toContain("\r");
    expect(content.endsWith("\n")).toBe(true);
    expect(content.endsWith("\n\n")).toBe(false);
    expect(content.indexOf("## Details")).toBeLessThan(content.indexOf("## Objective"));
    expect(content.indexOf("## Objective")).toBeLessThan(content.indexOf("## Steps"));
    expect(content.indexOf("## Steps")).toBeLessThan(content.indexOf("## Expected Result"));
    expect(TEST_SCENARIO_MARKDOWN_FORMAT_VERSION).toBe(1);
  });

  it("represents an empty step collection and omits null sections", () => {
    expect(
      renderTestScenarioMarkdown({
        title: "Empty",
        details: null,
        objective: null,
        preconditions: null,
        testData: null,
        steps: [],
        expectedResult: null,
        notes: null,
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
});
