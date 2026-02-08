# MCP Server Improvement Recommendations

**Server:** test-portal-server
**Version:** 0.0.1
**Scope:** Tool design, agent usability, safety, and consistency
**Goal:** Move from “good MCP server” to “production-grade MCP reference implementation”

---

## Priority 1 — Clarify Tool Semantics and Side Effects (Highest Impact)

### Problem

Several tools perform **implicit or cascading operations** that are not obvious from their names.
This makes agent planning less reliable and increases the risk of unintended destructive actions.

Examples:

- `delete-issue` removes associated assumptions
- `delete-project` performs cascading removal
- `delete-result` refreshes dashboard statistics
- `update-assumption` may delete an assumption when `isConfirmed=false`

Agents work best when tools are:

- predictable
- explicit about destructive behavior
- single-responsibility

### Recommendation

Make destructive or cascading behavior explicit via one of the following:

**Option A — Explicit flags**

- `cascade=true`
- `confirm=true`
- `action="reject"`

**Option B — Separate tools**

- `reject-assumption`
- `delete-issue-with-assumptions`
- `recalculate-dashboard-stats`

### Expected Result

- Safer agent execution
- More predictable workflows
- Easier policy enforcement on the client side

---

## Priority 2 — Normalize Tool Naming Conventions

### Problem

The current tool naming mixes multiple styles:

- CRUD style (`get-result-by-id`)
- domain action style (`review-result-error`)
- analytics style (`get-results-stats`)
- AI workflow style (`analyze-result-errors`)

This increases tool-selection ambiguity for LLM agents.

### Recommendation

Adopt a consistent naming convention across all tools.

Recommended structure:

```
entity.action
entity.list
entity.get
entity.create
entity.update
entity.delete
entity.stats
entity.analyze
```

Example transformations:

- `get-result-by-id` → `result.get`
- `get-results` → `result.list`
- `get-results-stats` → `result.stats`
- `review-result-error` → `resultError.review`
- `analyze-result-errors` → `resultError.analyze`
- `assign-issue-to-result-error` → `resultError.assignIssue`

### Expected Result

- Faster tool discovery by models
- Lower hallucination rate
- Cleaner MCP contract

---

## Priority 3 — Reduce Tool Overlap and Ambiguity

### Problem

Some tools have overlapping intent or unclear boundaries.

Examples:

- `update-result-analysis`
- `update-result-analysis-feedback`

and:

- `review-result-error`
- `analyze-result-errors`

Agents may struggle to decide which tool to use.

### Recommendation

Clarify responsibility boundaries:

Example:

- One tool updates **AI-generated analysis**
- One tool updates **human reviewer feedback**

Ensure descriptions explicitly state:

- who should call the tool (agent vs human workflow)
- what data is modified
- what is persisted

If possible, consolidate overlapping tools.

### Expected Result

- Cleaner workflows
- Fewer incorrect tool calls
- Easier reasoning loops

---

## Priority 4 — Introduce Context Tools

### Problem

Most tools require explicit IDs such as `projectId`.
This is correct but increases friction for agent workflows.

Agents often benefit from lightweight session context.

### Recommendation

Add optional context tools such as:

- `context.setProject`
- `context.getProject`
- `context.setExecution`
- `context.getExecution`

These tools should not replace explicit parameters, but can reduce repeated lookups.

### Expected Result

- Shorter tool-call chains
- Improved reliability in multi-step workflows
- Better agent planning

---

## Priority 5 — Ensure Every Entity Has List + Get Pattern

### Problem

Some entities only expose `get-by-id` operations.

Agents typically perform better when each entity supports:

- list/search
- get-by-id

### Recommendation

Consider adding:

- `execution.list`
- `spec.list`
- `resultError.list`

Even simple pagination-based listing significantly improves agent usability.

### Expected Result

- More robust discovery workflows
- Reduced dependency on external IDs
- Better debugging capabilities

---

## Priority 6 — Strengthen Tool Descriptions

### Problem

Tool descriptions are functional but could better guide LLM behavior.

Descriptions should explicitly state:

- when to use the tool
- when NOT to use it
- whether the tool is read-only
- whether the tool is destructive
- whether the tool is expensive

### Recommendation

Adopt a structured description style:

```
Use this tool when:
Do not use this tool when:
Side effects:
Required context:
```

### Expected Result

- Fewer incorrect tool selections
- More stable agent behavior
- Reduced prompt engineering requirements

---

## Priority 7 — Add Server Introspection Tools

### Recommendation

Consider adding:

- `server.info`
- `server.capabilities`
- `server.limits`

These tools help agents adapt to runtime constraints.

### Expected Result

- Better resilience
- Easier debugging
- Future-proof integrations

---

## Final Assessment

The MCP server already demonstrates:

- strong domain modeling
- agent-oriented workflows
- good tool granularity
- appropriate CRUD separation

Primary improvements needed are:

- consistency
- explicitness
- workflow clarity

Once addressed, this server could serve as a strong MCP reference implementation.

---

If you want, next step can be turning this into:

- a **tool naming guideline**
- an **MCP server design checklist**
- or a **migration plan from v0.0.1 → v1.0**.
