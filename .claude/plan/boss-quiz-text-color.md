# Boss 场景题目字体变白（对比度修复） 实施计划

> **Task**: Boss 战斗阶段里，答题弹窗（QuizModal）与学科选择器（SubjectSelector）的文字渲染成浏览器默认黑色 → 在暗色 Boss 背景下几乎看不清。把文字统一为 `text-slate-50`。

## Analysis Summary

- **Claude 评估**：`GameScreen` 在 `phase === 'boss'` 走 `<>` 空 fragment 返回，没有任何文字颜色根节点；而 `phase === 'monopoly'` 的包裹 `<div class="... text-slate-50 ...">` 让整个 overlay 栈通过继承拿到浅色文字。两个受影响 overlay（`QuizModal`、`SubjectSelector`）的根节点**都没有**显式 `text-*` class，所以在 Boss 分支里 fall through 到 `<body>` 的浏览器默认黑色。
- **Codex 评估**（SESSION `codex-1776578097-12031`, lite）：同意根因，优先推荐在组件根节点写死 `text-slate-50` 作为「组件合同」，更稳健于 portal / 未来重用；`GameScreen` boss 分支外包一层作为第二道保险。另外提醒：**子节点里若有显式 `text-black`/`text-slate-900` 会覆盖继承**，需要再核一遍题干 / 选项 DOM。
- **共识**：两层修复都做，简单且互相独立；不跨越本次范围的其他改动。
- **分歧**：无。

## Technical Solution

### 两层修复

1. **组件层**（主修复）：在 `QuizModal` 和 `SubjectSelector` 根 `<div>` 上加 `text-slate-50`（若已有则跳过）
2. **屏幕层**（保险）：`GameScreen` 的 Boss 分支把 `<>` 换成 `<div className="text-slate-50">…</div>`

### 验证子节点无反向污染

对受影响文件的 DOM 走查，确认题干 / 选项元素没有 `text-black` / `text-slate-900` / `text-gray-900` 等硬写深色覆盖（已核查：QuizModal 的 stem `<div>` 无 text-*；options 按钮已是 `text-slate-50` via primaryAction/secondaryAction token）。

### 受影响文件清单（核对前）

| 文件 | 当前根 class | 补丁 |
|---|---|---|
| `apps/web/src/features/game/GameScreen.tsx` Boss 分支 | `<>` | 包一层 `<div className="text-slate-50">…</div>` |
| `apps/web/src/features/quiz/QuizModal.tsx:49` | `fixed inset-0 z-40 ... bg-slate-950/80 p-4 backdrop-blur-sm` | 追加 `text-slate-50` |
| `apps/web/src/features/quiz/SubjectSelector.tsx:51` | `fixed inset-0 z-40 ... bg-slate-950/85 p-4 backdrop-blur-sm` | 追加 `text-slate-50` |

注：`ChanceCardOverlay`、`QuizResultToast`、`WeaponAwardToast`、`BattleEffect` 已自设文字颜色，本次不改。

## Implementation Steps

每步对应一次可单独验证的小改动。

### 1. 验证子节点无 text-* 覆盖（只读复查）

- [ ] `grep -nE "text-(black|gray-9|slate-9)" apps/web/src/features/quiz/QuizModal.tsx apps/web/src/features/quiz/SubjectSelector.tsx` 应无命中（按钮上的 `primaryAction.textClass = text-slate-950` 是设计性黑字在琥珀底，不属于此问题）

### 2. QuizModal 根容器追加 `text-slate-50`

- [ ] `apps/web/src/features/quiz/QuizModal.tsx:49` 把
  ```tsx
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
  ```
  改成
  ```tsx
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 p-4 text-slate-50 backdrop-blur-sm">
  ```
- [ ] 运行 `pnpm --filter @ultraman/web typecheck && pnpm --filter @ultraman/web lint`

### 3. SubjectSelector 根容器追加 `text-slate-50`

- [ ] `apps/web/src/features/quiz/SubjectSelector.tsx:51` 把
  ```tsx
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
  ```
  改成
  ```tsx
  <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-4 text-slate-50 backdrop-blur-sm">
  ```
- [ ] 运行 `pnpm --filter @ultraman/web typecheck`

### 4. GameScreen 的 Boss 分支加保险外壳

- [ ] `apps/web/src/features/game/GameScreen.tsx:19-29` 把
  ```tsx
  if (game.phase === 'boss') {
    return (
      <>
        <BossScene />
        <SubjectSelector />
        <QuizModal />
        <BattleEffect />
        <QuizResultToast />
        <WeaponAwardToast />
      </>
    );
  }
  ```
  改成
  ```tsx
  if (game.phase === 'boss') {
    return (
      <div className="text-slate-50">
        <BossScene />
        <SubjectSelector />
        <QuizModal />
        <BattleEffect />
        <QuizResultToast />
        <WeaponAwardToast />
      </div>
    );
  }
  ```

  注意：`BossScene` 已有 `h-[100svh]` 布局；额外外壳不会影响其全屏样式。

### 5. 添加 RTL 单元测试（断言根节点含 `text-slate-50`）

- [ ] 新建 `apps/web/src/features/quiz/__tests__/QuizModal.bossContrast.test.tsx`

```ts
import { render } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import type { ActiveQuiz } from '../../../stores/gameStore';

import { useGameStore } from '../../../stores/gameStore';
import { QuizModal } from '../QuizModal';

describe('QuizModal text color on boss phase', () => {
  beforeEach(() => {
    const quiz: ActiveQuiz = {
      playerId: 'p1',
      usedHelp: false,
      startedAt: Date.now(),
      deadlineAt: Date.now() + 30_000,
      context: { kind: 'boss-attack' },
      question: {
        id: 'q1',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
        type: 'choice',
        stem: '1 + 1 = ?',
        options: ['2', '3'],
        answer: '2',
      },
    };
    useGameStore.setState({
      childId: 'p1',
      activeQuiz: quiz,
      game: {
        id: 'g', startedAt: 0, durationMin: 20, week: 1, currentTurn: 0,
        phase: 'boss', tiles: [],
        players: [{
          id: 'p1', name: '小朋友', isChild: true,
          hero: { heroId: 'tiga', badge: 1 },
          position: 0, money: 1000, helpCards: 1, streak: 0,
          ownedTiles: [], housesByTile: {}, weaponIds: [],
        }],
      },
    });
  });

  it('root backdrop carries text-slate-50 so text inherits a readable color', () => {
    const { container } = render(<QuizModal />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('text-slate-50');
  });
});
```

- [ ] 新建 `apps/web/src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx` — 同样模板，断言 SubjectSelector 根 `text-slate-50`。

### 6. 全量回归 + 手动验证

- [ ] `pnpm --filter @ultraman/web test`
- [ ] `pnpm --filter @ultraman/web build`
- [ ] `pnpm --filter @ultraman/web test:e2e`
- [ ] 本地手动：`pnpm --filter @ultraman/web dev` → 启动游戏 → 到达 Boss 战斗 → 发起攻击弹出答题 → 确认题干、选项、描述文字都是浅色

## Key Files

| 文件 | 操作 | 描述 |
|---|---|---|
| `apps/web/src/features/quiz/QuizModal.tsx:49` | Modify | 根容器追加 `text-slate-50` |
| `apps/web/src/features/quiz/SubjectSelector.tsx:51` | Modify | 根容器追加 `text-slate-50` |
| `apps/web/src/features/game/GameScreen.tsx:19-29` | Modify | Boss 分支 `<>` → `<div className="text-slate-50">` |
| `apps/web/src/features/quiz/__tests__/QuizModal.bossContrast.test.tsx` | Create | 根 class 断言 |
| `apps/web/src/features/quiz/__tests__/SubjectSelector.bossContrast.test.tsx` | Create | 根 class 断言 |

## Risks and Mitigation

| 风险 | 严重度 | 缓解 |
|---|---|---|
| `<div>` 外壳影响 BossScene 全屏布局 | LOW | BossScene 内部用 `h-[100svh]`，外壳只加 `text-slate-50`，不影响盒模型 |
| 子节点里有未发现的 `text-*` 深色 class 覆盖继承 | LOW | 步骤 1 已 grep 核查；若将来新增请在组件单测里断言 |
| 其他回归（monopoly 分支、非 Boss 题目） | LOW | monopoly 已有 `text-slate-50` 根，新改动与其叠加等价；无视觉差异 |
| 改动与最近的用户编辑冲突 | LOW | 仅 2 处单行 class 追加 + 1 处外壳，冲突面极小 |

## Test Strategy

| Test Type | Scope | Verification |
|---|---|---|
| 单元（组件）| `QuizModal`、`SubjectSelector` 根节点 | class 含 `text-slate-50` |
| E2E 回归 | Playwright 全部现有 7 条 | 保持绿色 |
| 类型 / 代码风格 | `tsc --noEmit`、`eslint` | 无新报错 |
| 手动视觉 | Boss 战斗场景真题弹窗 | 题干与选项在深色背景上清晰可读 |

## Execution Model Routing

- 3 处代码改动全是纯文本追加 class，< 30 行，**Claude 直接改更快**，不值得 round-trip 给 Codex
- 2 条新单测可由 Codex `--lite` 生成（简单 RTL 模板），也可由 Claude 直接写
- Codex Reviewer 仍做 audit（检查漏网的 `text-black` 等覆盖）

## SESSION_ID

- `CODEX_SESSION: codex-1776578097-12031`

---

**Plan generated and saved to `.claude/plan/boss-quiz-text-color.md`**

**Please review the plan above. You can:**
- **Modify plan**: Tell me what needs adjustment, I'll update the plan
- **Execute plan**: Copy the following command to a new session

```
/ecc:multi-execute .claude/plan/boss-quiz-text-color.md
```
