## 1. Data Model

- [ ] 1.1 Add `IntakeReport` relations to the Prisma schema for project, optional uploader/API key, optional decision actor, and optional promoted execution.
- [ ] 1.2 Add an `IntakeReport` migration with lifecycle scalar fields and JSON-backed `rawPayload`, `normalizedSummary`, `detectedTags`, and `detectedSignals` fields.
- [ ] 1.3 Regenerate Prisma client types and update shared database/type exports as needed.

## 2. Intake Domain Layer

- [ ] 2.1 Add intake enums/constants for statuses, suggested actions, decision reasons, source formats, and detected signal codes.
- [ ] 2.2 Add an intake model with create, find/list, update-decision, and promoted-execution update helpers.
- [ ] 2.3 Add an intake normalization service for Playwright JSON reports that extracts summary counts, run metadata, detected tags, and detected signals.
- [ ] 2.4 Add an intake normalization service for CTRF reports that extracts summary counts, run metadata, detected tags, and detected signals.
- [ ] 2.5 Add shared intake gate logic for suggested actions, including empty-report rejection and all/high non-passing quarantine suggestions.

## 3. Review And Promotion Services

- [ ] 3.1 Add an intake service that creates pending intake records from validated upload payloads.
- [ ] 3.2 Add reject and quarantine service methods that persist decision actor, time, reason, and comment metadata without creating canonical records.
- [ ] 3.3 Add a promote service method that transforms stored raw payloads by source format and reuses existing canonical report processing.
- [ ] 3.4 Make promotion idempotent by returning the existing promoted execution reference when an intake record was already promoted.
- [ ] 3.5 Ensure analysis and dashboard updates run only after successful promotion and follow existing analysis-enabled behavior.

## 4. REST API And Contracts

- [ ] 4.1 Add request/response schemas for intake list, detail, upload response, reject, quarantine, and promote actions.
- [ ] 4.2 Add intake controller and routes for listing, inspecting, promoting, rejecting, and quarantining intake records.
- [ ] 4.3 Update Playwright JSON upload controllers to create intake records and return intake review responses instead of immediate execution responses.
- [ ] 4.4 Update CTRF upload controllers to create intake records and return intake review responses instead of immediate execution responses.
- [ ] 4.5 Update OpenAPI documentation for new intake endpoints and changed upload responses.

## 5. Tests

- [ ] 5.1 Add unit tests for Playwright JSON and CTRF intake normalization, detected tags, summary counts, and signal generation.
- [ ] 5.2 Add service tests for create, reject, quarantine, promote, and duplicate-promotion behavior.
- [ ] 5.3 Add controller/route tests for intake list, detail, review actions, and upload response shape.
- [ ] 5.4 Add regression tests proving pending, rejected, and quarantined intake records do not create canonical executions or affect dashboards/analysis.
- [ ] 5.5 Add promotion tests proving promoted intake creates canonical execution/results and triggers existing post-promotion behavior.

## 6. Verification

- [ ] 6.1 Run `npm run type-check`.
- [ ] 6.2 Run `npm run lint`.
- [ ] 6.3 Run `npm test`.
- [ ] 6.4 Run `npm run build`.
- [ ] 6.5 Run `openspec validate add-intake-report-pipeline --strict` or the repository's equivalent OpenSpec validation command.
