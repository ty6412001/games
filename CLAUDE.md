# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

奥特曼亲子大富翁 — a Monopoly-style learning game for a Chinese first-grader (苏教版一年级下册). 2–5 players take turns on an iPad around a 28-tile board; landing on study / property / monster tiles triggers quiz questions. Every 18 weeks culminates in a boss battle. Pure LAN/intranet use, no public deployment.

## Workspace Layout

pnpm workspace with three packages:

- `packages/shared` (`@ultraman/shared`) — Zod schemas + types for Question/Tile/Player/Boss/Game/WrongBook/KnowledgeBank. Imported by both apps.
- `apps/web` (`@ultraman/web`) — React 18 + Vite + Tailwind + Zustand + Dexie. Single-page app, all game logic runs here.
- `apps/server` (`@ultraman/server`) — Express + better-sqlite3 + JWT. Family-password auth, persists wrong-book, boss log, weapon collection, knowledge bank.

Question content lives in `apps/web/public/question-packs/week-XX.json` (1–18 weeks; curated by hand, loaded at runtime). See `QUESTION-BANK.md` for the schema and `QUESTION-CATALOG.md` for the current inventory.

## Commands

Root-level (run in repo root):

```bash
pnpm install
pnpm rebuild better-sqlite3 esbuild   # needed once after install on a fresh machine

pnpm -r run build          # build all packages (shared → web → server)
pnpm -r run typecheck
pnpm -r run lint
pnpm -r run test           # vitest in every package
pnpm run check:terms       # forbidden-wording guard (see below)
pnpm run ci                # typecheck + lint + test + check:terms
pnpm run format            # prettier write
```

Per-package dev:

```bash
pnpm --filter @ultraman/web run dev       # http://localhost:5173
pnpm --filter @ultraman/server run dev    # http://localhost:3001
pnpm --filter @ultraman/web run test:e2e  # Playwright (apps/web/tests/e2e)
```

Running a single test file (vitest):

```bash
pnpm --filter @ultraman/web run test -- src/stores/__tests__/gameStore.test.ts
pnpm --filter @ultraman/web run test -- -t "name of test case"
```

Running one Playwright spec:

```bash
pnpm --filter @ultraman/web exec playwright test tests/e2e/fullLoop.spec.ts
```

CI (`.github/workflows/ci.yml`) runs: install → rebuild native → typecheck → lint → test → `check:terms` → build. Keep every step green.

## Architecture Big Picture

### Game state is client-side

All gameplay lives in `apps/web/src/stores/gameStore.ts` (Zustand). One store drives everything: setup → board turn loop → quiz → chance/boss/decker transformations → settle/result. The file is ~1800 lines; before touching it, read it end-to-end.

The store composes pure domain modules in `apps/web/src/domain/`:

- `tiles.ts` — 28-tile layout; districts: `monster-forest` / `space-station` / `land-of-light`. Economy constants (`SALARY_ON_LAP`, `STARTING_MONEY`, study rewards) live here, not in the store.
- `turnEngine.ts` — dice roll, landing resolution, lap detection.
- `economy.ts` — rent, district bonuses, bankruptcy, salvage.
- `questionPicker.ts` — random pick by subject/difficulty, countdown table, answer comparison, reward calc.
- `chanceDeck.ts` — chance cards.
- `bossBattle.ts` — end-of-game boss fight state machine.
- `combatPower.ts` / `rankings.ts` — settlement.
- `decker/` — Decker Ultraman form-shifting (energy → form → finisher).

Everything in `domain/` is pure and individually unit-tested. New mechanics should land in `domain/` and be wired into the store, not inlined.

### The server is thin and optional

`apps/server` is a sync/persistence layer, not a game engine. Routes are mounted in `src/server.ts`: `auth`, `knowledgeBank`, `wrongBook`, `weapons`, `bossLog`, `health`. Auth is a single `FAMILY_PASSWORD` → JWT (see `lib/jwt.ts`, `middleware/auth.ts`); failed attempts throttle via the `auth_attempts` table.

DB schema: `apps/server/src/db/schema.sql` — it's the source of truth for table shape. better-sqlite3 is synchronous; the schema runs on boot from `db/client.ts`.

The web app stores recent state locally in IndexedDB (Dexie, see `apps/web/src/data/repo/`) and opportunistically syncs to the server via `apps/web/src/data/cloud/apiClient.ts`. If the server is unreachable the game still works — design new features so local state is authoritative and server calls are best-effort.

### Shared schemas are the contract

`packages/shared/src/schemas/*.ts` defines the wire format with Zod. Both apps import these; tile/question/player/boss shapes changed here will ripple through. Question packs in `apps/web/public/question-packs/` are validated against the `Question` schema on load — schema errors surface in the console at runtime.

## Content & Wording Conventions

- Target child is 6–7 years old. Vocabulary is deliberately simplified. The approved vocabulary lives in `apps/web/src/config/terms.ts`; the glossary (plain-language explanations shown in `TermGloss.tsx`) is in the same file.
- `pnpm run check:terms` (`scripts/check-legacy-terms.ts`) scans `apps/web/src/**/*.{ts,tsx}` and fails CI on legacy wordings. Current bans → replacements: `租金→过路费`, `业主→房主`, `破产→钱用光了`, `地产/地皮→地`, `结算→算钱`, `学习格→学习星`, `通用题库→挑战题`, `购置→买下这块地`. When adding new UI strings, read `terms.ts` first and either reuse a key or extend the allow-list there (tests/`data/`/`.d.ts` are exempt).
- Question packs: see `QUESTION-BANK.md`. ID format `<subject-letter>-w<NN>-<NNN>` (e.g. `m-w01-001`). Four supported types: `choice`, `input`, `image-choice`, `ordering` (plus `true-false` now in use). Adding a new pack requires updating `public/question-packs/index.json`.

## Deployment Notes (not needed for local dev)

`deploy/install.sh` sets up node + nginx + systemd on Ubuntu. Runtime env vars read by the server (`apps/server/src/config.ts`): `PORT` (default 3001), `DATABASE_PATH` (default `<server>/data/family.db`), `JWT_SECRET`, `FAMILY_PASSWORD`. Defaults are dev-only and unsafe in prod. See `DEPLOY.md` for operational runbooks.
