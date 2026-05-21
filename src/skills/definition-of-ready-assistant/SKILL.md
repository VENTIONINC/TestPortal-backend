---
name: definition-of-ready-assistant
description: Evaluates whether feature or bug tickets are ready for implementation by an AI coding agent or developer. Use for Definition of Ready checks, ticket readiness reviews, acceptance criteria generation, gap interviews, and ready-to-paste ticket descriptions from any issue tracker or pasted ticket content.
license: Apache-2.0
metadata:
  author: Vention
  version: "1.0.0"
  sourceArtifact: definition-of-ready-assistant
---

# Definition of Ready Assistant

Use this skill when the user wants to evaluate a ticket, story, task, or bug for implementation readiness.

## Compatibility

Works with any issue tracker or pasted ticket content. If tracker tools are available, fetch the ticket details, comments, labels, attachments, and linked work. If no tracker access is available, evaluate the content the user provided and ask for missing context.

## Responsibilities

- Detect whether the item is a feature, bug, research task, or unknown work type.
- Evaluate readiness from the perspective of an AI coding agent and a developer who needs explicit implementation context.
- Identify missing scope, acceptance criteria, technical references, dependencies, edge cases, verification steps, and ambiguity.
- Run a focused gap interview when information is missing.
- Generate deterministic acceptance criteria and a ready-to-paste ticket description.
- Produce a scorecard with a clear ready, conditionally ready, or not ready verdict.

## Workflow

1. Gather the ticket content from the tracker or user-provided text.
2. Detect the ticket type. Use feature criteria by default when the type is unclear.
3. Read the relevant criteria reference:
   - `references/feature-criteria.md` for feature, story, improvement, or unknown tickets.
   - `references/bug-criteria.md` for bug, defect, incident, or regression tickets.
4. Score every criterion before asking questions.
5. Ask one focused question at a time for every blocking or partial gap. Do not accept vague answers such as "TBD", "same as before", or "standard behavior" without clarification.
6. Generate acceptance criteria using the relevant bundled template.
7. Produce the final DoR scorecard and updated ticket description.

## Bundled Templates

- Use `assets/templates/feature-acceptance-criteria.md` for feature acceptance criteria in Given/When/Then form.
- Use `assets/templates/bug-acceptance-criteria.md` for bug fix acceptance criteria with repro, expected, actual, and fix checks.
- Use `assets/templates/dor-scorecard.md` for the final readiness report.
- Use `assets/templates/updated-ticket-description.md` for the ready-to-paste ticket body.

## Scoring

- Pass: 1 point.
- Partial: 0.5 points.
- Fail: 0 points.
- Ready: 7-8 points with no unresolved blocking gaps.
- Conditionally ready: 5-6.5 points or minor unresolved caveats.
- Not ready: below 5 points or any unresolved critical implementation blocker.

## Response Shape

- Ticket summary
- Type detection
- Readiness scan
- Gap interview when needed
- Acceptance criteria
- DoR scorecard
- Ready-to-paste ticket description
