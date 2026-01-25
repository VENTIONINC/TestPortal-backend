import type { TestCase } from "../types";
import { makeCaseBase, pick } from "../util";

export function scriptSelectorNotFound(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "script: selector not found",
    errorMessage: pick(i, [
      "Error: No node found for selector: #submit",
      'Error: strict mode violation, selector ".profile" resolved to 0 elements',
      'Error: waiting for selector "#login" failed: timeout',
    ]),
    errorStack: pick(i, [
      "at Page.click (playwright:112:17)",
      "at LoginPage.submit (e2e/login.spec.ts:71:9)",
      "at ProfilePage.open (e2e/profile.spec.ts:44:6)",
    ]),
    errorLocation: pick(i, [
      "e2e/login.spec.ts:71:9",
      "e2e/profile.spec.ts:44:6",
      "e2e/auth.spec.ts:33:5",
    ]),
    analysisCategory: "script",
    analysisConfidence: 4,
    analysisConclusion:
      "Selector failures indicate UI changes or timing issues in test scripts.",
    errorQuality: 3,
    errorQualityConclusion:
      "Error identifies the missing selector and execution location.",
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["script", "selector"],
    input: base.input,
    expect: {
      minLength: 80,
      minSteps: 2,
    },
  };
}
