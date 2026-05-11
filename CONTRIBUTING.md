# Contributing

## License

This project is licensed under the Apache License 2.0. By submitting a contribution, you agree that your contribution will be licensed under Apache-2.0.

See [LICENSE](LICENSE) for the full terms.

## Development Workflow

1. Install dependencies with `npm install`.
2. Use `npm run dev` for local development.
3. Use `npm run new:file -- <path>` when creating a new supported source file so the standard license header is applied automatically.

Supported file types for `npm run new:file`:
- `.ts`
- `.tsx`
- `.js`
- `.jsx`
- `.mjs`
- `.cjs`

Unsupported extensions fail with a clear error. For formats such as Markdown, JSON, SQL, or shell scripts, create the file manually until explicit support is added.

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
