# Bug Readiness Criteria

Use these criteria for bugs, defects, incidents, regressions, support escalations, and broken behavior reports.

## 1. Bug Scope

Check whether the ticket describes exactly one defect and names the broken behavior.

- Pass: One specific broken behavior.
- Partial: Main bug is clear but related symptoms are fuzzy.
- Fail: Multiple bugs are bundled or the broken behavior is unclear.
- Questions: What is the single broken behavior? Are other symptoms part of the same defect or separate issues?

## 2. Repro Steps

Check whether step-by-step reproduction instructions exist and include required data, state, permissions, or setup.

- Pass: Numbered, actionable repro steps.
- Partial: Steps exist but skip preconditions.
- Fail: No repro steps or only vague "use the app" guidance.
- Questions: What exact steps reproduce it from a fresh state? What data or account is needed? Is it consistent or intermittent?

## 3. Expected vs Actual

Check whether correct behavior and observed broken behavior are both explicit and separate.

- Pass: Expected and actual behavior are specific.
- Partial: One side is clear and the other is vague.
- Fail: Symptoms are described without the correct expected behavior.
- Questions: What should happen? What actually happens instead? Is the expected behavior documented anywhere?

## 4. Evidence

Check whether there is enough proof to identify or verify the bug: screenshots, recordings, logs, stack traces, request IDs, result IDs, or wrong output examples.

- Pass: Evidence clearly shows the broken state.
- Partial: Evidence exists but is incomplete.
- Fail: No usable evidence where evidence should exist.
- Questions: Can you attach a screenshot, recording, log, or error output? What wrong value is shown?

## 5. Environment and Isolation

Check whether environment, version, browser/device, dataset, account type, and affected user scope are known.

- Pass: Environment and data conditions are specified.
- Partial: Environment is known but data conditions or scope are vague.
- Fail: No environment context.
- Questions: Where was this observed? Does it affect all users or a subset? When was it last working?

## 6. Technical References

Check whether likely code area, component, service, endpoint, stack trace, recent PR, or release is identified.

- Pass: Technical anchor or diagnostic clue exists.
- Partial: General area known but exact clue missing.
- Fail: Unknown for urgent/high-impact bugs; otherwise mark as an open investigation note.
- Questions: Which component or service is likely involved? Is there a stack trace or recent change?

## 7. Regression Risk

Check whether adjacent behavior, release path, hotfix need, and manual QA scope are identified.

- Pass: Regression scope or hotfix path is clear.
- Partial: Fix area is known but adjacent checks are missing.
- Fail: High-impact area with no regression consideration.
- Questions: What else could be affected? Should this be hotfixed? What should QA re-check?

## 8. Definition of Done

Check whether verification for the fix is explicit.

- Pass: Verification method, test expectation, and sign-off are stated.
- Partial: Verification is generic or owner is unclear.
- Fail: No fix verification standard.
- Questions: How will the fix be verified? Is a regression test expected? Who signs off?

