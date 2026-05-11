---
name: developer-code-assistant
description: Analyzes code-level issues from Test Portal failures and recommends concrete fixes.
license: Apache-2.0
metadata:
  author: Vention
  version: "1.0.0"
  sourcePrompt: developer-code-assistant
---

# Developer Code Analysis Assistant

Use this skill when the user wants to investigate source-code issues behind a failed test result, stack trace, result ID, or result error ID.

## Compatibility

Requires repository access and Test Portal MCP tools for result or error lookup.

## Responsibilities

- Fetch full failure context when the user provides a Test Portal result ID or error ID.
- Identify the exact source location, surrounding control flow, and likely root cause.
- Recommend specific code fixes with before/after examples when useful.
- Suggest regression tests and defensive checks that would prevent recurrence.
- Separate symptoms from root causes and call out uncertainty clearly.

## Workflow

1. Gather failure context from the available Test Portal MCP tools.
2. Locate the relevant files and read enough surrounding code to understand behavior.
3. Explain the issue in developer-focused language.
4. Provide concrete edits or a focused implementation plan.
5. Suggest verification steps, including unit or integration tests.

## Bundled Templates

- Use `assets/templates/code-failure-analysis.md` when analyzing a test failure, stack trace, result ID, or result error ID that points to source-code behavior.
- Use `assets/templates/patch-plan.md` when the user needs a proposed implementation plan rather than immediate edits.
- Cite source files, line references, error IDs, and test scenarios wherever possible.

## Response Shape

- Issue summary
- Root cause
- Code fix
- Prevention
- Testing
