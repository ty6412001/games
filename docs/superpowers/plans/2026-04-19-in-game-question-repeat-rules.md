# In-Game Question Repeat Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change in-game question selection so correct answers retire questions for the current game, while wrong or timed-out questions may appear again.

**Architecture:** Keep question-pool selection in `questionPicker`, but move the rule boundary into store state by tracking only correct question ids per subject. Update store logic to mark ids only on correct/help-correct outcomes and keep wrong answers eligible for future random selection.

**Tech Stack:** Zustand store, TypeScript domain helpers, Vitest

---

### Task 1: Replace Per-Subject Asked Tracking

**Files:**
- Modify: `apps/web/src/stores/gameStore.ts`

- [ ] **Step 1: Rename the tracking structure**

Replace the current per-subject `askedQuestionIds` state with a per-subject set of correctly answered ids only.

- [ ] **Step 2: Update question selection**

When selecting a question for a subject, pass only the subject's correctly answered ids to `pickRandomQuestion`.

- [ ] **Step 3: Update answer handling**

On correct/help-correct outcomes, add the current question id into the subject's correct-id set. On wrong/timeout, leave the set unchanged.

### Task 2: Add Regression Tests

**Files:**
- Modify: `apps/web/src/domain/__tests__/questionPicker.test.ts`
- Create or Modify: `apps/web/src/stores/__tests__/questionRepeatRules.test.ts`

- [ ] **Step 1: Keep helper tests green**

Retain existing `questionPicker` coverage and add any missing expectation needed for exclude-only-by-correct behavior.

- [ ] **Step 2: Add store-level repeat-rule tests**

Cover three cases:
- correct answers exclude the question later in the same game
- wrong answers do not exclude the question
- when all questions of a subject are answered correctly, no question is returned

### Task 3: Verify Web Runtime

**Files:**
- Test: `apps/web/src/stores/__tests__/questionRepeatRules.test.ts`
- Test: `apps/web/src/domain/__tests__/questionPicker.test.ts`

- [ ] **Step 1: Run web tests**

Run:

```bash
pnpm --filter @ultraman/web run test
```

Expected: all tests pass

- [ ] **Step 2: Run web build**

Run:

```bash
pnpm --filter @ultraman/web run build
```

Expected: TypeScript and Vite build pass
