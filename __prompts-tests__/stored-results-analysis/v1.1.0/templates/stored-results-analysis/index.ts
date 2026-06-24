// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

/**
 * Template factory registry for stored results analysis prompt tests
 * Exports all template functions for dataset generation
 */

import { infraNetworkTimeout } from "./infra.network-timeout";
import { bugAssertion } from "./bug.assertion";
import { scriptSelectorNotFound } from "./script.selector-not-found";
import { otherGeneric } from "./other.generic";

/**
 * Array of all template factory functions
 * Used by generate-datasets.ts to create test cases
 */
export const templateFactories = [
  infraNetworkTimeout,
  bugAssertion,
  scriptSelectorNotFound,
  otherGeneric,
];
