## Context

Manual Test Run detail and history already return a safe nullable `executedBy` identity and `executedById`. The current run PATCH does not accept Executor identity, and its completed-run behavior is reserved for the existing label-only `runKey` exception. `GET /api/v2/admin/users` requires the admin role and includes accounts unsuitable for assignment. All Manual Test Run routes currently use active-user JWT authentication and scope run lookup by the supplied `projectId`; they do not implement project membership or current-Executor authorization.

## Goals / Non-Goals

**Goals:** Provide an explicit operation for changing a run's Executor, allow assignment to active users only, support every run status, expose a general active-user list to authenticated callers, return authoritative run detail, and preserve all execution evidence.

**Non-Goals:** Add project membership/ACL rules, require admin rights, enforce Executor-only server-side editing, change authorization of existing run read/write operations, add audit history, modify execution fields during assignment, reopen completed runs, or change client presentation.

## Decisions

### 1. Use a dedicated project-scoped reassignment operation

Add `PATCH /api/v2/manual-test-runs/{runId}/executor?projectId={projectId}` with a strict body containing `executedById` as a UUID. Use the existing `authMiddleware`; any authenticated active user may call it. Resolve the run within the requested project, preserving the existing non-disclosure behavior for a missing or out-of-scope run. Do not add an Executor field to the general run PATCH, which has execution/status semantics and separate completed-run rules.

On success return the full authoritative `ManualTestRun` detail, including the newly resolved `{ id, name, email }` Executor. A null/unresolved target is not accepted. The operation is allowed for in-progress and completed runs.

### 2. Validate and persist the active target atomically

The service/model validates that the target user exists and has `active` status when the assignment is committed. Perform the run lookup, target validation, and Executor update within a transaction with a consistent lock order, so concurrent run changes, user suspension, or deletion cannot result in a successful assignment to an inactive or missing account. Map an invalid/inactive target to a documented client error; preserve the existing `{ error: string }` envelope.

The persisted change is limited to `executedById` (and the run's normal `updatedAt` field). Preserve status, notes, completion time, step results and notes, step timestamps, and all scenario snapshot fields. Existing `runKey` behavior remains unchanged.

### 3. Add a general active-user directory endpoint

Add `GET /api/v2/users`, protected by `authMiddleware` and available to every authenticated active user. Return only active accounts with the safe identity fields required by the client: `id`, `name`, and `email`. Do not reuse or weaken `/api/v2/admin/users`; that endpoint remains the administrator account-management list, including its existing broader account lifecycle needs.

The new endpoint is unfiltered by project because the agreed access rule allows any authenticated active user to access runs. Keep output intentionally smaller than the admin-user representation. Document deterministic ordering and the response schema in OpenAPI.

### 4. Keep client-side edit ownership separate

The client can use the returned Executor to enable execution controls for the new Executor and make them read-only for the previous Executor. These are UI rules only. This change does not add current-Executor authorization checks to run reads, run PATCH, step PATCH, completion, or reassignment.

### 5. Align contracts and regression coverage

Add strict request/response Zod schemas and OpenAPI entries for both operations. Keep shared service validation consistent with transport validation. Cover active and inactive targets, all run statuses, cross-project run lookup, any authenticated active caller, and preservation of the full execution record. Cover that the user directory excludes pending and suspended accounts, is available without the admin role, and returns only safe identity fields.

## Risks / Trade-offs

- The endpoint exposes active users' names and email addresses to all authenticated active users. This is required for useful identity disambiguation in the agreed general user-selection flow; the response excludes administrative and integration fields.
- The current API's run access boundary is active-user authentication plus project-scoped lookup, not project membership. This proposal preserves that established model and does not imply stronger project authorization.
- Reassignment is not auditable beyond the current Executor and normal update timestamp. An audit trail would be a separate requirement.

## Migration Plan

No database migration is expected. Deploy the backend routes and OpenAPI contract before the client enables the new controls. Rollback can remove the new endpoints without changing existing run records or execution behavior.

## Open Questions

No blocking questions remain from exploration. The general directory endpoint is `GET /api/v2/users`; it returns active users only and is callable by any authenticated active user.
