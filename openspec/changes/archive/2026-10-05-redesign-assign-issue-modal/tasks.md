## 1. Contract and Persistence Foundations

- [x] 1.1 Inspect the canonical linked `Result_Issue_Modal.html`, reconcile its additional Prompt tab, expanded-detail mode, Allure/DataDog links, and algorithm-specific variants with the specs, confirm canonical open Issue statuses, map available report fields to modal context, and record accepted payload size limits in the design
- [x] 1.2 Add failing backend tests for enriched and legacy result-error payload persistence and normalization
- [x] 1.3 Add nullable ResultError modal-context fields and a backward-compatible Prisma migration, then update strict shared database/API types
- [x] 1.4 Extend JSON and CTRF ingestion normalization to validate, size-limit, and persist recognised logs, source snippet, and generated test-case fields while preserving legacy imports

## 2. Backend Modal Context

- [x] 2.1 Add failing model/service tests for accessible modal context, current assignment summaries, absent optional data, and cross-project isolation
- [x] 2.2 Implement the project-scoped modal-context model query and typed service DTO across the existing MVC boundaries
- [x] 2.3 Add failing controller/route tests for modal-context validation, success, not-found/access, and server-error responses
- [x] 2.4 Implement the authenticated modal-context REST route and controller response mapping

## 3. Backend Similarity Suggestions

- [x] 3.1 Add failing unit tests for deterministic message, stack-shape, and spec-path scoring, missing signals, threshold behavior, and stable tie-breaking
- [x] 3.2 Extract pure similarity scoring and implement same-project, open-issue candidate aggregation without persistence side effects
- [x] 3.3 Add failing service tests for best match, no match, foreign/closed exclusion, confirmed-evidence eligibility, affected-test counting, and proof that search creates no Assumption
- [x] 3.4 Implement the project-scoped read-only suggestion service and bounded candidate query with selected columns only
- [x] 3.5 Add failing controller/route tests and implement the authenticated suggestion endpoint with distinct match, no-match, validation, access, and server-error outcomes

## 4. API Contract and Client Generation

- [x] 4.1 Add or update Zod/OpenAPI schemas for modal context, optional tab data, and similarity outcomes, including contract-focused backend tests
- [x] 4.2 Regenerate `../TestPortal-client/src/redux/apis/generatedApi.ts` from the updated OpenAPI document and adapt extended API cache tags without handwritten response casts
- [x] 4.3 Run backend type-check, focused Jest suites, OpenAPI generation/build checks, and verify existing API consumers remain compatible

## 5. Client Modal Structure and State

- [x] 5.1 Add failing client tests for the nine-state reducer, legal async transitions, retry/reject behavior, and stale or cancelled response protection
- [x] 5.2 Implement the discriminated modal state reducer and hooks that load context, auto-search similarity, request AI drafts, and preserve editable form values on failures
- [x] 5.3 Add failing component tests for the shared modal shell, title metadata, responsive two-pane layout, light/dark rendering, reuse of existing application components/theme patterns, focus handling, and close behavior
- [x] 5.4 Implement the unified Assign Issue modal shell and category/name/description form using the prototype for structure, behavior, and copy while using existing client components, fonts, theme tokens, spacing, and styling approaches
- [x] 5.5 Add failing tests and implement Error, Logs, Snippet, and Test Case tabs with Copy actions, failing-line highlighting, and specified empty states
- [x] 5.6 Add failing tests and implement all state-specific badges, notices, footer actions, loading/error states, and similarity and AI-provenance popovers with verbatim prototype copy

## 6. Client Mutations and Entry-Point Migration

- [x] 6.1 Add failing integration tests for manual create/assign, algorithm confirm/reject, AI draft review, per-field polish Undo/Retry, confirmed update, unassign, cancel, and cache refresh
- [x] 6.2 Wire existing Issue, assignment/Assumption, unassignment, and error-formatter mutations into the modal and invalidate Results and Issues data after successful changes
- [x] 6.3 Add failing tests for all three Results entry points and implement error-message, add-icon, and confirmed-pill opening modes against the same modal
- [x] 6.4 Remove `ManageIssueDrawer`, the standalone Results error dialog, `analyze-category-button.tsx`, and the Results-tab `/v2/result-errors/analyze` state/import/handler/render branch after replacement coverage passes

## 7. End-to-End Verification

- [x] 7.1 Run the complete backend pre-commit checklist: `npm run type-check`, `npm run lint`, `npm test`, and `npm run build`
- [x] 7.2 Run the client lint, TypeScript, test, and production build commands and resolve regressions without editing generated API code manually
- [x] 7.3 Manually verify all nine modal states, three entry points, keyboard/focus behavior, copy actions, responsive layouts, and light/dark modes against issue #70 and `Result_Issue_Modal.html`
- [x] 7.4 Verify an enriched report and a legacy report end to end, including optional-tab empty states, read-only similarity, assignment lifecycle, AI categorisation, polish retry/undo, and cross-project denial
