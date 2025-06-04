# Agent Instructions

This repository contains a Node.js backend written in **TypeScript** using an MVC style. The project uses strict type checking and ESLint rules for quality.

## Development workflow

- Install dependencies with `npm install`.
- Run the development server with `npm run dev`.
- Database migrations are performed with `npm run migrate` and Prisma generates types with `npm run db:generate`.

## Code style guidelines

- Use the provided path aliases such as `@/services/*`, `@/controllers/*`, etc. as configured in `tsconfig.json`.
- Follow the service and controller patterns shown in `src/services` and `src/controllers`.
- Prefer `async/await` and typed return values.
- Avoid `any` and keep strict type safety. Interfaces and types live in `src/types`.
- Organise imports: Node built‑ins, third‑party modules, then internal aliases.

## Pre‑commit checklist

Before committing any changes run:

1. `npm run type-check` – ensure TypeScript compilation succeeds.
2. `npm run lint` – lint the project with ESLint.
3. `npm run build` – verify the production build.

All commands must succeed before a pull request is opened.

