## Context

See proposal.md for motivation and issue #89. The current scenario service returns persisted rows, validates raw Markdown, and serves REST and MCP. Summary queries explicitly exclude the body. Scenario-to-Spec links and derived evidence depend on stable scenario IDs. Existing MCP tools include structured-field updates and deletion; the user's read-only clarification concerns the Markdown representation, not removal of those existing tools.

## Goals / Non-Goals

**Goals:** Keep one transactional content aggregate per scenario, deterministic derived Markdown, independently editable steps, and the established MVC and project-context boundaries.

**Non-Goals:** Markdown input/parsing, new MCP step tools or creation, filesystem/object-store artifacts, a separate download route, embeddings/indexing, optimistic client revisions, and client implementation. `contentMd` is the complete UTF-8 document content; callers can save it as a file. Preserve existing MCP delete behavior.

## Decisions

### 1. Use nullable text fields and relational steps

Retain scenario identity, title, details, creator, timestamps, project relations, and existing indexes. Add nullable Text columns `objective`, `preconditions`, `testData`, `expectedResult`, and `notes`. Keep required Text `contentMd` as a generated projection and add required `contentMdHash` (64-character lowercase SHA-256 hex) and `contentMdFormatVersion` (integer, initial value 1).

Add `TestScenarioStep` with UUID `id`, UUID `testScenarioId`, integer `position`, required Text `action`, nullable Text `expectedResult`, and a cascading scenario FK. Enforce unique `(testScenarioId, position)` and nonnegative positions. Positions are zero-based, dense, and assigned by the backend. The unique index supports ordered scenario lookup. Step IDs survive edits/reorders; deleting a scenario deletes its steps. No step timestamps or execution history are introduced.

JSON arrays were considered but relational IDs and constraints better support dedicated operations and future step references. Rich structures for reusable preconditions or parameterized test data are deferred; multiline text is sufficient for the current authoring contract.

### 2. Define explicit validation and write contracts

Creation requires projectId and a trimmed nonblank title, with creator supplied by existing authentication. Optional text is trimmed, must be nonblank when supplied, and defaults to null; null is not accepted on creation. Optional steps default to an empty array, contain only action and optional expectedResult, and cannot supply IDs/positions. Actions are trimmed and nonblank. Interior newlines and text formatting are preserved.

Scenario PATCH allows title, details, objective, preconditions, testData, expectedResult, and notes. At least one allowed field is required; omitted fields stay unchanged, optional text accepts null to clear, and title cannot be null. Reject steps, contentMd, hash, version, and immutable metadata. Use strict transport schemas and shared service-domain validation; maintain Zod v3 compatibility at the MCP boundary and equivalent OpenAPI constraints.

Step append accepts action and optional nonblank expectedResult. Step PATCH accepts action and/or expectedResult, with null clearing expectedResult and omission preserving it. Reject unknown/read-only keys. Creation and all PATCH successes return the complete scenario detail; append returns 201 with that same detail; step deletion and reorder return 200 with updated detail. Scenario deletion retains its existing 204 behavior. Uniform mutation responses let clients refresh step IDs, ordering, timestamps, and Markdown together.

### 3. Separate step editing from scenario PATCH

Use authenticated routes under `/api/v2/test-scenarios/:scenarioId`, each requiring `?projectId=<uuid>`:

| Method and suffix | Input |
| --- | --- |
| POST `/steps` | `{ action, expectedResult? }` |
| PATCH `/steps/:stepId` | `{ action?, expectedResult?: string \| null }` |
| DELETE `/steps/:stepId` | No body |
| PUT `/steps/order` | `{ stepIds: string[] }`, the complete desired order |

Reorder accepts each current ID exactly once, including an empty array only for an empty scenario. Duplicate, missing, stale, or foreign IDs produce 400 without mutation. Direct step edit/delete outside the scoped scenario returns 404. Keep 401/auth behavior, 400 validation, 404 project-context misses, and existing error envelopes. Register the literal order route unambiguously. Do not introduce array replacement on scenario PATCH or reorder by numeric client positions.

Whole-array replacement was rejected because independent edits should not overwrite unrelated step fields. Append plus explicit reorder is sufficient initially; insert-before/after can be added later if needed.

### 4. Serialize mutations per scenario and persist one projection

Services own validation and rendering; models own database access. Use a model transaction callback to lock the parent row by `(id, projectId)` using a parameterized `SELECT ... FOR UPDATE` before reading current fields/steps. All scenario content, step, reorder, and scenario-delete paths follow the same lock discipline. In that transaction, apply only supplied changes, load ordered steps, render the complete Markdown, compute the hash, update the parent projection and updatedAt, and return the full detail. Creation performs nested step creation and initial projection persistence in one transaction.

The parent lock serializes concurrent append/reorder/delete/field mutations, prevents duplicate append positions, and prevents rendering from stale state. Separate fields preserve concurrent updates; the last serialized write to the same field wins. Reorder validates membership after acquiring the lock. Do not perform a service read outside the transaction and write back the full stale aggregate.

To avoid transient unique-position conflicts, move existing positions into a disjoint positive range above the current maximum, then assign final dense positions within the same transaction. Use this for reorder and deletion compaction. A failure rolls back steps, fields, projection, and timestamp together. Project deletion retains its established transaction and cascades steps when deleting scenarios.

Read detail with scenario fields and ordered steps from a consistent database snapshot (single statement or repeatable-read transaction), preventing mixed structured content/Markdown across concurrent writes. Summary selects must never include new content columns or steps.

### 5. Generate deterministic Markdown and indexing metadata

Use one pure renderer with fixed section order: title, Details, Objective, Preconditions, Test Data, Steps, Expected Result, Notes. Include Details when present so the representation is complete for authored text. Omit null sections; always include Steps, rendering `_No steps defined._` for an empty list. Render each step under `### Step N`, followed by the action as a body block and optional `**Expected result:**` plus its body. Keeping multiline actions out of headings avoids malformed generated heading structure.

Use LF line endings, fixed blank-line separators, and exactly one final newline. Escape heading syntax in the title and flatten title line breaks for its Markdown heading only. Treat body text as Markdown-capable text fragments, preserving interior formatting while normalizing line endings in the projection. Do not put step IDs, timestamps, evidence, or storage metadata into the document. Document that HTML sanitization is the consumer's responsibility; this change does not render HTML.

Hash the exact UTF-8 contentMd bytes with Node crypto SHA-256. Equal content yields an equal hash; metadata-only timestamps do not affect it. Expose contentMdHash and contentMdFormatVersion in detail responses. Renderer changes require a version increment and an explicit projection rebuild before serving mixed old-format data as current; do not regenerate during reads. No embedding writes or background jobs are included now.

Generating on read was considered; persistence makes the exact document available for later indexing without adding independent authoring. A physical file/download endpoint adds no required behavior for current MCP consumers and is deferred.

### 6. Preserve adapters and publish the breaking contract

REST and MCP reuse the same scenario service. MCP detail includes the structured scenario, generated Markdown metadata, and the existing independently paginated evidence envelopes. Update the existing MCP update tool to the allowed structured scenario fields, rejecting contentMd and steps. Keep MCP list/delete behavior, with no new step mutation tools. Update descriptions that currently promise raw Markdown preservation.

OpenAPI documents every new field, route, response, error, and partial-update rule. Update API/MCP docs and Postman examples. Preserve the explicit creator projection and existing list pagination/order. The five prerequisite scenario changes are archived, and explicit MODIFIED deltas update their permanent CRUD, editing, MCP, and summary requirements. Execution-evidence requirements remain unchanged.

## Risks / Trade-offs

- [Development scenario reset is irreversible] → Owner explicitly authorized discarding these records; limit SQL deletion to TestScenarioSpecLink and TestScenario and test preservation of unrelated rows. Do not run a database-wide reset.
- [Concurrent projection drift or unique-position failure] → Parent-row locking, conflict-safe position reassignment, consistent detail reads, rollback tests, and real PostgreSQL concurrency tests.
- [Persisted projection can drift through ad hoc database writes] → All application writers use the aggregate transaction; direct SQL changes require an explicit rebuild.
- [Same-field concurrent edits overwrite earlier values] → Document serialized last-write-wins behavior; client revision conflict detection is deferred.
- [Older client contracts reject or submit obsolete fields] → Clearly mark the REST/MCP change as breaking and regenerate clients from updated OpenAPI.

## Migration Plan

1. Add a forward migration deleting scenario links first, then existing scenarios, keeping all other domain data. Add nullable content columns, required hash/version columns, and the step table/constraints. The required contentMd column remains, now generated by application code.
2. Apply and verify on a disposable branch database seeded with old-format scenarios plus linked/unrelated domain records. Verify empty-database migration too. Do not run this migration against the development database during proposal work.
3. Generate Prisma types, deploy the corresponding backend, and regenerate/update clients together. Do not run old Markdown writers against the new schema.
4. Rollback is coordinated application/schema work: old code cannot populate required projection metadata. Prefer a forward fix; restoring deleted scenario data requires a pre-migration backup if one was separately taken. No automatic recovery is promised.
