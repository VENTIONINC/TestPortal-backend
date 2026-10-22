## Why

Manual Test Runs need a way to correct or transfer their recorded Executor after creation, including for completed historical runs. The client also needs a non-admin source of users for this and other user-selection flows. Reassignment must preserve execution evidence and remain separate from execution updates.

## What Changes

- Add a dedicated project-scoped backend operation to assign an active user as a Manual Test Run's Executor, for runs in any status.
- Add an authenticated general user-list endpoint that returns active users and is not the administrator-management endpoint.
- Keep run execution data immutable during reassignment; completed runs remain read-only except for changing Executor.
- Treat active-user assignment and run access as available to any authenticated active user. The client may change its edit controls after reassignment; backend execution authorization is not changed by this proposal.

## Capabilities

### New Capabilities

- `manual-test-run-executor-reassignment`: Active-user Executor assignment for Manual Test Runs without modifying their execution record.
- `active-user-directory`: Authenticated listing of active users for general client selection flows.

## Impact

- Manual Test Run routes, controller, service, model, request/response types, Zod schemas, OpenAPI, and tests.
- User routes, controller/service/model as needed, response schema, OpenAPI, and tests.
- No persistence migration is expected because `ManualTestRun.executedById` already references the nullable Executor relation.
- Client implementation remains a separate change coordinated against the published OpenAPI contract.
