# MCP Server Automated Testing Plan

**Server:** test-portal-server (v0.0.1)
**Purpose:** Prevent regressions in MCP tool contracts, safety behavior, and agent usability
**Non-goal:** End-to-end “LLM behavior” testing (this plan focuses on deterministic server guarantees)

---

## 1) Testing Objectives (What we want to guarantee)

### A. Contract Stability (Highest Priority)

- Each tool accepts the expected input schema (required fields, enums, formats)
- Each tool returns a stable output shape (required fields, types, pagination fields)
- Backward compatibility is preserved (where applicable)

### B. Model-Actionable Errors

- Errors are consistent, machine-readable, and predictable
- No stack traces or secrets leak into responses
- Errors clearly indicate whether retrying makes sense

### C. Safe and Correct Side Effects

- Destructive/cascading operations behave exactly as documented
- Batch tools handle partial failures deterministically
- No unintended cross-project or cross-entity modifications

### D. Resilience and Guardrails

- Rate/size/time limits are enforced
- Requests that are too broad fail fast and safely
- Tool calls remain stable under common edge cases

---

## 2) Recommended Test Layers (In Order)

### Layer 1 — Contract Tests (Schema + Output Shape)

**Scope:** Every tool
**Method:** For each tool, validate:

- input schema rules (required, types, enums, format constraints)
- output presence of key fields and stable types
- pagination contract (where applicable)

**Acceptance:** “Tool contract can’t change without a failing test.”

---

### Layer 2 — Error Semantics Tests

**Scope:** Tools that read/write by ID and tools with auth/role checks
**Method:** Verify consistent error format + codes for:

- validation errors
- not found
- forbidden/unauthorized (“real user required” cases)
- conflict (if applicable)

**Acceptance:** “Errors are stable and safe to interpret by agents.”

---

### Layer 3 — Side-Effects and Cascades

**Scope:** destructive and mutating tools
**Method:** Use fixture data to verify:

- what is deleted/updated
- what must never be touched
- cascade rules

**Acceptance:** “Mutations and cascades are correct, minimal, and explicit.”

---

### Layer 4 — Limits and Resilience

**Scope:** list/search/bulk/heavy tools
**Method:** Test:

- max `limit` behavior
- large payload handling
- long-running operation timeouts
- bulk batch size limits
- deterministic behavior under partial failures

**Acceptance:** “The server remains safe under agent-like load patterns.”

---

## 3) Test Matrix: Tools × Test Types (Prioritized)

Legend:

- **C** = Contract (schema + output shape)
- **E** = Error semantics
- **S** = Side effects / cascade verification
- **L** = Limits / resilience

### Priority Tier P0 — Must Have (Start Here)

These tools are either core workflow, high-risk, or high-impact.

| Tool                              | C   | E   | S   | L   | Notes                                                                        |
| --------------------------------- | --- | --- | --- | --- | ---------------------------------------------------------------------------- |
| `get-results`                     | ✅  | ✅  | —   | ✅  | Broad filters, pagination, large payload risk                                |
| `get-result-by-id`                | ✅  | ✅  | —   | ✅  | Call stacks and error details must be bounded/structured                     |
| `review-result-error`             | ✅  | ✅  | ✅  | ✅  | Creates assumptions; verify deterministic behavior                           |
| `bulk-review-result-errors`       | ✅  | ✅  | ✅  | ✅  | Batch size, partial failure semantics, idempotency expectations              |
| `analyze-result-errors`           | ✅  | ✅  | ✅  | ✅  | Persists AI insights; verify only intended fields change                     |
| `update-result-analysis`          | ✅  | ✅  | ✅  | —   | Validate allowed field updates and stability                                 |
| `update-result-analysis-feedback` | ✅  | ✅  | ✅  | —   | Clarify and test separation from AI analysis fields                          |
| `get-issues`                      | ✅  | ✅  | —   | ✅  | projectId required; pagination and filters                                   |
| `get-issue-by-id`                 | ✅  | ✅  | —   | —   | project scoping, not found semantics                                         |
| `create-assumption`               | ✅  | ✅  | ✅  | —   | Requires issueId + resultErrorId; scoping correctness                        |
| `update-assumption`               | ✅  | ✅  | ✅  | —   | “real user required”; deletion-on-false behavior must be explicit and tested |
| `delete-issue`                    | ✅  | ✅  | ✅  | —   | Cascading deletion of assumptions must be correct and minimal                |
| `delete-project`                  | ✅  | ✅  | ✅  | ✅  | Cascade removal; ensure no cross-tenant impact                               |

---

### Priority Tier P1 — Should Have (Stabilize the Domain)

| Tool                           | C   | E   | S   | L   | Notes                                                                |
| ------------------------------ | --- | --- | --- | --- | -------------------------------------------------------------------- |
| `get-issues-with-stats`        | ✅  | ✅  | —   | ✅  | Stats date ranges + correctness                                      |
| `get-results-stats`            | ✅  | ✅  | —   | ✅  | Date boundaries, empty ranges, top-N stability                       |
| `get-result-error-by-id`       | ✅  | ✅  | —   | —   | Must not leak sensitive details                                      |
| `assign-issue-to-result-error` | ✅  | ✅  | ✅  | —   | Linking behavior and validation                                      |
| `create-issue`                 | ✅  | ✅  | ✅  | —   | Field validation and defaults                                        |
| `update-issue`                 | ✅  | ✅  | ✅  | —   | Partial updates, unchanged fields preserved                          |
| `delete-result`                | ✅  | ✅  | ✅  | ✅  | Ensure dashboard refresh effect is correct (or explicitly separated) |
| `get-project-dashboard`        | ✅  | ✅  | —   | ✅  | Large payload + period filtering (if/when added)                     |
| `get-projects`                 | ✅  | ✅  | —   | ✅  | Filter stability and pagination (if supported)                       |

---

### Priority Tier P2 — Nice to Have (Completeness + Ops)

| Tool                  | C   | E   | S   | L   | Notes                                |
| --------------------- | --- | --- | --- | --- | ------------------------------------ |
| `get-execution-by-id` | ✅  | ✅  | —   | —   | Straightforward read                 |
| `delete-execution`    | ✅  | ✅  | ✅  | —   | Destructive correctness              |
| `get-spec-by-id`      | ✅  | ✅  | —   | —   | Ensure tags/annotations stable shape |
| `delete-spec`         | ✅  | ✅  | ✅  | —   | Destructive correctness              |
| `get-project-by-id`   | ✅  | ✅  | —   | —   | Scoping checks                       |
| `create-project`      | ✅  | ✅  | ✅  | —   | Defaults, ownership                  |
| `update-project`      | ✅  | ✅  | ✅  | —   | Partial updates                      |
| `check-status`        | ✅  | —   | —   | ✅  | Health response contract             |
| `current-time`        | ✅  | —   | —   | —   | Simple contract                      |

---

## 4) Cross-Cutting Test Scenarios (Apply Across Tools)

### A. Project Scoping / Tenant Isolation

For every tool that accepts `projectId` or touches project-scoped data:

- verify cross-project IDs are rejected
- verify no data leaks across projects
- verify “not found” vs “forbidden” is consistent with your security model

### B. Pagination and Sorting Stability

For every list tool:

- verify deterministic ordering (if defined)
- verify stable pagination boundaries across pages
- verify `limit` upper bounds and default values

### C. Batch Semantics (Bulk Tools)

For batch tools:

- define and test partial failure behavior:

  - “fail whole batch” vs “per-item result”

- ensure the response always includes per-item statuses
- test max batch size and rate limiting

### D. Destructive Operations Guardrails

For delete/cascade tools:

- verify minimal affected set
- verify “nothing to delete” behavior is consistent (idempotent delete vs error)
- verify audit/log hooks if you maintain them

### E. Output Size / Sensitive Data

For tools returning logs/call stacks:

- verify truncation rules
- verify structured representation (preferred)
- verify removal/masking of secrets

---

## 5) Definition of Done (For a “5/5” MCP Server)

You can consider the server “production-grade” when:

- P0 tools have full **C + E + (S where relevant) + L**
- Every tool has at least **Contract coverage**
- Error semantics are uniform and documented
- Destructive/cascade behavior is explicit and tested
- Bulk tools have deterministic partial-failure behavior
- Large outputs are bounded and safe

---

## 6) Suggested Implementation Order (Practical Sprint Plan)

**Sprint 1:** P0 Contract + Error tests
**Sprint 2:** P0 Side effects + Limits (especially bulk + deletes)
**Sprint 3:** P1 coverage + cross-cutting isolation/pagination suites
**Sprint 4:** P2 coverage + polish (introspection, docs, tightening schemas)

---
