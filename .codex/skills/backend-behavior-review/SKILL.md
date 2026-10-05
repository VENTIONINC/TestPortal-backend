---
name: backend-behavior-review
description: Review whether a TestPortal backend change implements the business behavior required by its OpenSpec change or the user's task and clarifications. Use for requirements verification, scenario coverage, or behavior acceptance review.
---

# Backend Behavior Review

Verify the implementation against the relevant OpenSpec change or the user’s task and clarifications.

Review is read-only unless the user also requests fixes. Do not rewrite requirements, update task
checkboxes, archive a change, or modify implementation to make the review pass. Validation commands
may produce normal local build/test artifacts; do not run migrations, live provider calls, or other
external mutations merely to collect review evidence without authorization for those actions.

## Establish the Review Scope

- Identify the requested change, diff/base revision, and related requirements. Distinguish changed
  code from pre-existing local work; inspect surrounding callers and contracts as needed to trace
  consequences, but keep findings tied to the reviewed change.
- Use `docs/CARTODEX_MAP.md` when tracing the feature requires architecture
  context, then verify consequential claims in owning code.
- Use the relevant OpenSpec change when available. Do not choose an unrelated change simply because
  it is active. If selection is ambiguous, ask for the change while continuing independent code
  inspection. If no change applies, use the user's task and clarifications; do not create OpenSpec
  artifacts as a side effect of review.
- For an OpenSpec-backed review, discover the selected root/store and artifact paths through the
  available OpenSpec CLI context (`status` and `instructions apply` for the selected change, keeping
  `--store` when applicable). Read the returned context files, including requirements, scenarios,
  scope, design, and tasks where present. A blocked or all-done apply status describes implementation
  workflow state, not a review verdict; report missing artifacts or context without changing them.
  If the CLI is unavailable, read identifiable artifacts directly and state the limitation.
- Treat explicit user instructions and subsequent clarifications as authoritative. Surface conflicts
  with OpenSpec and record assumptions instead of silently accepting the implementation as intent.
  If a required outcome cannot be determined, mark it unverified and request only the missing context.

## Verify Behavior Against Requirements

Build a compact requirement-to-evidence mapping from the applicable spec scenarios or user acceptance
criteria. Include deliberate exclusions and compatibility obligations when relevant. For each
requirement, identify the implementing flow and the evidence supporting its outcome:

Use the requirement table in the output format below.

Trace the flow across entry points, services, persistence, and returned results. Check business
rules, permissions, boundaries, failure/partial-success behavior, and missing or unintended behavior.
Verify shared REST/MCP behavior where the requirement applies to both surfaces.

Use satisfied only when evidence establishes the required outcome; violated needs a concrete
contradiction; unverified means evidence or intent is insufficient. Scale validation to the claim:
code inspection can establish a local deterministic rule, but cannot prove live deployment, external
integration, or browser acceptance. Passing tests, checked tasks, and static spec validation are
supporting evidence, not substitutes for tracing requirements. Tests may encode the wrong behavior.

## Validation and Result

Run focused checks that resolve uncertainty about required outcomes. Report commands actually run
and their results; distinguish code inspection, mocked tests, static validation, and live acceptance.
Do not infer a defect from unavailable validation or report unrun checks as passed.

Lead with a behavior verdict: **Pass**, **Issues found**, or **Unverified**. Limit a pass to the
reviewed requirements and available evidence; do not imply deployed acceptance. When concrete
violations and evidence gaps coexist, report issues found and list the unverified requirements.

Provide the requirement-to-evidence mapping and actionable findings ordered by impact. Each finding
should identify the affected file/line, requirement source, concrete contradiction and consequence,
supporting evidence, and a practical correction. Separate ambiguous intent and missing validation
from demonstrated defects. State no findings only within the reviewed scope.

Close with validation and material limitations. Missing requirement context or an unavailable
acceptance environment remains visible as unverified. A behavior pass does not establish code quality.

## Output Format

Use the following sections in this order for every behavior review. Replace template placeholders
with actual evidence. Keep the verdict values and requirement statuses exactly as defined above.
Scale detail to the change; do not omit an unverified requirement merely to shorten the report.

```markdown
**Behavior review: Pass / Issues found / Unverified**

One sentence explaining the verdict and its scope.

### Scope and basis

- Reviewed: change identifier and diff/base revision or local files reviewed.
- Requirements: relevant OpenSpec change/artifact locations, or the user's task and clarifications.
- Assumptions or conflicts: material interpretation choices or conflicting sources; use None when absent.

### Requirement coverage

| ID | Requirement and source | Implementation / validation evidence | Result |
| --- | --- | --- | --- |
| R1 | Required outcome and source reference | Code/test links and evidence, or the missing evidence | Satisfied / Violated / Unverified |

### Findings

1. **[P1] Short finding title** — affected file and line.
   - Requirement: R1 and the relevant scenario or user criterion.
   - Observed behavior: concrete trigger and actual outcome, with supporting evidence.
   - Impact: how the outcome contradicts the requirement and affects the user or workflow.
   - Correction: the smallest practical change that restores the required behavior.

### Validation and limitations

- Performed: exact commands and outcomes, plus relevant code inspection or manual checks.
- Unverified: requirement IDs, missing evidence, and the check or clarification needed; use None when absent.
```

Choose one verdict, one status per requirement, and actual priorities rather than printing the
alternatives in the template. Use P0 for an immediate critical defect, P1 for a high-impact defect,
P2 for a normal defect, and P3 for a low-impact defect. Order findings by priority and give each a
concrete requirement violation; keep evidence gaps and ambiguous intent in the unverified list.

Use review-local IDs (`R1`, `R2`, ...) to connect coverage, findings, and missing validation. Include
source scenario names or identifiers when available. Link verified file locations and distinguish
inspection, mocked tests, static validation, and live acceptance in the evidence column. One finding
may reference several requirements; avoid repeating it for each row.

When there are no demonstrated violations, replace the numbered findings with
"No behavior violations found within the reviewed scope." This can accompany an Unverified verdict;
it must not imply that missing evidence has been resolved. When no requirement source is available,
show an Unverified row describing the missing basis instead of inventing acceptance criteria.

Omit optional improvement suggestions from this report unless requested. Keep implementation-quality
findings outside this independent behavior review. The verdict covers behavior only, not code quality
or deployed acceptance beyond the evidence reported.
