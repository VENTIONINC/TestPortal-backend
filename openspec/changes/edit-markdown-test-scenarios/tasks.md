## 1. Update Contracts and Validation

- [x] 1.1 Add strict Zod PATCH request alternatives that require title, `contentMd`, or both and reject unknown, null, and read-only fields.
- [x] 1.2 Add typed update input/data interfaces containing only optional `title` and `contentMd` fields with an at-least-one-field service contract.
- [x] 1.3 Add schema tests for title-only, Markdown-only, combined, empty, malformed, null, unknown, and read-only-field bodies.

## 2. Model and Service Update Behavior

- [x] 2.1 Implement a Test Scenario model update that scopes lookup and mutation by scenario ID and project ID in one transaction and returns the persisted row or `null`.
- [x] 2.2 Add model tests for project-scoped success, cross-project misses, atomic combined updates, omitted-field preservation, and immutable metadata/relations.
- [x] 2.3 Implement service partial-update behavior with defensive at-least-one-field validation, title trimming, exact Markdown preservation, and existing not-found errors.
- [x] 2.4 Add service tests for title-only, Markdown-only, combined, no-op-value, last-write-wins, invalid input, and cross-project behavior.

## 3. Controller and Route Integration

- [x] 3.1 Implement the PATCH controller handler using existing scenario path/project schemas, strict body validation, shared error mapping, and the detail response contract.
- [x] 3.2 Register authenticated PATCH on `/api/v2/test-scenarios/:scenarioId` without changing nested Spec-link or evidence route behavior.
- [x] 3.3 Add controller tests for 200/400/404/500 mappings, full persisted responses, and unchanged state after rejected updates.
- [x] 3.4 Add route tests for JWT protection, query/path/body handoff, PATCH availability, PUT absence, and cross-project rejection.

## 4. OpenAPI Contract

- [x] 4.1 Add a strict partial-update OpenAPI request schema that structurally requires at least one editable field and excludes read-only fields.
- [x] 4.2 Register PATCH with bearer security, the shared Test Scenario success schema, and documented 400/401/404/500 error responses.
- [x] 4.3 Add OpenAPI contract tests for partial alternatives, strict field exposure, shared response reuse, Test Scenarios tagging, and PUT absence.

## 5. Round-Trip and Integration Regression Coverage

- [x] 5.1 Add update/read round-trip coverage for Unicode, headings, code fences, indentation, trailing whitespace, whitespace-only content, and line endings.
- [x] 5.2 Add regression coverage proving `id`, `projectId`, `createdById`, and `createdAt` remain unchanged while `updatedAt` advances.
- [x] 5.3 Add regression coverage proving all scenario/Spec links and derived Result/Issue evidence remain unchanged after title or Markdown updates.
- [x] 5.4 Run focused MVC-boundary, OpenAPI-contract, and Jest-pattern reviews and resolve identified drift.

## 6. Verification

- [x] 6.1 Confirm no Prisma schema change or migration is introduced for scenario editing.
- [x] 6.2 Run `npm run type-check` and resolve all strict TypeScript errors.
- [x] 6.3 Run `npm run lint` and resolve all ESLint or license-header violations.
- [x] 6.4 Run `npm test` and confirm the complete Jest suite passes.
- [x] 6.5 Run `npm run build` and confirm the production build succeeds.
