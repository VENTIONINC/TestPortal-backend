## 1. General active-user directory

- [x] 1.1 Add `GET /api/v2/users` behind active-user authentication; return only `id`, `name`, and `email` for active users in deterministic order.
- [x] 1.2 Add response schema, shared query/model behavior as needed, OpenAPI documentation, and coverage for non-admin access, inactive-user exclusion, authentication, and safe projection.

## 2. Executor reassignment contract

- [x] 2.1 Add a strict project-scoped request schema accepting only `executedById` and document the dedicated `PATCH /api/v2/manual-test-runs/{runId}/executor` operation in OpenAPI.
- [x] 2.2 Implement service/model reassignment with transactional validation that the target is active at write time and the run belongs to the requested project.
- [x] 2.3 Return authoritative `ManualTestRun` detail and preserve all run execution and scenario snapshot fields for in-progress and completed records.
- [x] 2.4 Add controller/route handling and map invalid targets and scoped misses to documented error responses.

## 3. Contract and regression verification

- [x] 3.1 Cover any authenticated active caller, active and inactive targets, missing targets, cross-project requests, and reassignment in every run status.
- [x] 3.2 Verify reassignment changes only Executor identity and normal run update time; assert status, notes, outcomes, completion/step timestamps, and snapshot content are unchanged.
- [x] 3.3 Verify run read/edit authorization remains unchanged and the API does not introduce an Executor-only server-side check.
- [ ] 3.4 Run focused tests, type-check, lint, build, and OpenSpec validation; coordinate the resulting OpenAPI contract with TestPortal-client before client integration.
