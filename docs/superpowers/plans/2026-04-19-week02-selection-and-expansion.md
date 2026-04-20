# week 题库选择 + week-02 扩容 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 setup 流程中补 week 题库选择入口，并把 `week-02` 扩成 `95` 题的教材进度包。

**Architecture:** UI 侧在现有 setup 页面读取题库索引并渲染 week 选择区，默认 `week-01`，显式支持 `week-02`。数据侧重写 `week-02.json` 为 `95` 题，保持 `week-01` 和独立 `brain-pack` 不受影响。测试侧同时覆盖 setup 选周和 `week-02` 数据契约。

**Tech Stack:** React, TypeScript, Zustand, Zod schemas, Vitest, Vite

---

### Task 1: 为 week 选择入口补测试

**Files:**
- Inspect: `apps/web/src/features/menu/*`
- Modify: `apps/web/src/__tests__/smoke.test.tsx` 或 setup 相关测试文件

- [ ] **Step 1: 先找到 setup/开始游戏 UI 的实际文件和现有测试入口**

Run: `rg -n "开始游戏|week|duration|玩家" apps/web/src`

Expected: 找到 setup 页面组件和已有测试文件。

- [ ] **Step 2: 给 setup 补一个选周测试**

在合适的测试文件中增加断言，验证：

```ts
it('shows week selection with week-01 and week-02 options', async () => {
  render(<App />);
  await userEvent.click(screen.getByRole('button', { name: '▶ 开始游戏' }));

  expect(screen.getByText(/第1周/)).toBeInTheDocument();
  expect(screen.getByText(/第2周/)).toBeInTheDocument();
});
```

如果现有 setup 用的不是上述文本，按真实 UI 文案等价调整。

- [ ] **Step 3: 运行聚焦测试确认当前失败**

Run: `pnpm --filter @ultraman/web run test -- src/__tests__/smoke.test.tsx`

Expected: FAIL，因为当前 UI 还没有 week 选择入口或不包含 `week-02` 选项。

- [ ] **Step 4: 提交测试改动**

```bash
git add apps/web/src/__tests__/smoke.test.tsx
git commit -m "test: define week selection in setup"
```

### Task 2: 在 setup 页面接入 week 选择

**Files:**
- Modify: setup/开始游戏相关组件（按 Task 1 定位结果）
- Modify: 相关 store 或初始化参数流转文件（如需要）

- [ ] **Step 1: 在 setup 页增加 week 选择区**

目标行为：
- 默认选中 `week-01`
- 明确可切换 `week-01` 与 `week-02`
- 基于现有题库索引或现有 week 数据源渲染，不把逻辑写死在按钮事件里

最小 UI 结构示例：

```tsx
<section>
  <h3>题库周次</h3>
  <div>
    <button type="button" aria-pressed={selectedWeek === 1}>第1周</button>
    <button type="button" aria-pressed={selectedWeek === 2}>第2周</button>
  </div>
</section>
```

- [ ] **Step 2: 保证开始游戏时把选中的 week 传进现有 startGame 流程**

目标是让现有：

```ts
startGame({ duration, week, players })
```

里的 `week` 真正来自 setup 选择值，而不是硬编码默认值。

- [ ] **Step 3: 运行相关测试**

Run: `pnpm --filter @ultraman/web run test -- src/__tests__/smoke.test.tsx`

Expected: PASS，setup 中可以看到并选择 `week-01` / `week-02`。

- [ ] **Step 4: 提交 UI 接线改动**

```bash
git add apps/web/src
git commit -m "feat: add week selection to setup"
```

### Task 3: 给 week-02 补数据契约测试

**Files:**
- Create: `apps/web/src/data/__tests__/week02ExpandedPack.test.ts`

- [ ] **Step 1: 先写 week-02 数据测试**

新增测试文件：

```ts
import { describe, expect, it } from 'vitest';
import pack from '../../../public/question-packs/week-02.json';

type Q = {
  subject: string;
  type: string;
  stem: string;
  options?: string[];
  answer: string;
};

const questions = pack.questions as Q[];
const math = questions.filter((q) => q.subject === 'math');
const chinese = questions.filter((q) => q.subject === 'chinese');
const english = questions.filter((q) => q.subject === 'english');
const objective = questions.filter((q) => q.type === 'choice' || q.type === 'image-choice');

describe('week-02 expanded pack', () => {
  it('contains 95 questions with 40/40/15 split', () => {
    expect(questions).toHaveLength(95);
    expect(math).toHaveLength(40);
    expect(chinese).toHaveLength(40);
    expect(english).toHaveLength(15);
  });

  it('contains no brain questions', () => {
    expect(questions.some((q) => q.subject === 'brain')).toBe(false);
  });

  it('keeps stems unique', () => {
    const stems = questions.map((q) => q.stem);
    expect(new Set(stems).size).toBe(stems.length);
  });

  it('keeps every objective answer inside options', () => {
    objective.forEach((q) => expect(q.options).toContain(q.answer));
  });
});
```

- [ ] **Step 2: 运行聚焦测试确认当前失败**

Run: `pnpm --filter @ultraman/web run test -- src/data/__tests__/week02ExpandedPack.test.ts`

Expected: FAIL，因为当前 `week-02` 只有 `55` 题。

- [ ] **Step 3: 提交测试改动**

```bash
git add apps/web/src/data/__tests__/week02ExpandedPack.test.ts
git commit -m "test: define week-02 expanded pack contract"
```

### Task 4: 重写 week-02 为 95 题

**Files:**
- Modify: `apps/web/public/question-packs/week-02.json`
- Modify: `apps/web/public/question-packs/index.json`（仅当标题需要同步时）

- [ ] **Step 1: 重写 week-02 题包结构**

目标：
- 总数 `95`
- `math 40 / chinese 40 / english 15`
- 不含 `brain`
- 标题文案应反映这是扩容后的教材进度包

- [ ] **Step 2: 按用户口径生成题目**

数学：
- 覆盖苏教版目录 `1-5`
- 以最新单元为主，前置单元复习补充

语文：
- 覆盖苏教版一下 `1-4` 单元全部内容
- 以最新单元为主，前面单元作复习补充

英语：
- `15` 题
- 延续当前教材口径
- 最新单元为主，前置单元补充

质量约束：
- 仍以 `choice` 为主
- `input` 仅唯一答案
- 题干唯一
- 不做低质量重复堆题

- [ ] **Step 3: 运行 week-02 聚焦数据测试**

Run: `pnpm --filter @ultraman/web run test -- src/data/__tests__/week02ExpandedPack.test.ts`

Expected: PASS，`week-02` 满足 `95` 题和 `40/40/15` 结构。

- [ ] **Step 4: 提交题库改动**

```bash
git add apps/web/public/question-packs/week-02.json apps/web/public/question-packs/index.json
git commit -m "feat: expand week-02 pack to 95 questions"
```

### Task 5: 全量验证并整理交付

**Files:**
- Review: `apps/web/public/question-packs/week-02.json`
- Review: `apps/web/src/data/__tests__/week02ExpandedPack.test.ts`
- Review: setup/开始游戏相关 UI 文件

- [ ] **Step 1: 做 schema 校验**

Run:

```bash
node --input-type=module -e "import fs from 'node:fs'; import { QuestionPackSchema } from './packages/shared/dist/schemas/question.js'; const pack=JSON.parse(fs.readFileSync('apps/web/public/question-packs/week-02.json','utf8')); QuestionPackSchema.parse(pack); const bySubject=pack.questions.reduce((m,q)=>(m[q.subject]=(m[q.subject]||0)+1,m),{}); console.log(JSON.stringify({total:pack.questions.length,bySubject},null,2));"
```

Expected:

```json
{
  "total": 95,
  "bySubject": {
    "math": 40,
    "chinese": 40,
    "english": 15
  }
}
```

- [ ] **Step 2: 运行完整 Web 测试**

Run: `pnpm --filter @ultraman/web run test`

Expected: PASS。

- [ ] **Step 3: 运行生产构建**

Run: `pnpm --filter @ultraman/web run build`

Expected: PASS。

- [ ] **Step 4: 提交最终改动**

```bash
git add apps/web/public/question-packs/week-02.json apps/web/public/question-packs/index.json apps/web/src docs/superpowers/specs/2026-04-19-week02-selection-and-expansion-design.md docs/superpowers/plans/2026-04-19-week02-selection-and-expansion.md
git commit -m "feat: add week selection and expand week-02 pack"
```
