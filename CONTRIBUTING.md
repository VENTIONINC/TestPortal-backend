# Contributing

Thank you for your interest in contributing. This guide keeps the process simple
and predictable for maintainers and contributors.

## Contribution Flow

For most changes, please start with an issue or discussion before opening a pull
request. This is a normal open source workflow and helps avoid duplicate work or
large changes that do not fit the project direction.

1. **Open an issue or discussion**
   - Use an issue for bugs, small improvements, documentation fixes, or clearly
     scoped feature requests.
   - Use a discussion for early ideas, design questions, or changes that need
     feedback before implementation.
   - For very small fixes, such as typos, you can open a pull request directly.
2. **Wait for feedback when needed**
   - If the change affects APIs, database schema, MCP tools, authentication, or
     project structure, please wait for maintainer feedback before investing a
     lot of time.
   - For non-trivial changes, maintainers may ask you to use the repository's
     OpenSpec skills instead of creating OpenSpec files by hand.
3. **Create a branch**
   - Fork the repository if you do not have write access.
   - Create a focused branch from `main`, unless maintainers ask you to use another branch.
   - Keep one pull request focused on one problem.
4. **Make the change**
   - Follow the project architecture and code style below.
   - Add or update tests when behavior changes.
   - Update documentation when commands, APIs, setup, or user-facing behavior
     changes.
5. **Open a pull request**
   - Open pull requests against `main`, unless the issue or maintainer guidance says otherwise.
   - Link the related issue or discussion.
   - Link the OpenSpec change when one was created.
   - Explain what changed and why.
   - Include screenshots, API examples, or logs when they help reviewers.
   - Mention any follow-up work that is intentionally left out.

## License

This project is licensed under the Apache License 2.0. By submitting a contribution, you agree that your contribution will be licensed under Apache-2.0.

See [LICENSE](LICENSE) for the full terms.

## Local Development

1. Install dependencies with `npm install`.
2. Start the local database if needed with `docker-compose up -d postgres`.
3. Create a local `.env` file. See the setup instructions in [README.md](README.md).
4. Run database migrations with `npm run migrate`.
5. Use `npm run dev` for local development.
6. Use `npm run new:file -- <path>` when creating a new supported source file so the standard license header is applied automatically.
7. Use `npm run headers:add` when you need to backfill the standard header across existing supported files in `src`, `__tests__`, and `__prompts-tests__`.

Supported file types for `npm run new:file`:
- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.mjs`
- `.cjs`

Unsupported extensions fail with a clear error. For formats such as Markdown, JSON, SQL, or shell scripts, create the file manually until explicit support is added.

## OpenSpec Workflow

Use OpenSpec for changes that affect behavior, APIs, database schema, MCP tools,
architecture, security, or user-facing workflows. Small typo fixes,
straightforward documentation edits, and minor test-only cleanup usually do not
need an OpenSpec change.

When OpenSpec is needed, use the repository OpenSpec skills. See the
[OpenSpec workflow guide](https://openspec.pro/workflow/) for the general flow.

1. Optionally use `openspec-explore` to clarify early ideas before proposing a change.
2. Use `openspec-propose` to create the change and planning artifacts.
3. Use `openspec-apply-change` to implement the approved change and keep tasks updated.
4. Use `openspec-archive-change` after the change is complete so the permanent specs in `openspec/specs` stay current.

## Validation

Before opening a pull request, run:

1. `npm run type-check`
2. `npm run lint`
3. `npm test`
4. `npm run build`

## Code Style

- Follow the MVC patterns used in `src/controllers`, `src/services`, `src/models`, and `src/routes`.
- Prefer the repository path aliases configured in `tsconfig.json`.
- Keep controllers focused on HTTP concerns, services focused on business logic, and models focused on Prisma/database access.
- Keep REST, MCP, Zod, and OpenAPI contracts aligned when changing request or response behavior.
- Prefer `async`/`await` and explicit TypeScript types.
- Avoid `any` unless there is no reasonable typed alternative.

## Pull Request Checklist

Before requesting review, please check that:

- The pull request has a clear title and description.
- The related issue or discussion is linked when one exists.
- Tests were added or updated for behavior changes.
- Documentation was updated when needed.
- `npm run type-check`, `npm run lint`, `npm test`, and `npm run build` pass locally.
