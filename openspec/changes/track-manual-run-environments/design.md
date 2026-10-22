# Design

## Context

See [proposal.md](proposal.md). Manual runs currently have strict start and update schemas, Prisma-backed creation in a transaction, and separate detail/history selects. The project model records an owner but has no membership relation. The client generates API bindings from the backend OpenAPI contract.

## Goals / Non-Goals

**Goals:** Keep existing run requests valid, resolve a profile atomically with run creation, and make profile reads and writes available to authenticated users within a project.

**Non-Goals:** Environment detection, shared profiles, changing environment snapshots after start, analytics, or environment filtering.

## Decisions

### Persist profiles separately and snapshot fields on the run

Add a profile table with project and owner foreign keys, name, four reusable nullable text fields, and timestamps. Add nullable browser, OS, device, API environment, build, and deployment columns to `ManualTestRun`. The run does not need a live profile relation for display. This allows profile deletion without rewriting history. Alternative: store only the profile ID, which would make historical values mutable.

### Resolve profile and overrides within run creation

The start API accepts an optional profile ID plus optional field values. Within the existing creation transaction, load the profile using ID, project ID, and authenticated user ID. Reject a missing or mismatched profile before writing a run. For each reusable field, an explicitly supplied value wins; omitted fields inherit from the profile. Explicit `null` or blank input is normalized to an empty value, allowing a prefilled field to be cleared. Build and deployment never inherit from the profile. Save all resolved values on the run. Alternative: resolve only in the client, which would not validate profile ownership or make the server contract reliable.

### Scope shared profile operations to the project

Profile list and mutation queries include the project ID, so every authenticated project user sees and manages the same profiles. Verify the project exists, and return a not-found response for profiles outside that project. Store the creating user as the profile owner for referential attribution, not as an access boundary. Existing project-scoped APIs rely on the project ID, and this backend has no separate membership relation to consult.

### Keep API contracts explicit and bounded

Add project-scoped profile REST endpoints, with UUID IDs and validated create/update bodies. Use a nonblank bounded profile name and bounded single-line optional values, trim input, and represent empty values as `null` in responses. Include the same six nullable snapshot fields in run detail and history summaries. Keep the existing start/update contracts backward compatible; run update does not accept environment fields. Register request and response schemas and routes in OpenAPI before client binding generation. Alternative: an opaque JSON environment field, which weakens generated types and validation.

## Risks / Trade-offs

- A selected profile may be deleted during run creation → Read it within the same transaction and handle concurrent deletion consistently; never create a partial run.
- Profile values may be sensitive → Scope every read/write by authenticated owner and project, and avoid logging values.
- Existing projects have no membership model → Follow the backend's project-ID scoping convention; do not invent a membership model in this change.
- Client and server schemas may drift → Verify served OpenAPI against response shape and generate client bindings only afterward.

## Migration Plan

Add nullable run columns and the new profile table in one additive migration. Existing runs naturally return null environment fields. Deploy the backend before the client. Client rollback requires no data conversion; avoid dropping stored data on rollback.
