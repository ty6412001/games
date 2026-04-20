# Grade1 Spring Question Bank Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the public question-bank assets from week 1 to week 10 using Sujiaoban grade-1 spring content without changing runtime logic.

**Architecture:** Keep the existing `index.json -> week-XX.json` loading path unchanged. Generate nine new weekly JSON packs that match the shared Zod schemas, then validate every pack with the shared schema entry points.

**Tech Stack:** JSON assets, Vite public files, TypeScript/Zod shared schemas, Node.js validation script

---

### Task 1: Document Scope

**Files:**
- Create: `docs/superpowers/specs/2026-04-19-grade1-spring-question-bank-design.md`
- Create: `docs/superpowers/plans/2026-04-19-grade1-spring-question-bank.md`

- [ ] **Step 1: Write the compact design**

Add the confirmed scope, weekly topics, fixed question counts, and validation rules.

- [ ] **Step 2: Save the execution plan**

Keep the plan focused on asset generation plus schema validation.

### Task 2: Generate Weekly Packs

**Files:**
- Modify: `apps/web/public/question-packs/index.json`
- Create: `apps/web/public/question-packs/week-02.json`
- Create: `apps/web/public/question-packs/week-03.json`
- Create: `apps/web/public/question-packs/week-04.json`
- Create: `apps/web/public/question-packs/week-05.json`
- Create: `apps/web/public/question-packs/week-06.json`
- Create: `apps/web/public/question-packs/week-07.json`
- Create: `apps/web/public/question-packs/week-08.json`
- Create: `apps/web/public/question-packs/week-09.json`
- Create: `apps/web/public/question-packs/week-10.json`

- [ ] **Step 1: Build the weekly content matrix**

Assign a math, chinese, and english topic theme to each week from 2 through 10 and preserve the existing boss order.

- [ ] **Step 2: Generate 55 questions per week**

For each pack, generate `20` math, `20` chinese, and `15` english questions using only the supported question types and unambiguous answers.

- [ ] **Step 3: Update the public index**

Append weeks `2-10` to `apps/web/public/question-packs/index.json` with the correct titles and file paths.

### Task 3: Validate Asset Compatibility

**Files:**
- Test: `packages/shared/src/schemas/question.ts`
- Test: `apps/web/public/question-packs/index.json`
- Test: `apps/web/public/question-packs/week-*.json`

- [ ] **Step 1: Run a schema validation script**

Load `QuestionPackIndexSchema` and `QuestionPackSchema` from `@ultraman/shared` and parse the index plus each weekly pack.

- [ ] **Step 2: Spot-check pack shape**

Confirm week numbers, boss ids, per-subject counts, and question totals for all generated files.

- [ ] **Step 3: Summarize results**

Report the generated weeks, validation outcome, and any residual risks such as textbook-perfect coverage not being independently audited.
