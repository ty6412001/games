# Week-01 Current Progress Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `week-01` into a current-progress pack aligned to Chinese through Practice 4, Math through the first three Sujiaoban units, and Yilin English 1B Unit 1-4.

**Architecture:** Keep the existing JSON pack structure and schemas unchanged. Replace the current `week-01` question set with a new 95-question content set, update the index title, then validate with shared schemas and a fresh web build.

**Tech Stack:** JSON assets, Vite public files, shared Zod schemas, Node.js validation, pnpm workspace builds

---

### Task 1: Update Pack Metadata

**Files:**
- Modify: `apps/web/public/question-packs/week-01.json`
- Modify: `apps/web/public/question-packs/index.json`

- [ ] **Step 1: Replace the pack title**

Set the `week-01` title to the current-progress version and preserve the existing boss mapping:

```json
{
  "week": 1,
  "title": "第1周 · 当前教材进度包 / 语文至练习4 / 数学前三单元 / 英语1B Unit1-4",
  "boss": {
    "id": "zetton",
    "name": "杰顿",
    "hp": 3000
  }
}
```

- [ ] **Step 2: Update the index title**

Set the first entry in `apps/web/public/question-packs/index.json` to:

```json
{ "week": 1, "title": "第1周 · 当前进度包/语文练习4/数学前三单元/英语1B Unit1-4", "path": "/question-packs/week-01.json" }
```

### Task 2: Rewrite Week-01 Questions

**Files:**
- Modify: `apps/web/public/question-packs/week-01.json`

- [ ] **Step 1: Replace math with the expanded current unit mix**

Write `40` math questions:
- `16` on `20以内退位减法`
- `12` on `认识图形（二）`
- `12` on `认识100以内的数`

Keep the set choice-heavy, use only supported question types, and keep all answers unique/unambiguous.

- [ ] **Step 2: Replace chinese with expanded textbook-aligned content**

Write `40` chinese questions covering:
- `识字1-4`
- `课文1-4`
- `课文5-8`
- `课文9-13`
- `练习1-4`

Anchor questions to textbook words, characters, characters in context, lesson content, and sentence understanding. Keep the set choice-heavy and avoid duplicate stems.

- [ ] **Step 3: Replace english with Yilin 1B Unit 1-4 content**

Write `15` english questions covering:
- counting `1-10`
- `This is my pencil`
- `I like carrots`
- `Spring`

Avoid open-ended answers; keep input answers to single words or fixed phrases.

### Task 3: Validate Runtime Compatibility

**Files:**
- Test: `apps/web/public/question-packs/week-01.json`
- Test: `apps/web/public/question-packs/index.json`

- [ ] **Step 1: Build shared package**

Run:

```bash
pnpm --filter @ultraman/shared run build
```

Expected: `tsc -p tsconfig.json` exits `0`

- [ ] **Step 2: Parse index and week-01 with shared schemas**

Run a Node script that imports:

```js
import { QuestionPackIndexSchema, QuestionPackSchema } from './packages/shared/dist/index.js';
```

Expected: both `index.json` and `week-01.json` parse without errors.

- [ ] **Step 3: Build the web app**

Run:

```bash
pnpm --filter @ultraman/web run build
```

Expected: Vite production build exits `0`
