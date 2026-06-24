## Context

The repository currently mixes incomplete licensing signals: npm metadata declares `ISC`, the README still contains a placeholder license section, and there is no root `LICENSE` file. At the same time, the team wants new source files to start with a consistent Apache 2.0 header without depending on manual copy-paste.

This change is cross-cutting because it touches package metadata, root documentation, developer workflow, and a new utility command. The design should keep the implementation lightweight, predictable, and easy for contributors to follow.

## Goals / Non-Goals

**Goals:**
- Establish Apache 2.0 as the canonical repository license in source control, package metadata, and contributor-facing docs.
- Provide a simple `npm run new:file -- <path>` workflow that creates a file with the required copyright and SPDX header.
- Define when the new command is expected to be used and how contributions are accepted under the repository license.
- Avoid introducing unnecessary tooling or a heavy scaffolding framework.

**Non-Goals:**
- Retroactively adding headers to every existing repository file.
- Enforcing the header policy through CI in this change.
- Creating a multi-template project generator for every file type and architecture pattern.
- Changing runtime behavior, API contracts, or deployment behavior.

## Decisions

### Use standard Apache 2.0 repository artifacts

The repository will add a root `LICENSE` file with the standard Apache License 2.0 text, update `package.json` to `Apache-2.0`, refresh `package-lock.json`, and replace the README placeholder with a short license section that points to the root license file.

Why this approach:
- It matches common open source and source-available repository conventions.
- Tooling such as npm, GitHub, and internal compliance scanners can detect the SPDX identifier directly.
- It keeps the legal signal explicit without changing runtime code.

Alternatives considered:
- Only updating `package.json`: rejected because it leaves the repo-level license incomplete.
- Only adding a `LICENSE` file: rejected because package metadata would remain inconsistent.

### Add a lightweight Node-based file creation utility behind `npm run new:file`

The command should be implemented as a small repository script invoked via npm, taking a target path as an argument and creating the file plus any missing parent directories. The script should prepend the required Apache 2.0 header for comment-compatible file types and fail clearly when no path is provided or when the target file already exists.

Why this approach:
- It fits the existing Node/npm workflow with no new dependency.
- It is easy to understand, maintain, and extend later.
- It avoids adopting larger generators such as Hygen or Plop for a narrow need.

Alternatives considered:
- Shell script implementation: rejected because cross-platform quoting and comment-style branching become harder to maintain.
- Adding a scaffolding dependency: rejected as unnecessary overhead for one small command.

### Scope header insertion to supported file types and document the policy

The initial command should support the repository's primary developer-facing text file types, with comment styles chosen by extension. At minimum, TypeScript and JavaScript-family files should use:

```text
// Copyright 2026 VENSOLUTIONSGROUP LTD
// SPDX-License-Identifier: Apache-2.0
```

Markdown or other non-comment-friendly files should either use an appropriate native comment form if explicitly supported, or be created without a header until the policy defines that format. The supported extension set and expected usage should be documented in contributor guidance so the behavior is predictable.

Why this approach:
- It prevents invalid syntax in formats that do not share a common comment style.
- It keeps the command useful immediately for the repository's main source files.
- It leaves room to expand format support intentionally instead of guessing.

Alternatives considered:
- Force the same `//` header into every file: rejected because it would break non-code formats.
- Require the command for every new file type from day one: rejected because the policy would be too brittle before supported formats are defined.

### Add a minimal `CONTRIBUTING.md`

A dedicated `CONTRIBUTING.md` should be added rather than relying only on the README's short contributing section. It should state the expected validation commands, mention use of `npm run new:file` for new supported source files, and state that submitted contributions are accepted under Apache 2.0.

Why this approach:
- It makes the licensing and workflow rules easier to discover.
- It separates contributor process from product overview material in the README.
- It answers the user's question about whether contribution guidance is needed with a lightweight but explicit solution.

Alternatives considered:
- Keeping guidance only in `README.md`: acceptable but less discoverable and easier to overlook.
- Adding CLA or DCO workflow now: rejected because there is no current signal that this repo needs that level of contribution process.

## Risks / Trade-offs

- [Header support is too broad] → Limit the first version to clearly supported extensions and document unsupported cases.
- [Contributors bypass the new command] → Make the command visible in `CONTRIBUTING.md` and README so it becomes the default habit.
- [License metadata drifts again later] → Keep canonical references in a small set of root files: `LICENSE`, `package.json`, `README.md`, and `CONTRIBUTING.md`.
- [Lockfile churn obscures the change] → Restrict `package-lock.json` updates to the root package metadata refresh tied to the license field.

## Migration Plan

1. Add the root Apache 2.0 license file and align npm metadata with `Apache-2.0`.
2. Update repository docs to point to the new license and contributor guidance.
3. Introduce the `npm run new:file` script and document supported file types and expected usage.
4. Verify the new command on representative file extensions before adoption.

Rollback is straightforward: revert the documentation and script changes, restore prior npm metadata, and remove the root license file if the licensing decision changes before release.

## Open Questions

- Which exact file extensions should be supported in the first release of `npm run new:file`?
- Should unsupported extensions fail hard or create an empty file with a warning?
- Does the team want to add a future CI check for required headers on newly added files?
