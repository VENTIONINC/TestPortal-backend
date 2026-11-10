// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Template factory registry for stored results analysis prompt tests
 * Exports all template functions for dataset generation
 */

import { infraNetworkTimeout } from "./infra.network-timeout";
import { infraDnsTls } from "./infra.dns-tls";
import { bugAssertion } from "./bug.assertion";
import { bugApplicationError } from "./bug.application-error";
import { performanceSlowResponse } from "./performance.slow-response";
import { performanceResourceConstraint } from "./performance.resource-constraint";
import { scriptSelectorNotFound } from "./script.selector-not-found";
import { scriptFixtureSetup } from "./script.fixture-setup";
import { otherGeneric } from "./other.generic";
import { otherInsufficientContext } from "./other.insufficient-context";

/**
 * Array of all template factory functions
 * Used by generate-datasets.ts to create test cases
 */
export const templateFactories = [
  infraNetworkTimeout,
  infraDnsTls,
  bugAssertion,
  bugApplicationError,
  performanceSlowResponse,
  performanceResourceConstraint,
  scriptSelectorNotFound,
  scriptFixtureSetup,
  otherGeneric,
  otherInsufficientContext,
];
