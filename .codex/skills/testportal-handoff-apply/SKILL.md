---
name: testportal-handoff-apply
description: Start a TestPortal GitHub Issue or OpenSpec change's apply phase in a new visible Codex task under the same saved project and current local checkout. Use when one unambiguous issue or change identifier is provided, optionally with additional apply instructions.
---

# TestPortal Apply Handoff

Create the standard apply task from one GitHub Issue or OpenSpec change identifier, such as `#84` or `add-test-scenario-details`.

## Input

Require one unambiguous identifier and use it exactly as provided. Preserve any additional apply instructions supplied by the user. Ask the user only when the identifier is missing or ambiguous.

Use `$testportal-handoff` instead when the user requests another phase, model, reasoning level, title, or environment.

## Create the Apply Task

1. Build this prompt, substituting the identifier:

   ```text
   Proceed to the apply phase for <identifier>.
   <additional-apply-instructions-if-provided>
   ```

   Omit the second line when no additional instruction was provided. Otherwise, include the user's additional instructions without dropping constraints or adding unrelated context.

2. Identify the saved project whose local directory is the current working directory.

3. Create one new visible Codex task with:
   - title: `<identifier> apply`;
   - model: `gpt-5.6-luna`;
   - reasoning effort: `max`;
   - project: the saved project identified in step 2;
   - environment: `{ "type": "local" }`, using the current checkout;
   - prompt: the exact prompt from step 1.

4. Stop after creation and report the new task.

## Boundaries

Treat the current checkout and its completed proposal artifacts as the handoff state. Do not inspect or summarize them, modify files, run validation or tests, stage or commit changes, create a worktree, fork the current task, or spawn a subagent.

Do not substitute another model or reasoning level. If the saved project cannot be identified, task creation is unavailable, or the requested model and reasoning combination cannot be used, stop and report the failure. Include the prompt from step 1 in a fenced text block so the user can create the task manually.
