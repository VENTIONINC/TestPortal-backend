# Story-size rubric

Size reflects what was actually shipped in the completed scope, not what was planned.
Each completion gets exactly one size label: `small`, `medium`, or `large` — lowercase tokens.

Anchor on **substantive shipped deliverables** — observable units of changed behavior,
contract, schema, or design surface. Housekeeping files (renames, copy edits, dead-code
deletions, log/trace insertions, dependency bumps, generated artifacts) do not count as
deliverables and do not escalate the band on file count alone.

A **substantive deliverable** is one user- or consumer-observable outcome (a feature, an
API endpoint, a schema change with a runtime effect, a behavior change, a removed/added
capability). Supporting layer changes for the same outcome count as one deliverable;
independently releasable outcomes count separately.

A **system boundary** is a separately deployable or runtime component, or an externally
consumed contract: SPA, API/BFF, backend service, database schema, queue/event contract,
third-party integration, or a separate repository.

## Medium — baseline

A completion is `medium` when it satisfies all of:

- Delivers exactly one independently verifiable capability, or one self-contained bounded
  concern (refactor, migration, infra change) with clear implementation value.
- Cuts through every relevant integration layer for its scope: schema, API, UI, tests, docs,
  config, or migration as applicable.
- Ships **3–7 substantive deliverables**, with file count **4–15 non-mechanical files** as
  an inclusive secondary signal.
- Includes at least one meaningful design choice.
- Is demoable or independently verifiable at completion.

## Small — narrower than baseline

Flag as `small` when any one holds:

- Ships **1–2 substantive deliverables**, with file count **1–3 non-mechanical files** as
  an inclusive secondary signal.
- Localized defect with a single verification path (one stack frame, one screen, one query).
- Mechanical churn of any size — search-and-replace rename, dead-code deletion, log/trace
  insertion, dependency bump, copy update, trivial config tweak — with no design surface.
- Is a half-flow: form without submit, list without create, read without write.
- Complete removal of an isolated subsystem with **no runtime behavior, permission, data,
  API, or operational contract change** (i.e. removing unreachable code or an unused
  isolated subsystem). A removal that changes any of those is sized by its deliverables
  and boundaries instead, and 16+ non-mechanical files cannot land as small.
- Pure scaffolding or test-only adjustment with no production behavior change.

## Large — broader than baseline

Flag as `large` when any one holds:

- Ships **8+ substantive deliverables**, with file count **16+ non-mechanical files** as
  an inclusive secondary signal.
- Bundles multiple independently releasable capabilities into one completion.
- Coordination across 3+ unrelated system boundaries (SPA / API / backend service / DB
  schema / queue / third-party integration / separate repo) without a single unifying
  design rationale.
- Acceptance criteria read like a mini-PRD rather than a small set of testable bullets for
  one capability.
- Spans multiple unrelated journeys, screens, or platforms.

## Aggregation rule

Deliverable count is the **primary** signal. File-count ranges are inclusive secondary
signals — useful tie-breakers when deliverable count alone is ambiguous, but they do not
override a clear deliverable-based classification.

When signals disagree, apply this priority chain in order. Stop at the first step that
gives a clear band.

1. **Count substantive shipped deliverables** — use the ranges above (1–2 → small, 3–7 →
   medium, 8+ → large).
2. **If still ambiguous, ask: does this require independent verification across more than
   one system boundary?** Yes → escalate one band. No → stay.
3. **If still tied, default to `medium`** — it is the baseline by intent.

Do not add secondary dimensions, confidence flags, or explanatory text.
