## Context

The backend currently accepts Playwright JSON and CTRF uploads, transforms them into the internal `ReportData` shape, persists canonical `Execution`, `Spec`, `Result`, and `ResultError` records, optionally runs stored-results analysis, and updates dashboard metrics. That means every accepted upload becomes official test history before the system or a user can decide whether the run is relevant, suspicious, or safe to analyze.

The latest schema already uses Prisma `Json` fields for report payload fragments such as `Spec.tags`, `Spec.annotations`, `ResultError.callLog`, and `ResultError.callStack`. The intake pipeline should follow that direction by storing raw payloads, normalized summaries, tags, and detected signals as JSON-backed data instead of stringified metadata.

## Goals / Non-Goals

**Goals:**

- Store every uploaded report as an intake record before canonical execution promotion.
- Show enough normalized information for a client review table without forcing the client to inspect the full raw payload.
- Detect simple pre-promotion signals such as all tests failed, high non-passing ratio, empty reports, and tag availability.
- Let users promote, reject, or quarantine an intake report.
- Ensure only promoted reports create canonical executions/results and participate in normal dashboard and AI analysis workflows.
- Preserve raw payloads so rejected or quarantined reports can be audited and potentially promoted later.
- Reuse the existing report transformation and `jsonReportService.processReport` path during promotion.

**Non-Goals:**

- Build advanced incident management or alerting for quarantined reports in the first change.
- Implement partial/subset promotion, such as promoting only regression tests, in the first change.
- Move raw payload bodies to external object storage.
- Replace stored-results analysis or change its analysis schema.
- Change MCP tools unless they need to stay aligned with newly exposed REST behavior.

## Decisions

### Store raw uploads in a new `IntakeReport` model

Add a first-class intake model related to `Project` and optionally linked to the uploading user/API key and promoted execution. It should include scalar lifecycle fields plus JSON-backed payload fields:

- `provider` and `sourceFormat` for upload classification.
- `status` for lifecycle state: `pending_review`, `promoted`, `rejected`, `quarantined`, `failed`.
- `suggestedAction` for the system recommendation: `promote`, `reject`, `quarantine`.
- `decisionReason`, `decisionComment`, `decidedById`, and `decidedAt` for review audit data.
- `rawPayload` for the original parsed upload body.
- `normalizedSummary` for table-ready run metadata and counts.
- `detectedTags` for report/test tags discovered at intake time.
- `detectedSignals` for system-generated health or routing signals.
- `promotedExecutionId` once promotion succeeds.

Alternative considered: add lifecycle fields directly to `Execution`. That keeps the schema smaller but still lets untrusted uploads leak into canonical metrics unless every consumer filters them correctly. A separate intake table preserves a clean boundary: intake records are received evidence; executions are trusted test history.

### Normalize once for review, transform again for promotion

The intake service should parse the upload, validate the known source format, and extract a small normalized summary for list/detail APIs. Promotion should reuse the existing source-specific transformation into `ReportData` and then call the current canonical persistence path.

Alternative considered: store only `ReportData` instead of the original payload. That would make promotion simpler but would lose forensic fidelity and make future replay after transformer changes harder.

### Make review explicit before canonical persistence

Upload endpoints should create intake records and return intake metadata instead of immediately creating an execution. A separate promotion action should create canonical records and trigger the existing post-promotion analysis/dashboard flow.

Alternative considered: keep current upload endpoints as immediate promotion and add intake as optional behavior. That reduces rollout risk but weakens the product intent: the client table would only see reports that explicitly opted into review, and suspicious runs could still pollute dashboards by default.

### Treat quarantine as operational evidence, not rejection

Quarantined reports should not be promoted automatically and should not count in normal dashboard/analysis flows, but they should remain visible and reversible. A later promotion action should be allowed for quarantined reports if a user decides the system or reviewer was too conservative.

Alternative considered: implement quarantine as a terminal rejection reason. That is simpler but loses the future path toward environment health, infrastructure incident grouping, and manual recovery.

### Keep first release whole-report only

The first implementation should promote or reject an entire intake report. Detected tags should be captured now so the client can show regression/smoke/nightly context, and the schema can support future subset promotion without forcing it into this change.

Alternative considered: include regression-only subset promotion immediately. That is attractive but adds complexity around partial summaries, duplicate spec/result handling, and explaining why an intake report was partially promoted.

## Risks / Trade-offs

- **Breaking upload response contract** -> Document the response change in OpenAPI and update tests/clients to expect intake IDs before execution IDs.
- **Large raw payloads stored in Postgres** -> Start with JSON-backed storage for transactional simplicity; revisit object storage if payload size or database growth becomes a real issue.
- **Duplicate promotion attempts** -> Enforce status transitions and make promotion idempotent by storing `promotedExecutionId` once promotion succeeds.
- **Suspicious runs hidden from normal dashboards** -> Keep quarantined reports available through intake APIs so operational visibility moves to intake views instead of disappearing.
- **Transformer drift between intake and promotion** -> Store raw payload and source format, and keep promotion source-specific so reprocessing uses the same parser/transformer path.
- **Analysis/dashboard side effects during failed promotion** -> Promote inside a transaction for canonical records, then run the existing analysis/dashboard update only after promotion succeeds.

## Migration Plan

1. Add the `IntakeReport` Prisma model and migration.
2. Add intake model/service/controller/routes/schemas/OpenAPI definitions.
3. Refactor upload controllers so they parse and store intake records instead of immediately promoting.
4. Add promotion actions that call the existing canonical processing path and update analysis/dashboard data after success.
5. Add reject and quarantine actions with audited decision fields.
6. Update tests and client-facing contracts for the new upload response shape.

Rollback would remove or ignore the intake endpoints and return upload routes to immediate canonical processing. Existing intake rows can remain as audit data because they do not participate in canonical execution metrics unless promoted.

## Open Questions

- Should upload routes expose a temporary compatibility mode for immediate promotion, or should the breaking behavior land directly?
- Which failure-ratio threshold should produce a quarantine suggestion: the existing CTRF 50% non-passing rule, exactly 100% failed, or both with different signal severities?
- Should API-key uploads be allowed to auto-promote for trusted CI jobs later, or should all uploads require review in this first release?
