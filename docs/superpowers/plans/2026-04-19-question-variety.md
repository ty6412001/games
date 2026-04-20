# Question Variety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce back-to-back same-kind questions across all subjects by adding short-horizon topic/type/difficulty variety rules on top of the existing “correct answers do not repeat in the same game” behavior.

**Architecture:** Keep the question JSON packs unchanged. Extend the in-memory game state with a tiny recent-question history per subject, teach `pickRandomQuestion` to prefer candidates that differ from the recent history, then route both week packs and the general pack through the same selection path. Preserve graceful fallback so small subject pools still return a question.

**Tech Stack:** React, Zustand, TypeScript, Vitest, Vite

---

## File Map

- Modify: `apps/web/src/domain/questionPicker.ts`
  - Add a variety-aware candidate selection API that scores or filters by recent history while preserving current exclude-by-correct behavior.
- Modify: `apps/web/src/domain/__tests__/questionPicker.test.ts`
  - Add focused domain-level tests for topic/type/difficulty variety and fallback.
- Modify: `apps/web/src/stores/gameStore.ts`
  - Store recent question history per subject, pass it into the picker, and update history whenever a question is started.
- Modify: `apps/web/src/stores/__tests__/questionRepeatRules.test.ts`
  - Add integration coverage proving week packs and `brain` use the same variety behavior while still allowing wrong answers to reappear.
- Optional verify only: `apps/web/src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx`
  - No functional changes planned; only touch if store shape changes force fixture updates.

## Task 1: Add Domain-Level Variety Selection

**Files:**
- Modify: `apps/web/src/domain/questionPicker.ts`
- Test: `apps/web/src/domain/__tests__/questionPicker.test.ts`

- [ ] **Step 1: Write the failing domain tests for variety preference**

Add these tests to `apps/web/src/domain/__tests__/questionPicker.test.ts`:

```ts
it('prefers a different topic when another candidate exists', () => {
  const variedPack: QuestionPack = {
    ...pack,
    questions: [
      {
        id: 'm1',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
        stem: '1+1',
        type: 'choice',
        options: ['1', '2'],
        answer: '2',
      },
      {
        id: 'm2',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
        stem: '1+2',
        type: 'choice',
        options: ['2', '3'],
        answer: '3',
      },
      {
        id: 'm3',
        subject: 'math',
        difficulty: 1,
        topic: '减法',
        stem: '3-1',
        type: 'choice',
        options: ['1', '2'],
        answer: '2',
      },
    ],
  };

  const result = pickRandomQuestion(variedPack, {
    subject: 'math',
    recentQuestions: [{ questionId: 'm1', topic: '加法', type: 'choice', difficulty: 1 }],
    rand: () => 0,
  });

  expect(result?.id).toBe('m3');
});

it('falls back to same topic when no other topic exists', () => {
  const sameTopicPack: QuestionPack = {
    ...pack,
    questions: [
      {
        id: 'm1',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
        stem: '1+1',
        type: 'choice',
        options: ['1', '2'],
        answer: '2',
      },
      {
        id: 'm2',
        subject: 'math',
        difficulty: 2,
        topic: '加法',
        stem: '2+2',
        type: 'input',
        answer: '4',
      },
    ],
  };

  const result = pickRandomQuestion(sameTopicPack, {
    subject: 'math',
    recentQuestions: [{ questionId: 'm1', topic: '加法', type: 'choice', difficulty: 1 }],
    excludeIds: ['m1'],
    rand: () => 0,
  });

  expect(result?.id).toBe('m2');
});

it('prefers a different type after topic is already varied', () => {
  const variedPack: QuestionPack = {
    ...pack,
    questions: [
      {
        id: 'm1',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
        stem: '1+1',
        type: 'choice',
        options: ['1', '2'],
        answer: '2',
      },
      {
        id: 'm2',
        subject: 'math',
        difficulty: 1,
        topic: '减法',
        stem: '3-1',
        type: 'choice',
        options: ['1', '2'],
        answer: '2',
      },
      {
        id: 'm3',
        subject: 'math',
        difficulty: 1,
        topic: '长度',
        stem: '填空',
        type: 'input',
        answer: '米',
      },
    ],
  };

  const result = pickRandomQuestion(variedPack, {
    subject: 'math',
    recentQuestions: [{ questionId: 'm1', topic: '加法', type: 'choice', difficulty: 1 }],
    rand: () => 0,
  });

  expect(result?.id).toBe('m3');
});

it('prefers a different difficulty when topic and type can both vary', () => {
  const variedPack: QuestionPack = {
    ...pack,
    questions: [
      {
        id: 'm1',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
        stem: '1+1',
        type: 'choice',
        options: ['1', '2'],
        answer: '2',
      },
      {
        id: 'm2',
        subject: 'math',
        difficulty: 1,
        topic: '减法',
        stem: '3-1',
        type: 'input',
        answer: '2',
      },
      {
        id: 'm3',
        subject: 'math',
        difficulty: 2,
        topic: '长度',
        stem: '单位',
        type: 'ordering',
        items: ['米', '厘米'],
        answer: '米,厘米',
      },
    ],
  };

  const result = pickRandomQuestion(variedPack, {
    subject: 'math',
    recentQuestions: [{ questionId: 'm1', topic: '加法', type: 'choice', difficulty: 1 }],
    rand: () => 0,
  });

  expect(result?.id).toBe('m3');
});
```

- [ ] **Step 2: Run the domain test file and verify the new cases fail**

Run:

```bash
pnpm --filter @ultraman/web exec vitest run src/domain/__tests__/questionPicker.test.ts
```

Expected: FAIL because `pickRandomQuestion` does not yet accept `recentQuestions` and still picks from a flat random pool.

- [ ] **Step 3: Implement minimal variety-aware selection in the domain**

Update `apps/web/src/domain/questionPicker.ts` with a small recent-history type and a layered fallback helper:

```ts
import type { Question, QuestionPack, Subject } from '@ultraman/shared';

type Rand = () => number;

export type RecentQuestionMeta = {
  questionId: string;
  topic: string;
  type: Question['type'];
  difficulty: Question['difficulty'];
};

const randomFromPool = (pool: readonly Question[], rand: Rand): Question | null => {
  if (pool.length === 0) return null;
  const idx = Math.floor(rand() * pool.length);
  return pool[idx] ?? null;
};

const preferByDifference = (
  pool: readonly Question[],
  recent: RecentQuestionMeta | null,
): readonly Question[] => {
  if (!recent) return pool;

  const differentTopic = pool.filter((q) => q.topic !== recent.topic);
  const topicPool = differentTopic.length > 0 ? differentTopic : pool;

  const differentType = topicPool.filter((q) => q.type !== recent.type);
  const typePool = differentType.length > 0 ? differentType : topicPool;

  const differentDifficulty = typePool.filter((q) => q.difficulty !== recent.difficulty);
  return differentDifficulty.length > 0 ? differentDifficulty : typePool;
};

export const pickRandomQuestion = (
  pack: QuestionPack,
  options: {
    excludeIds?: Iterable<string>;
    subject?: Subject;
    rand?: Rand;
    recentQuestions?: readonly RecentQuestionMeta[];
  } = {},
): Question | null => {
  const rand = options.rand ?? Math.random;
  const excludeSet = new Set(options.excludeIds ?? []);
  const pool = pack.questions.filter((q) => {
    if (excludeSet.has(q.id)) return false;
    if (options.subject && q.subject !== options.subject) return false;
    return true;
  });

  const recent = options.recentQuestions?.at(-1) ?? null;
  return randomFromPool(preferByDifference(pool, recent), rand);
};
```

- [ ] **Step 4: Run the domain test file again**

Run:

```bash
pnpm --filter @ultraman/web exec vitest run src/domain/__tests__/questionPicker.test.ts
```

Expected: PASS with all existing tests plus the new variety cases green.

- [ ] **Step 5: Commit the domain change**

```bash
git add apps/web/src/domain/questionPicker.ts apps/web/src/domain/__tests__/questionPicker.test.ts
git commit -m "feat: vary question selection by recent history"
```

## Task 2: Track Recent Question History in the Store

**Files:**
- Modify: `apps/web/src/stores/gameStore.ts`
- Test: `apps/web/src/stores/__tests__/questionRepeatRules.test.ts`

- [ ] **Step 1: Write the failing store tests for recent-history behavior**

Add these tests to `apps/web/src/stores/__tests__/questionRepeatRules.test.ts`:

```ts
it('records recent question history per subject when a new week-pack quiz starts', async () => {
  loadQuestionPackMock.mockResolvedValueOnce({
    week: 1,
    title: 'w1',
    boss: { id: 'zetton', name: 'z', hp: 3000 },
    questions: [
      {
        id: 'm1',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
        type: 'choice',
        stem: '1+1',
        options: ['1', '2'],
        answer: '2',
      },
      {
        id: 'm2',
        subject: 'math',
        difficulty: 2,
        topic: '减法',
        type: 'input',
        stem: '3-1',
        answer: '2',
      },
    ],
  } as never);

  const useGameStore = await startGame();
  const playerId = useGameStore.getState().game!.players[0]!.id;

  useGameStore.setState({
    childId: null,
    pendingQuiz: { context: { kind: 'study' }, playerId },
  });

  await useGameStore.getState().selectSubject('math');

  const history = useGameStore.getState().recentQuestionHistory.math;
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ questionId: expect.any(String), topic: expect.any(String) });
});

it('trims recent history to the latest two entries', async () => {
  const useGameStore = await startGame();

  useGameStore.setState({
    recentQuestionHistory: {
      math: [
        { questionId: 'm1', topic: '加法', type: 'choice', difficulty: 1 },
        { questionId: 'm2', topic: '减法', type: 'input', difficulty: 2 },
      ],
      chinese: [],
      english: [],
      brain: [],
    },
  });

  const updated = useGameStore.getState();
  expect(updated.recentQuestionHistory.math).toHaveLength(2);
});

it('applies the same recent-history variety path when selecting brain questions', async () => {
  loadBrainPackMock.mockResolvedValueOnce(
    buildBrainPack([
      {
        id: 'b1',
        subject: 'brain',
        difficulty: 1,
        topic: '脑筋急转弯',
        type: 'choice',
        stem: '题一',
        options: ['甲', '乙'],
        answer: '甲',
      },
      {
        id: 'b2',
        subject: 'brain',
        difficulty: 2,
        topic: '历史知识',
        type: 'input',
        stem: '题二',
        answer: '乙',
      },
    ]) as never,
  );

  const useGameStore = await startGame();
  const playerId = useGameStore.getState().game!.players[0]!.id;

  useGameStore.setState({
    childId: null,
    pendingQuiz: { context: { kind: 'study' }, playerId },
    recentQuestionHistory: {
      math: [],
      chinese: [],
      english: [],
      brain: [{ questionId: 'b1', topic: '脑筋急转弯', type: 'choice', difficulty: 1 }],
    },
  });

  await useGameStore.getState().selectSubject('brain');

  expect(useGameStore.getState().activeQuiz?.question.id).toBe('b2');
});
```

- [ ] **Step 2: Run the store test file and verify it fails**

Run:

```bash
pnpm --filter @ultraman/web exec vitest run src/stores/__tests__/questionRepeatRules.test.ts
```

Expected: FAIL because the store has no `recentQuestionHistory` yet and never passes history into `pickRandomQuestion`.

- [ ] **Step 3: Implement recent-history state and wire it into selection**

Update `apps/web/src/stores/gameStore.ts` with:

```ts
import {
  countdownSeconds,
  isAnswerCorrect,
  pickRandomQuestion,
  rewardFor,
  type RecentQuestionMeta,
} from '../domain/questionPicker.js';

type RecentBySubject = Record<Subject, RecentQuestionMeta[]>;

const emptyRecentHistory = (): RecentBySubject => ({
  math: [],
  chinese: [],
  english: [],
  brain: [],
});

const pushRecentQuestion = (
  recentHistory: RecentBySubject,
  question: Question,
): RecentBySubject => {
  const next = [
    ...recentHistory[question.subject],
    {
      questionId: question.id,
      topic: question.topic,
      type: question.type,
      difficulty: question.difficulty,
    },
  ].slice(-2);

  return {
    ...recentHistory,
    [question.subject]: next,
  };
};
```

Extend store state:

```ts
type Store = {
  // ...
  recentQuestionHistory: RecentBySubject;
  // ...
};
```

Initialize and reset it anywhere `correctQuestionIds` is initialized/reset:

```ts
recentQuestionHistory: emptyRecentHistory(),
```

Update `pickQuestionForSubject` to accept recent history:

```ts
const pickQuestionForSubject = (
  pack: QuestionPack,
  correctIds: CorrectBySubject,
  recentHistory: RecentBySubject,
  subject: Subject,
): { question: Question } | null => {
  const subjectCorrect = correctIds[subject];
  const fresh = pickRandomQuestion(pack, {
    subject,
    excludeIds: subjectCorrect,
    recentQuestions: recentHistory[subject],
  });
  if (!fresh) return null;
  return { question: fresh };
};
```

Whenever `pickQuestionForSubject(...)` is called, pass `state.recentQuestionHistory` or `latest.recentQuestionHistory`.

Inside `startQuiz`, also update recent history:

```ts
const startQuiz = (params: {
  question: Question;
  context: QuizContext;
  playerId: string;
  recentQuestionHistory: RecentBySubject;
}): Partial<Store> => {
  const now = Date.now();
  return {
    activeQuiz: {
      question: params.question,
      context: params.context,
      playerId: params.playerId,
      usedHelp: false,
      startedAt: now,
      deadlineAt: now + countdownSeconds(params.question) * 1000,
    },
    pendingQuiz: null,
    recentQuestionHistory: pushRecentQuestion(params.recentQuestionHistory, params.question),
  };
};
```

Update the call sites accordingly.

- [ ] **Step 4: Run the store test file again**

Run:

```bash
pnpm --filter @ultraman/web exec vitest run src/stores/__tests__/questionRepeatRules.test.ts
```

Expected: PASS with the existing repeat-rule behavior preserved and the new recent-history cases green.

- [ ] **Step 5: Commit the store change**

```bash
git add apps/web/src/stores/gameStore.ts apps/web/src/stores/__tests__/questionRepeatRules.test.ts
git commit -m "feat: avoid back-to-back same-kind questions"
```

## Task 3: Run Targeted Regression and Build Verification

**Files:**
- Verify only: `apps/web/src/domain/__tests__/questionPicker.test.ts`
- Verify only: `apps/web/src/stores/__tests__/questionRepeatRules.test.ts`
- Verify only: `apps/web/src/data/__tests__/brainPack.test.ts`
- Verify only: `apps/web/src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx`

- [ ] **Step 1: Run the focused test suite that covers week and general-pack behavior**

Run:

```bash
pnpm --filter @ultraman/web exec vitest run \
  src/domain/__tests__/questionPicker.test.ts \
  src/stores/__tests__/questionRepeatRules.test.ts \
  src/data/__tests__/brainPack.test.ts \
  src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx
```

Expected: PASS. This confirms:

- domain-level variety preference works
- same-game correct/wrong repeat rules still hold
- `brain` pack still validates
- subject selector still reports general-pack counts correctly

- [ ] **Step 2: Run the production build**

Run:

```bash
pnpm --filter @ultraman/web run build
```

Expected: PASS with `tsc --noEmit` and Vite production build succeeding.

- [ ] **Step 3: Commit the verification-safe final state**

```bash
git add apps/web/src/domain/questionPicker.ts \
  apps/web/src/domain/__tests__/questionPicker.test.ts \
  apps/web/src/stores/gameStore.ts \
  apps/web/src/stores/__tests__/questionRepeatRules.test.ts
git commit -m "test: cover question variety selection"
```

## Self-Review

- Spec coverage: all spec sections are mapped
  - recent in-memory history: Task 2
  - layered topic/type/difficulty preference: Task 1
  - shared behavior for week + general pack: Task 2 and Task 3
  - graceful fallback for small pools: Task 1 tests
  - verification: Task 3
- Placeholder scan: no `TODO`/`TBD`/defer-later steps left in the plan.
- Type consistency: the plan uses `RecentQuestionMeta`, `RecentBySubject`, `recentQuestionHistory`, and `pickQuestionForSubject(...)` consistently across tasks.
