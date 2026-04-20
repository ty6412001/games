# 脑筋急转弯独立题库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `brain` 题从周题库中拆出去，落成一份独立的 `100` 题脑筋急转弯题库，并让游戏继续通过现有随机出题流程抽取它。

**Architecture:** 保持 `math/chinese/english` 继续按 `week` 加载，给 `brain` 增加一条独立 pack 加载路径。新增 `brain-pack.json` 和专项数据测试；同时确保 `week-01` 继续保持 `95` 题教材包，不再要求承载 `brain` 题。

**Tech Stack:** React, TypeScript, Zustand, Zod schemas, Vitest, Vite

---

### Task 1: 补脑筋急转弯独立题库契约测试

**Files:**
- Create: `apps/web/src/data/__tests__/brainPack.test.ts`
- Modify: `apps/web/src/data/__tests__/week01CurrentProgressPack.test.ts`

- [ ] **Step 1: 先写 `brain-pack` 的失败测试**

新增 `apps/web/src/data/__tests__/brainPack.test.ts`：

```ts
import { describe, expect, it } from 'vitest';

import pack from '../../../public/question-packs/brain-pack.json';

type Q = {
  id: string;
  subject: string;
  topic: string;
  type: string;
  stem: string;
  options?: string[];
  answer: string;
};

const questions = pack.questions as Q[];
const objective = questions.filter((q) => q.type === 'choice');

describe('brain-pack', () => {
  it('contains exactly 100 brain questions', () => {
    expect(questions).toHaveLength(100);
  });

  it('uses only brain subject', () => {
    expect(new Set(questions.map((q) => q.subject))).toEqual(new Set(['brain']));
  });

  it('uses only choice and input question types', () => {
    expect(new Set(questions.map((q) => q.type))).toEqual(new Set(['choice', 'input']));
  });

  it('covers at least 6 distinct topics', () => {
    expect(new Set(questions.map((q) => q.topic)).size).toBeGreaterThanOrEqual(6);
  });

  it('keeps stems unique', () => {
    const stems = questions.map((q) => q.stem);
    expect(new Set(stems).size).toBe(stems.length);
  });

  it('keeps every choice answer inside options and options unique', () => {
    objective.forEach((q) => {
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options?.length ?? 0);
    });
  });
});
```

- [ ] **Step 2: 给 `week-01` 测试补一条“不含 brain”约束**

在 `apps/web/src/data/__tests__/week01CurrentProgressPack.test.ts` 里加一条：

```ts
it('contains no brain questions', () => {
  expect(questions.some((q) => q.subject === 'brain')).toBe(false);
});
```

- [ ] **Step 3: 运行聚焦数据测试确认当前失败**

Run: `pnpm --filter @ultraman/web run test -- src/data/__tests__/brainPack.test.ts src/data/__tests__/week01CurrentProgressPack.test.ts`

Expected: FAIL，因为 `brain-pack.json` 还不存在或未满足 `100` 题契约。

- [ ] **Step 4: 提交测试改动**

```bash
git add apps/web/src/data/__tests__/brainPack.test.ts apps/web/src/data/__tests__/week01CurrentProgressPack.test.ts
git commit -m "test: define standalone brain pack contract"
```

### Task 2: 落独立 `brain-pack.json` 的 100 道题

**Files:**
- Create: `apps/web/public/question-packs/brain-pack.json`

- [ ] **Step 1: 新建独立题库文件结构**

创建文件头部结构：

```json
{
  "week": 1,
  "title": "脑筋急转弯题库",
  "boss": {
    "id": "zetton",
    "name": "杰顿",
    "hp": 3000
  },
  "questions": []
}
```

说明：
- 继续复用现有 `QuestionPackSchema`，所以保留 `week/boss/questions` 结构
- `week` 使用一个合法占位值，只表示“独立 pack 仍复用 QuestionPackSchema 结构”，不参与普通周次选择

- [ ] **Step 2: 填入 100 道 `brain` 题**

题目要求：
- `id` 使用 `b-pack-001` 到 `b-pack-100`
- `subject` 全部为 `brain`
- `type` 仅 `choice` 或 `input`
- 至少覆盖 `谐音/字词/逻辑/数字/生活反差/观察常识陷阱`
- `choice` 题每题 4 个选项
- `input` 题必须只有唯一答案

生成后保存到 `apps/web/public/question-packs/brain-pack.json`。

- [ ] **Step 3: 运行聚焦数据测试验证题库通过**

Run: `pnpm --filter @ultraman/web run test -- src/data/__tests__/brainPack.test.ts src/data/__tests__/week01CurrentProgressPack.test.ts`

Expected: PASS，`brain-pack` 通过 `100` 题契约，`week-01` 继续不含 `brain`。

- [ ] **Step 4: 提交题库文件**

```bash
git add apps/web/public/question-packs/brain-pack.json
git commit -m "feat: add standalone 100-question brain pack"
```

### Task 3: 让 `brain` 走独立 pack 加载路径

**Files:**
- Modify: `apps/web/src/data/packs/questionPackLoader.ts`
- Modify: `apps/web/src/stores/gameStore.ts`
- Modify: `apps/web/src/stores/__tests__/questionRepeatRules.test.ts`
- Modify: `apps/web/src/stores/__tests__/chanceFlow.test.ts`
- Modify: `apps/web/src/stores/__tests__/wrongBookScope.test.ts`

- [ ] **Step 1: 先给加载器增加 `brain` pack 能力**

在 `questionPackLoader.ts` 中新增独立加载函数，保留原 `loadQuestionPack(week)`：

```ts
const weekCache = new Map<number, QuestionPack>();
let brainPackCache: QuestionPack | null = null;

export const loadBrainPack = async (): Promise<QuestionPack> => {
  if (brainPackCache) return brainPackCache;
  const res = await fetch('/question-packs/brain-pack.json');
  if (!res.ok) {
    throw new Error(`failed to load brain question pack: ${res.status}`);
  }
  const raw = await res.json();
  const pack = QuestionPackSchema.parse(raw);
  brainPackCache = pack;
  return pack;
};
```

原有 `cache` 重命名为 `weekCache`，避免语义混淆。

- [ ] **Step 2: 在 `gameStore` 里按学科选 pack**

修改 `selectSubject` 所依赖的 pack 选择逻辑：

```ts
import { loadBrainPack, loadQuestionPack } from '../data/packs/questionPackLoader.js';

const loadPackForSubject = async (week: number, subject: Subject): Promise<QuestionPack> => {
  if (subject === 'brain') return loadBrainPack();
  return loadQuestionPack(week);
};
```

在需要抽题的地方改成：

```ts
const pack = await loadPackForSubject(game.week, subject);
```

并确保 `state.currentPack` 更新为当前实际使用的 pack。

- [ ] **Step 3: 调整 store 测试 mock，兼容新的 brain pack loader**

所有 mock `questionPackLoader` 的测试补齐 `loadBrainPack`：

```ts
vi.mock('../../data/packs/questionPackLoader.js', () => ({
  loadQuestionPack: () => loadQuestionPackMock(),
  loadBrainPack: () => loadBrainPackMock(),
}));
```

其中 `loadBrainPackMock` 默认返回只含 `brain` 题的 pack。

- [ ] **Step 4: 运行 store 与 picker 相关测试**

Run: `pnpm --filter @ultraman/web run test -- src/stores/__tests__/questionRepeatRules.test.ts src/stores/__tests__/chanceFlow.test.ts src/stores/__tests__/wrongBookScope.test.ts src/domain/__tests__/questionPicker.test.ts`

Expected: PASS，`brain` 题不再依赖周包，既有随机/错题逻辑不回退。

- [ ] **Step 5: 提交加载逻辑改动**

```bash
git add apps/web/src/data/packs/questionPackLoader.ts apps/web/src/stores/gameStore.ts apps/web/src/stores/__tests__/questionRepeatRules.test.ts apps/web/src/stores/__tests__/chanceFlow.test.ts apps/web/src/stores/__tests__/wrongBookScope.test.ts
git commit -m "feat: load brain questions from standalone pack"
```

### Task 4: 全量验证并整理交付

**Files:**
- Review: `apps/web/public/question-packs/brain-pack.json`
- Review: `apps/web/src/data/packs/questionPackLoader.ts`
- Review: `apps/web/src/stores/gameStore.ts`
- Review: `apps/web/src/data/__tests__/brainPack.test.ts`

- [ ] **Step 1: 运行完整 Web 测试**

Run: `pnpm --filter @ultraman/web run test`

Expected: PASS，Web 测试全部通过。

- [ ] **Step 2: 运行生产构建**

Run: `pnpm --filter @ultraman/web run build`

Expected: PASS，构建成功。

- [ ] **Step 3: 做 schema 校验**

Run:

```bash
node --input-type=module -e "import fs from 'node:fs'; import { QuestionPackSchema } from './packages/shared/dist/schemas/question.js'; const brain=JSON.parse(fs.readFileSync('apps/web/public/question-packs/brain-pack.json','utf8')); const week1=JSON.parse(fs.readFileSync('apps/web/public/question-packs/week-01.json','utf8')); QuestionPackSchema.parse(brain); QuestionPackSchema.parse(week1); console.log(JSON.stringify({brain:brain.questions.length,week1:week1.questions.length,week1HasBrain:week1.questions.some(q=>q.subject==='brain')},null,2));"
```

Expected:

```json
{
  "brain": 100,
  "week1": 95,
  "week1HasBrain": false
}
```

- [ ] **Step 4: 提交最终改动**

```bash
git add apps/web/public/question-packs/brain-pack.json apps/web/src/data/packs/questionPackLoader.ts apps/web/src/stores/gameStore.ts apps/web/src/data/__tests__/brainPack.test.ts apps/web/src/data/__tests__/week01CurrentProgressPack.test.ts apps/web/src/stores/__tests__/questionRepeatRules.test.ts apps/web/src/stores/__tests__/chanceFlow.test.ts apps/web/src/stores/__tests__/wrongBookScope.test.ts docs/superpowers/specs/2026-04-19-brain-pack-design.md docs/superpowers/plans/2026-04-19-brain-pack.md
git commit -m "feat: add standalone brain question pack"
```
