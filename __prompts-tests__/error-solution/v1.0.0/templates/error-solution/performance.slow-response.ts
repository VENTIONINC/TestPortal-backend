import type { TestCase } from "../types";
import { makeCaseBase, pick } from "../util";

export function performanceSlowResponse(i: number): TestCase {
  const base = makeCaseBase(i, {
    name: "performance: slow response",
    errorMessage: pick(i, [
      'Timeout 12000ms exceeded while waiting for selector "#checkout"',
      "Request timed out after 15000ms while loading /api/orders",
      "Performance budget exceeded: LCP 7800ms",
    ]),
    errorStack: pick(i, [
      "at CheckoutPage.waitForCheckout (e2e/checkout.spec.ts:88:14)",
      "at OrdersApi.fetchOrders (api/orders.spec.ts:55:9)",
      "at PerfBudget.assertLcp (e2e/perf.spec.ts:34:7)",
    ]),
    errorLocation: pick(i, [
      "e2e/checkout.spec.ts:88:14",
      "api/orders.spec.ts:55:9",
      "e2e/perf.spec.ts:34:7",
    ]),
    analysisCategory: "performance",
    analysisConfidence: 3,
    analysisConclusion:
      "Timeouts and budget violations point to potential performance regressions or slow dependencies.",
    errorQuality: 3,
    errorQualityConclusion:
      "Error contains timing details and a clear location for investigation.",
  });

  return {
    name: `${base.name} #${i}`,
    tags: ["performance", "timeout"],
    input: base.input,
    expect: {
      minLength: 80,
      minSteps: 2,
    },
  };
}
