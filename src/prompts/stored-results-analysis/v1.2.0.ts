// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0

export const getStoredResultsAnalysisPrompt = (testResultsLength: number) => `
  <goal>
    Categorize every supplied failed or flaky test into one predefined category.
    For each test, first write a concise evidence-based conclusion, then assign
    the category and confidence. For failed tests, also evaluate the quality of
    the available error information.
  </goal>

  <categories>
    <category id="bug">App defects, logic errors, assertion failures.</category>
    <category id="infra">Environment, network, deployment, MFA/auth issues.</category>
    <category id="performance">Timeouts, slow responses, resource constraints.</category>
    <category id="script">Test automation issues, selector problems.</category>
    <category id="other">Everything else.</category>
  </categories>

  <guidelines>
    <rule>
      Determine the category using the following priority order.
      Apply the first matching rule and stop.
    </rule>
    <rule>
      1. infra: explicit network errors (ETIMEDOUT, ECONNRESET, ECONNREFUSED,
      DNS), connection failures, SSL/TLS issues, or auth/MFA failures caused by
      environment, credentials, or external systems.
    </rule>
    <rule>
      2. performance: timeouts or waits exceeded without network error codes,
      slow responses, long execution times, or flaky timeouts that pass on retry
      without code changes.
    </rule>
    <rule>
      3. script: test framework errors, selector or locator not found, invalid
      test setup or data, or incorrect waits/assertions in test code.
    </rule>
    <rule>
      4. bug: assertion failures with a clear expected-versus-actual mismatch,
      deterministic failures reproducible without retries, or application logic
      errors indicated by stack traces.
    </rule>
    <rule>
      5. other: insufficient, missing, or generic error information, or
      conflicting signals that do not clearly match another category.
    </rule>
  </guidelines>

  <steps>
    <step>
      First write a concise 2–3 sentence conclusion based on the supplied
      evidence. Mention the key evidence, such as an error code, timeout,
      selector, or assertion mismatch, and assess the likely root cause.
    </step>
    <step>
      Then select the category that best matches the conclusion and rate the
      confidence in that categorization.
    </step>
  </steps>

  <confidence_scale>
    <level value="1">Very Low - Highly uncertain, multiple possible causes.</level>
    <level value="2">Low - Significant doubt remains.</level>
    <level value="3">Medium - Reasonable but not definitive evidence.</level>
    <level value="4">High - Strong evidence supports the categorization.</level>
    <level value="5">Very High - Clear and definitive evidence.</level>
  </confidence_scale>

  <error_quality_scale>
    <level value="1">Very Poor - Generic or missing error information.</level>
    <level value="2">Poor - Vague error without specific diagnostic details.</level>
    <level value="3">Adequate - Basic context is present but incomplete.</level>
    <level value="4">Good - Clear error with meaningful context and location.</level>
    <level value="5">Excellent - Detailed assertion or error information with comprehensive diagnostics.</level>
  </error_quality_scale>

  <strict>
    <rule>Use the provided <field>id</field> and <field>status</field>.</rule>
    <rule><field>conclusion</field> must be a 2–3 sentence evidence-based root-cause analysis written before the category is assigned.</rule>
    <rule><field>category</field> must be one of: bug, infra, performance, script, other, and must follow from <field>conclusion</field>.</rule>
    <rule><field>confidence</field> must be an integer from 1 to 5.</rule>
    <rule>If <field>status</field> is "failed", <field>errorQuality</field> must be an integer from 1 to 5 and <field>errorQualityConclusion</field> must explain that rating.</rule>
    <rule>If <field>status</field> is "flaky", <field>errorQuality</field> and <field>errorQualityConclusion</field> must be null.</rule>
    <rule>The results array must contain exactly <var>${testResultsLength}</var> objects.</rule>
  </strict>

  <examples>
    Here are four examples.

    <example n="1">
      <input_json>
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "specKey": "e2e/login.spec.ts > User Login > should login with valid credentials",
          "specTitle": "should login with valid credentials",
          "status": "failed",
          "duration": 1500,
          "retry": 0,
          "executionName": "Chrome - Production",
          "errorMessage": "AssertionError: Expected 'Welcome, User!' to equal 'Welcome, Admin!'",
          "errorStack": "at Test.Login.validCredentials (test/login.js:25:12)",
          "errorLocation": "test/login.js:25:12"
        }
      </input_json>
      <output_analysis>
        {
          "id": "550e8400-e29b-41d4-a716-446655440000",
          "status": "failed",
          "conclusion": "The test failed because of an assertion error where the actual welcome message did not match the expected one. This points to a likely defect in the application's user greeting logic.",
          "category": "bug",
          "confidence": 5,
          "errorQuality": 5,
          "errorQualityConclusion": "Excellent error quality with clear assertion details, expected and actual values, and precise location information."
        }
      </output_analysis>
    </example>

    <example n="2">
      <input_json>
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "specKey": "api/health.spec.ts > API Health > should return 200 status",
          "specTitle": "should return 200 status",
          "status": "failed",
          "duration": 30000,
          "retry": 2,
          "executionName": "API Tests - Staging",
          "errorMessage": "Error: connect ETIMEDOUT 10.0.0.1:443",
          "errorStack": "at TCPConnectWrap.afterConnect (net.js:1148:16)",
          "errorLocation": "api/health.spec.ts:15:8"
        }
      </input_json>
      <output_analysis>
        {
          "id": "660e8400-e29b-41d4-a716-446655440001",
          "status": "failed",
          "conclusion": "The test failed due to a network timeout connecting to the API endpoint. This indicates an infrastructure issue related to network connectivity or service availability.",
          "category": "infra",
          "confidence": 5,
          "errorQuality": 4,
          "errorQualityConclusion": "Good error quality with a specific error code, target endpoint, and stack trace location."
        }
      </output_analysis>
    </example>

    <example n="3">
      <input_json>
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "specKey": "e2e/dashboard.spec.ts > Dashboard > should load user data",
          "specTitle": "should load user data",
          "status": "failed",
          "duration": 8500,
          "retry": 0,
          "executionName": "Chrome - Production",
          "errorMessage": "Error: Test failed",
          "errorStack": null,
          "errorLocation": null
        }
      </input_json>
      <output_analysis>
        {
          "id": "770e8400-e29b-41d4-a716-446655440002",
          "status": "failed",
          "conclusion": "The test failed with a generic error message and no stack trace or location details. The available evidence is insufficient to identify a specific root cause.",
          "category": "other",
          "confidence": 1,
          "errorQuality": 1,
          "errorQualityConclusion": "Very poor error quality because the message provides no diagnostic context, stack trace, or location."
        }
      </output_analysis>
    </example>

    <example n="4">
      <input_json>
        {
          "id": "880e8400-e29b-41d4-a716-446655440003",
          "specKey": "e2e/search.spec.ts > Search > should return results",
          "specTitle": "should return results",
          "status": "flaky",
          "duration": 12000,
          "retry": 1,
          "executionName": "Chrome - Staging",
          "errorMessage": "Timeout 12000ms exceeded.",
          "errorStack": "at SearchPage.waitForResults (e2e/search.spec.ts:42:10)",
          "errorLocation": "e2e/search.spec.ts:42:10"
        }
      </input_json>
      <output_analysis>
        {
          "id": "880e8400-e29b-41d4-a716-446655440003",
          "status": "flaky",
          "conclusion": "The flaky test exceeded its timeout while waiting for search results. This suggests intermittent slowness or variability, although the exact cause is not definitive.",
          "category": "performance",
          "confidence": 3,
          "errorQuality": null,
          "errorQualityConclusion": null
        }
      </output_analysis>
    </example>
  </examples>

  <style>
    Be objective, concise, and actionable.
  </style>
`;
