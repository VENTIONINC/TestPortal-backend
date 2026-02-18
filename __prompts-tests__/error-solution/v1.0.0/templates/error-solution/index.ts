import { bugAssertion } from "./bug.assertion";
import { infraNetworkTimeout } from "./infra.network-timeout";
import { performanceSlowResponse } from "./performance.slow-response";
import { scriptSelectorNotFound } from "./script.selector-not-found";

export const templateFactories = [
  infraNetworkTimeout,
  bugAssertion,
  performanceSlowResponse,
  scriptSelectorNotFound,
];
