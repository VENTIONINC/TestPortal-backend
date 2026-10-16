## Context

Client issue #70 replaces three overlapping Results flows with one Assign Issue modal. Today the client opens `results-error-dialog.tsx` for read-only error details and `ManageIssueDrawer` for assignment, while `results-execution-card.tsx` separately calls `POST /v2/result-errors/analyze` to write classification fields on `Result`. The modal's AI action is semantically different: `POST /v2/error-formatter/result` drafts editable Issue fields.

The backend already persists `ResultError.callLog` and `callStack`, exposes a project-scoped result-error lookup, and has `runReview`, which compares error data and mutates Assumptions. It does not expose one composed modal context, persist raw logs/source snippets/generated test cases, or provide a read-only best-issue suggestion. Implementation spans the back-end repository that owns this OpenSpec change and the sibling `../TestPortal-client` repository that owns the UI.

## Goals / Non-Goals

**Goals:**

- Deliver the issue #70 modal and all nine right-pane states through one explicit client state model.
- Provide strict, project-scoped backend contracts for modal context and non-mutating similarity.
- Preserve current issue create/update/assignment semantics and existing report compatibility.
- Make optional left-pane data progressively useful without blocking the modal for legacy reports.
- Keep generated OpenAPI/RTK Query types as the cross-repository API boundary.

**Non-Goals:**

- Generate test cases as part of this change; the modal only displays a test case supplied by ingestion or a future producer.
- Reinterpret `POST /v2/result-errors/analyze` as issue drafting or remove the backend endpoint, because other consumers may still use result analysis.
- Introduce vector search, embeddings, or a new external search service.
- Guarantee that every report provider can supply raw logs or source code.

## Decisions

### Compose modal context on the backend

Add a project-scoped result-error modal-context query that returns a purpose-built DTO assembled through the existing route → controller → service → model boundaries. It includes result/spec/execution metadata, structured error details, optional tab data, and association summaries in one request.

This avoids client waterfalls and prevents the client from reconstructing authorization-sensitive relationships across several endpoints. Extending only the existing bare error response was considered, but that would turn a general resource endpoint into an unstable UI aggregate and still leave callers to infer assignment state.

### Store optional enrichment as nullable structured fields

Add nullable Prisma fields for raw logs, source snippet metadata, and generated test case, with source snippet represented as structured JSON validated at ingestion and normalized at output. Keep `callLog` distinct: it is parsed error-step context and remains part of the Error tab, while raw logs populate Logs.

A separate one-to-one context table was considered. The enrichment has the same lifecycle and cardinality as `ResultError`, so another table would add joins and deletion/migration handling without providing isolation benefit at the current scale.

### Make similarity lookup non-mutating

Extract pure scoring/candidate-selection logic from the legacy `runReview` path and expose a GET-style project-scoped suggestion operation. Candidate retrieval is limited to open issues in the same project with confirmed assumptions; confirming remains an explicit existing assignment mutation.

Reusing `PATCH /result-errors/:id/review` was rejected because opening a modal must not silently create an Assumption. Searching all named issues without confirmed error evidence was rejected because the documented three signals cannot be computed reliably.

### Score documented signals and aggregate by issue

For each candidate's confirmed errors, calculate normalized message, call-stack-shape, and spec-path similarity, combine them with named constants, then retain the highest evidence score per issue. Missing signals contribute no positive similarity and weights are normalized over available signals only when enough evidence remains. Apply a documented threshold and stable tie-breaker, and return a rounded display score plus the count of other distinct results confirmed against the issue.

The existing call-log-based formula was considered, but it conflicts with the product explainer. Embeddings were rejected for this iteration because they add latency, cost, nondeterminism, and new data handling.

### Use a reducer/state-machine model in the client

Build a modal feature boundary with discriminated states for opening, categorising, unassigned, algorithm suggestion, AI suggestion, no match, both error states, and confirmed edit. Entry-point hooks pass a result-error identity and intended mode; the modal owns async transitions and form drafts. Shared presentational components render tabs, footer actions, badges, and explainers.

Independent booleans were considered, but nine states plus retries can produce invalid combinations and stale responses. Request identity or cancellation guards SHALL prevent a late search/AI response from overwriting a newer state or a closed modal.

### Treat the HTML prototype as a structural and behavioral reference only

Use `Result_Issue_Modal.html` to determine information architecture, pane and tab structure, state inventory, actions, transitions, and approved product copy. Do not copy its CSS, colors, fonts, spacing scale, shadows, bespoke controls, or visual tokens. Build the modal from the client's existing Chakra UI primitives, theme tokens, typography, form controls, dialogs, buttons, badges, tooltips/popovers, code sections, responsive conventions, and accessibility patterns.

Copying the prototype styling was rejected because the artifact is a functional mockup rather than a product design-system specification and would create a visually inconsistent one-off surface. Where the prototype and existing application patterns differ visually, preserve the prototype's structure and behavior while following the application design system.

The issue #70/OpenSpec scope is authoritative where the attachment has drifted. Ship exactly the four specified left-pane tabs: Error, Logs, Snippet, and Test Case. Do not add the attachment-only Prompt tab, expanded-detail mode, or bespoke Allure/DataDog controls in this change. The existing `Result.reportPortalLink` remains available as ordinary result context, but this change does not invent a monitoring-event URL from the user-level DataDog configuration.

### Define enrichment sources and bounded payloads

Normalize optional enrichment at the ingestion boundary before it reaches Prisma. For the Playwright-style JSON path, combine `stdout[].text` and `stderr[].text` in report order for raw logs and map `error.snippet` plus the existing error/spec location to the structured source snippet. The current Playwright report has no generated-test-case source, so that field remains absent unless a producer supplies the canonical extension described below.

For CTRF, accept the following optional keys from each test's `meta` object: `logs` as a string or string array; `sourceSnippet` as `{ path, text, startLine, failingLine }`; and `generatedTestCase` as a string. The same canonical keys may be supplied on a Playwright result as additive optional fields. Unknown metadata remains ignored, preserving existing imports.

Apply UTF-8 byte limits after normalization: 256 KiB for combined raw logs, 128 KiB for source-snippet text, and 128 KiB for generated-test-case text. Paths are limited to 2 KiB; line values must be positive integers, and `failingLine` must fall within the snippet's represented line range. Oversized or malformed optional enrichment is discarded field-by-field rather than rejecting the report, so legacy ingestion semantics remain unchanged and sensitive payload contents are never logged.

### Define currently open issues

The current `Issue` model has no lifecycle or status column. Therefore every persisted Issue in the requested project is currently assignable/open for similarity purposes, provided it has confirmed result-error evidence. Project scoping and confirmed evidence are mandatory filters. If an Issue lifecycle is introduced later, the candidate query must be tightened to its canonical non-closed statuses before those statuses ship.

### Preserve existing mutation endpoints and generated API workflow

Use current Issue, Assumption/assignment, unassignment, and error-formatter operations where their semantics fit; add only the context and similarity contracts. Update backend OpenAPI first, then regenerate `../TestPortal-client/src/redux/apis/generatedApi.ts` and layer client cache invalidation through the established extended API patterns.

The existing result-based error-formatter response is extended additively from description-only to the complete editable draft `{ category, name, description }`. Category uses the canonical backend vocabulary `bug`, `infra`, `performance`, `script`, and `other`; the client presents `infra` as Environment. The structured AI schema, prompt, service return type, OpenAPI contract, and generated client type SHALL remain aligned.

This limits backend behavior changes and makes the removal of the inline AI control a client migration while supplying the complete draft required by the modal.

## Risks / Trade-offs

- [Report formats rarely contain source/test-case enrichment] → Keep fields optional, test empty states, and document provider mappings as they are added.
- [Persisted source text can be large or sensitive] → Cap accepted sizes, validate shapes, avoid logging payload contents, and return data only through project-scoped authorization.
- [Synchronous similarity over many errors can be slow] → Query only indexed same-project open/confirmed candidates, select required columns, cap evidence per issue, and add service-level performance coverage.
- [Legacy assumptions may be inconsistent] → Define confirmed association precedence explicitly and cover duplicate/multiple-assumption cases before changing assignment code.
- [Two repositories can drift during rollout] → Land additive backend contract first, regenerate the client, then switch UI entry points and remove old components only after the new AI path works.
- [The prototype can be mistaken for a pixel-perfect visual specification] → Use the canonical [Result_Issue_Modal.html](https://github.com/user-attachments/files/31151565/Result_Issue_Modal.html) attachment only for structure, functionality, states, and copy; use the existing client design system for all element styling and verify its additional Prompt tab, expanded-detail mode, Allure/DataDog links, and algorithm-specific suggested/edit variants before implementation.

## Migration Plan

1. Add nullable persistence fields and deploy the backward-compatible migration.
2. Implement ingestion normalization, context retrieval, pure similarity scoring, authorization, tests, and OpenAPI additions in `TestPortal-backend`.
3. Deploy the additive backend and regenerate the client API types against it.
4. Implement the client modal shell, context tabs, state reducer, similarity/AI actions, assignment mutations, and tests in `../TestPortal-client`.
5. Wire all three entry points; verify create, confirm, edit, unassign, retries, stale responses, themes, and responsive behavior.
6. Remove the old drawer/dialog and inline AI client wiring only after the new flow passes end-to-end validation.

Rollback the client to the previous entry points while leaving additive backend fields/endpoints deployed. If the backend itself must roll back, stop writes to the optional fields before reversing the migration; nullable data can otherwise remain harmlessly in place.

## Open Questions

- Should issue name search inside the similarity-error state use the existing Issues list query or receive a modal-specific lightweight query? Prefer the existing project-scoped Issues list query unless client implementation or performance tests demonstrate that its payload is unsuitable.
