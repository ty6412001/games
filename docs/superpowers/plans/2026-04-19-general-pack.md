# 通用题库替换 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有独立 `brain-pack` 替换为面向亲子共玩的“通用题库”，并把 UI 上的“脑筋急转弯”展示文案同步改成“通用题库”。

**Architecture:** 保持底层 `subject=brain`、独立 pack 文件位置和 `loadBrainPack()` 加载方式不变，只重写 `brain-pack.json` 的题目内容与 topic 结构，并同步调整 `SubjectSelector` / `QuizModal` 的用户可见文案。测试层增加通用题库数据契约和 UI 文案断言。

**Tech Stack:** React, TypeScript, Zustand, Zod schemas, Vitest, Vite

---

### Task 1: 先把通用题库契约写成测试

**Files:**
- Modify: `apps/web/src/data/__tests__/brainPack.test.ts`
- Modify: `apps/web/src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx`

- [ ] **Step 1: 更新 `brainPack.test.ts` 的题库口径**

把现有脑筋急转弯测试改成“通用题库”契约，目标断言：

```ts
describe('general pack', () => {
  it('contains exactly 100 brain-subject questions', () => {
    expect(questions).toHaveLength(100);
    expect(new Set(questions.map((q) => q.subject))).toEqual(new Set(['brain']));
  });

  it('covers the general knowledge topics', () => {
    expect(new Set(questions.map((q) => q.topic))).toEqual(
      new Set(['脑筋急转弯', '十万个为什么', '历史知识', '生活常识', '百科扩展']),
    );
  });

  it('contains no numeric brain-teaser topic', () => {
    expect(questions.some((q) => q.topic.includes('数字'))).toBe(false);
  });
});
```

保留现有：
- 题干唯一
- `choice` 答案在 `options` 中
- `options` 无重复

- [ ] **Step 2: 补一条 SubjectSelector 文案测试**

在 `SubjectSelector.bossContrast.test.tsx` 或相近 UI 测试里增加断言：

```ts
expect(screen.getByRole('button', { name: /通用题库/ })).toBeInTheDocument();
expect(screen.queryByRole('button', { name: /脑筋急转弯/ })).not.toBeInTheDocument();
```

- [ ] **Step 3: 运行聚焦测试确认当前失败**

Run: `pnpm --filter @ultraman/web exec vitest run src/data/__tests__/brainPack.test.ts src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx`

Expected: FAIL，因为当前 pack 内容和 UI 文案都还是旧口径。

- [ ] **Step 4: 提交测试改动**

```bash
git add apps/web/src/data/__tests__/brainPack.test.ts apps/web/src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx
git commit -m "test: define general pack contract"
```

### Task 2: 重写独立 pack 为“通用题库”

**Files:**
- Modify: `apps/web/public/question-packs/brain-pack.json`

- [ ] **Step 1: 更新 pack 元信息**

把标题从：

```json
"title": "脑筋急转弯题库"
```

改成：

```json
"title": "通用题库"
```

保持：
- 总数 `100`
- `subject` 继续为 `brain`
- 继续复用现有 `QuestionPackSchema`

- [ ] **Step 2: 重写 100 道题内容**

内容要求：
- 去掉偏“数字脑筋题”的题目
- 题目 topic 只使用：
  - `脑筋急转弯`
  - `十万个为什么`
  - `历史知识`
  - `生活常识`
  - `百科扩展`
- 继续以 `choice` 为主，`input` 只留少量唯一答案题
- 难度混合，控制在大致：
  - `difficulty 1` 约 `45`
  - `difficulty 2` 约 `35`
  - `difficulty 3` 约 `20`
- 保持亲子共玩取向，不要过冷、过偏、过成人化

- [ ] **Step 3: 运行聚焦数据测试**

Run: `pnpm --filter @ultraman/web exec vitest run src/data/__tests__/brainPack.test.ts`

Expected: PASS，通用题库满足新的 topic 和质量约束。

- [ ] **Step 4: 提交题库改动**

```bash
git add apps/web/public/question-packs/brain-pack.json
git commit -m "feat: replace brain pack with general knowledge pack"
```

### Task 3: 更新 UI 展示文案

**Files:**
- Modify: `apps/web/src/features/quiz/SubjectSelector.tsx`
- Modify: `apps/web/src/features/quiz/QuizModal.tsx`

- [ ] **Step 1: 把 SubjectSelector 卡片文案改成“通用题库”**

在 `SubjectSelector.tsx` 中，把 `brain` 选项从：

```ts
label: '脑筋急转弯'
```

改成：

```ts
label: '通用题库'
```

其余逻辑保持不变。

- [ ] **Step 2: 把 QuizModal 徽章文案改成“通用题库”**

在 `QuizModal.tsx` 的 `subjectBadge` 里，把：

```ts
brain: { label: '急转弯', color: 'bg-amber-600' }
```

改成：

```ts
brain: { label: '通用题库', color: 'bg-amber-600' }
```

- [ ] **Step 3: 运行聚焦 UI 测试**

Run: `pnpm --filter @ultraman/web exec vitest run src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx`

Expected: PASS，界面可见文案已改成“通用题库”。

- [ ] **Step 4: 提交 UI 文案改动**

```bash
git add apps/web/src/features/quiz/SubjectSelector.tsx apps/web/src/features/quiz/QuizModal.tsx
git commit -m "feat: rename brain subject UI to general pack"
```

### Task 4: 全量验证并整理交付

**Files:**
- Review: `apps/web/public/question-packs/brain-pack.json`
- Review: `apps/web/src/data/__tests__/brainPack.test.ts`
- Review: `apps/web/src/features/quiz/SubjectSelector.tsx`
- Review: `apps/web/src/features/quiz/QuizModal.tsx`

- [ ] **Step 1: 做 schema 校验**

Run:

```bash
node --input-type=module -e "import fs from 'node:fs'; import { QuestionPackSchema } from './packages/shared/dist/schemas/question.js'; const pack=JSON.parse(fs.readFileSync('apps/web/public/question-packs/brain-pack.json','utf8')); QuestionPackSchema.parse(pack); const topics=[...new Set(pack.questions.map(q=>q.topic))]; console.log(JSON.stringify({total:pack.questions.length,subjects:[...new Set(pack.questions.map(q=>q.subject))],topics},null,2));"
```

Expected:

```json
{
  "total": 100,
  "subjects": ["brain"],
  "topics": ["脑筋急转弯", "十万个为什么", "历史知识", "生活常识", "百科扩展"]
}
```

- [ ] **Step 2: 运行相关精确测试**

Run: `pnpm --filter @ultraman/web exec vitest run src/data/__tests__/brainPack.test.ts src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx`

Expected: PASS。

- [ ] **Step 3: 运行生产构建**

Run: `pnpm --filter @ultraman/web run build`

Expected: PASS。

- [ ] **Step 4: 提交最终改动**

```bash
git add apps/web/public/question-packs/brain-pack.json apps/web/src/data/__tests__/brainPack.test.ts apps/web/src/features/quiz/SubjectSelector.tsx apps/web/src/features/quiz/QuizModal.tsx apps/web/src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx docs/superpowers/specs/2026-04-19-general-pack-design.md docs/superpowers/plans/2026-04-19-general-pack.md
git commit -m "feat: replace brain pack with general question pack"
```
