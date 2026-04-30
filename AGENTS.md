# Repository Guidelines

## Project Structure & Module Organization
This repository is a `pnpm` workspace with three main packages:
- `apps/web`: React 18 + Vite frontend. Core gameplay lives under `src/features`, game rules under `src/domain`, client state in `src/stores`, and question/theme assets in `src/data` and `src/theme`.
- `apps/server`: Express + SQLite backend. API entrypoint is `src/index.ts`; database code is in `src/db`, routes in `src/routes`, and shared helpers in `src/lib`.
- `packages/shared`: shared TypeScript types and Zod schemas in `src/` and `src/schemas`.

Tests sit next to code in `__tests__` folders or as `*.test.*` / `*.spec.*`. Static assets and image replacements live in `apps/web/public/assets`. Deployment scripts are under `deploy/`; maintenance scripts are under `scripts/`.

## Build, Test, and Development Commands
- `pnpm install`: install workspace dependencies.
- `pnpm rebuild better-sqlite3 esbuild`: rebuild native dependencies after install or environment changes.
- `pnpm --filter @ultraman/web run dev`: start the frontend on `http://localhost:5173`.
- `pnpm --filter @ultraman/server run dev`: start the API server on `http://localhost:3001`.
- `pnpm build`: build all packages.
- `pnpm typecheck`: run TypeScript checks across the workspace.
- `pnpm lint`: run ESLint in all packages.
- `pnpm test`: run Vitest suites in all packages.
- `pnpm test:e2e`: run Playwright tests for `apps/web`.
- `pnpm ci`: run the full local CI gate, including terminology checks.

## Coding Style & Naming Conventions
Use 2-space indentation, LF line endings, and UTF-8 as defined in `.editorconfig`. Prettier enforces `singleQuote: true`, semicolons, trailing commas, and `printWidth: 100`; use `pnpm format` or `pnpm format:check`.

Prefer TypeScript throughout. Use `PascalCase` for React components, `camelCase` for functions/variables, and keep test filenames descriptive, for example `QuizModal.inputModes.test.tsx` or `fullLoop.spec.ts`.

## Testing Guidelines
Vitest is the unit/integration test runner for all packages; Playwright covers browser flows in `apps/web/tests/e2e`. Add tests close to the code you change and match existing naming patterns. Before opening a PR, run `pnpm test` and, for UI or flow changes, `pnpm test:e2e`.

## Commit & Pull Request Guidelines
Recent history uses short imperative commits with prefixes such as `feat:`, `docs:`, and `content:`. Follow that style and keep each commit focused on one change.

PRs should include a clear summary, affected package(s), linked issue or task if available, and screenshots or short recordings for visible web changes. Note any schema, content-pack, or deployment impact explicitly.
