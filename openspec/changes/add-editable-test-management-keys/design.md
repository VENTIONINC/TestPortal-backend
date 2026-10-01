## Context

Issue #101 originally left assignment policy open. The user decided that readable keys are editable labels, duplicates are acceptable, and UUIDs retain entity identity and relationships. The current branch implements structured scenarios and manual runs. Run creation already locks the scenario and copies content, while history filters on immutable sourceTestScenarioId. The active manual-run spec freezes every mutation after completion, so editable run labels need a narrow exception.

## Goals / Non-Goals

**Goals:** User-managed scenario/run labels, consistent API exposure, durable captured source labels, and exact project-history filtering without unique-key semantics.

**Non-Goals:** Key-based links or lookup, automatic generation, project prefix settings, uniqueness or deleted-key reservations, label audit history, client UI, new MCP run tools, and changes to generated Markdown or its hash/version.

## Decisions

### 1. Treat keys as optional metadata

Add nullable `scenarioKey` to TestScenario and nullable `runKey` and `sourceScenarioKey` to ManualTestRun. Use bounded database strings (varchar(100)) and matching shared validation. Accept strings trimmed to 1–100 characters, reject line breaks, preserve case and internal spaces, and accept null to clear editable keys. Omission at creation means null; omission at PATCH preserves the existing value. Empty/whitespace-only strings are 400 rather than implicitly clearing. Labels are not parsed as prefixes or numbers. Duplicate values are allowed within and across projects, including after deletion.

Nullable labels avoid requiring invented identifiers or breaking existing creation requests. The 100-character, single-line bound is a proposed transport default for readable UI labels. Required labels, generators, and unique constraints add unnecessary policy for this user-managed field.

### 2. Preserve provenance independently of live labels

Read scenarioKey under the existing source scenario row lock and copy it verbatim to sourceScenarioKey in the same transaction as the run snapshot. A null label produces a null snapshot. Source edits, clearing, deletion, or reuse never rewrite existing run snapshots. sourceScenarioKey is server-owned and rejected in creation/update bodies, regardless of run status. UUID provenance and relationships remain unchanged.

Scenario-key updates use the existing scenario mutation lock so a concurrent run start captures either the old or new label together with a coherent scenario version. Do not join live scenario keys during history reads or attempt to backfill historical labels from today's source scenario.

### 3. Extend current endpoints and adapters

Scenario REST creation accepts optional nullable scenarioKey; its UUID-based PATCH accepts scenarioKey alone or alongside existing editable fields. Existing MCP update_test_scenario schema/handler accepts the same label, and shared scenario summaries/details expose scenarioKey. No new MCP creation/run tool is required.

Run start accepts optional nullable runKey alongside notes. UUID-based run PATCH accepts runKey, status, and/or notes, still requiring at least one editable field. All run summaries/details expose runKey and sourceScenarioKey; scenario-derived responses must carry scenarioKey consistently. OpenAPI explains that keys are nonunique labels and paths still require UUIDs.

Run metadata is returned separately from generated Markdown. Updating scenarioKey can advance scenario updatedAt through the normal mutation path; contentMd/hash/version must remain unchanged for a key-only edit.

### 4. Allow completed-run label editing only

Reuse the scoped run row lock and transaction for all run PATCH operations. On active runs, runKey can be combined with permitted notes/status updates and commits atomically; failed completion validation rolls back any submitted label change. On completed runs, only a runKey-only PATCH succeeds. Presence of status or notes, even unchanged values or null, returns 409 without applying any part of the request. Step updates and repeated completion remain 409. POST complete retains its existing schema and does not accept runKey.

A successful key-only update changes runKey and updatedAt, preserving startedAt, completedAt, status, executor, snapshot, and steps. Same-field label edits use existing serialized last-write-wins behavior. A runKey-only edit racing with completion succeeds in either order because it remains allowed after completion.

This explicitly supersedes the blanket completed-run freeze in the prerequisite execution capability; synchronize that baseline before archiving this change. Freezing keys after completion would contradict the agreed freely editable label policy; allowing execution edits would exceed it.

### 5. Filter on captured labels

Add optional sourceScenarioKey to GET /api/v2/manual-test-runs with the same nonblank single-line length validation. Use exact case-sensitive equality after trimming the query value. Invalid, empty, repeated, or oversized input returns 400. Omission adds no label predicate; a null-label selector is deferred.

Combine the label predicate with projectId, existing testScenarioId UUID provenance filter, status, and date bounds using AND before pagination; reuse identical predicates for data and count. Unknown labels return an empty scoped page without a source lookup. Deleted sources remain filterable. Do not extend the nested scenario endpoint's filters: its UUID already selects one scenario's history.

For example, two different scenarios labeled R1 both contribute runs to sourceScenarioKey=R1. Renaming one to R2 changes only labels captured by subsequent runs. To fetch its entire history across renames, use the existing testScenarioId filter. Add a nonunique index on (projectId, sourceScenarioKey, startedAt, id) matching history ordering.

## Risks / Trade-offs

- [Duplicates and renames produce broad or split label histories] → Document snapshot matching and retain exact UUID filtering; never promise a label identifies one scenario.
- [Completed-run label changes could bypass execution freezing] → Validate the whole request under the run lock and reject mixed completed-run PATCH atomically.
- [Current canonical manual-run baseline is absent] → The delta is based on the active add-manual-test-runs execution spec; synchronize the prerequisite before final archival, without rewriting its artifacts during this proposal.
- [Missing labels reduce filter usefulness] → Expose null consistently and allow users to populate labels later; do not fabricate historical provenance.

## Migration Plan

1. Add the three nullable columns and nonunique history index, without rewriting existing domain fields. Existing rows receive null; do not infer old source keys.
2. Verify clean installation and populated-database upgrade in an isolated PostgreSQL database, including active/completed/detached runs and duplicate labels.
3. Regenerate Prisma types and deploy the additive migration before the application update. Old clients can omit keys; new responses add nullable fields.
4. Application rollback can retain columns/index and label data. Dropping columns loses user labels and historical source labels; prefer a forward fix.

## Open Questions

No blocking questions. Optional keys, a 100-character single-line limit, case-sensitive exact filtering, and label editing after completion are concrete proposal defaults. Client presentation remains separate.
