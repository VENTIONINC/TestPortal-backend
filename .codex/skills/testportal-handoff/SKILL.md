---
name: testportal-handoff
description: Continue completed TestPortal backend work in a new visible Codex task under the same saved project and local checkout. Use when the next phase should start in a separate task without requiring a worktree, fork, or subagent.
---

# TestPortal Backend Handoff

Start the next phase under the same conditions as a regular Codex task in the current project.

## Inputs

Resolve from the completed workflow:

- the concise next-phase instruction;
- the relevant GitHub Issue, OpenSpec change, or task identifier, when applicable;
- the exact task name, when the user provides one;
- the model and reasoning effort, when the user provides them;
- any other explicit constraint required by the next phase.

Ask the user only when a required value is ambiguous.

## Handoff

1. Build the concise prompt that a user would normally enter to start the next phase. Do not require a skill invocation unless that is the natural instruction for the workflow.

   ```text
   <next-phase-instruction> <change-or-task-id-if-needed>. <required-explicit-constraint>
   ```

   Omit the final sentence when there is no additional instruction. Do not include a session summary, diff, file contents, repository inventory, or duplicated repository state.

2. Create a new visible Codex task for the saved project whose local directory is the current working directory.
   - Use the available project-listing and task-creation capabilities.
   - Select the project task target with `{ "type": "local" }` so it uses the same checkout.
   - Do not create a worktree or projectless/cloud task.
   - Do not fork the current task or spawn a subagent.
   - Apply a user-provided model or reasoning effort exactly; otherwise omit those overrides.

3. When the user provides a task name, apply it exactly as the new task title. Otherwise, derive a concise title from the identifier and next action. Set the title during creation when supported; otherwise use the available task-renaming capability.

4. Stop after creation and report the new task.

## Scope

Treat the completed workflow's repository outputs as the handoff state. Do not add handoff-specific inspection, status checks, validation, tests, commits, staging, pushes, or other preparation. The next task owns its normal startup work.

## Failure

If the current project cannot be identified, task management is unavailable, or local task creation fails:

1. Do not substitute a worktree, fork, projectless/cloud task, or subagent.
2. Stop and print the exact prompt from step 1 in a fenced text block for the user to paste into a new task manually.
