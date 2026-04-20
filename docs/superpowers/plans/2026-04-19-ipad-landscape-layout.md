# iPad 横屏布局适配 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正游戏页面在 iPad 横屏浏览器中的可视区域溢出问题，让棋盘、当前玩家区、掷骰按钮和排行榜底部都能在首屏内可见或通过局部滚动访问。

**Architecture:** 保留现有三栏结构，只调整 `GameScreen` 的高度与网格分配策略，让页面从“固定整屏裁切”变为“主体自适应 + 侧栏局部滚动”。棋盘继续保持正方形，但改为优先受可用高度限制；左右侧栏改为可收缩、内部列表局部滚动。

**Tech Stack:** React, TypeScript, Zustand, Tailwind CSS, Playwright, Vitest

---

### Task 1: 扩充 iPad 横屏视口测试

**Files:**
- Modify: `apps/web/tests/e2e/fitsInViewport.spec.ts`

- [ ] **Step 1: 写出针对 iPad 横屏的失败测试**

在 `apps/web/tests/e2e/fitsInViewport.spec.ts` 中新增一个独立测试，用 `iPad` 横屏等价视口启动游戏并断言关键元素处于视口中：

```ts
test('game screen fits ipad landscape viewport without clipping primary controls', async ({ page }) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto('/');
  await page.getByRole('button', { name: '▶ 开始游戏' }).click();
  await page.getByRole('button', { name: '⚡ 开始游戏' }).click();

  await expect(page.getByRole('button', { name: /🎲 掷骰/ })).toBeInViewport();
  await expect(page.getByText(/第 1 周/).first()).toBeInViewport();
  await expect(page.getByText(/🎲 上次骰/)).toBeInViewport();
});
```

- [ ] **Step 2: 运行单个 e2e 测试并确认当前布局会暴露问题**

Run: `pnpm --filter @ultraman/web exec playwright test tests/e2e/fitsInViewport.spec.ts --project=chromium`

Expected: 至少 iPad 横屏相关断言暴露当前布局的裁切问题，或者测试本身显示关键元素无法进入视口。

- [ ] **Step 3: 提交测试改动**

```bash
git add apps/web/tests/e2e/fitsInViewport.spec.ts
git commit -m "test: cover ipad landscape viewport fit"
```

### Task 2: 调整主布局以避免整屏裁切

**Files:**
- Modify: `apps/web/src/features/game/GameScreen.tsx`

- [ ] **Step 1: 先让布局代码为测试失败提供真实入口**

确认 `GameScreen` 当前仍包含以下会导致裁切的结构，并以此为修改边界：

```tsx
<div className="h-[100svh] overflow-hidden bg-slate-950 p-2 text-slate-50 md:p-3">
  <div
    className="mx-auto grid h-full max-w-[1440px] gap-2"
    style={{
      gridTemplateColumns: 'clamp(200px, 18vw, 260px) minmax(0, 1fr) clamp(200px, 18vw, 260px)',
    }}
  >
```

- [ ] **Step 2: 改成允许兜底滚动且更适合平板横屏的网格容器**

将 `GameScreen` 主容器改成 `min-h-[100svh] overflow-y-auto`，并为中间网格添加更柔性的列宽和最小高度控制。目标实现如下：

```tsx
return (
  <div className="min-h-[100svh] overflow-y-auto bg-slate-950 p-2 text-slate-50 md:p-3">
    <div
      className="mx-auto grid min-h-[calc(100svh-1rem)] max-w-[1440px] gap-2 md:min-h-[calc(100svh-1.5rem)] lg:overflow-hidden"
      style={{
        gridTemplateColumns: 'clamp(210px, 20vw, 250px) minmax(0, 1fr) clamp(210px, 20vw, 250px)',
      }}
    >
      <div className="min-h-0">
        <CurrentPlayerSpotlight />
      </div>
      <div className="flex min-h-0 min-w-0 items-center justify-center py-1">
        <div className="aspect-square w-full max-w-[min(100%,calc(100svh-2.5rem))]">
          <Board />
        </div>
      </div>
      <div className="min-h-0">
        <Leaderboard />
      </div>
    </div>
```

允许实际类名做等价调整，但必须满足：
- 外层不再 `overflow-hidden`
- 棋盘尺寸同时受宽度和视口高度约束
- 侧栏能在网格高度内使用内部滚动

- [ ] **Step 3: 运行类型检查友好的构建验证**

Run: `pnpm --filter @ultraman/web run build`

Expected: PASS，Vite 生产构建成功。

- [ ] **Step 4: 提交主布局改动**

```bash
git add apps/web/src/features/game/GameScreen.tsx
git commit -m "fix: relax game screen viewport layout"
```

### Task 3: 调整左侧当前玩家区的收缩行为

**Files:**
- Modify: `apps/web/src/features/game/CurrentPlayerSpotlight.tsx`

- [ ] **Step 1: 写出最小布局改动以移除“必须撑满整列”的副作用**

把外层卡片改成允许在高度不足时内部布局收缩，同时保持骰子区靠下。目标结构：

```tsx
return (
  <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-2xl bg-slate-900/70 p-3">
    <div className="flex items-center justify-between text-xs text-slate-300">
      <span className="font-bold">第 {game.week} 周</span>
      <GameTimer />
    </div>

    <div className="flex items-center justify-center" key={current.id}>
      <HeroAvatar heroId={current.hero.heroId} size="xl" badge={current.hero.badge} />
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto">
      {/* 角色名、统计卡片、装备信息 */}
    </div>

    <div className="shrink-0">
      <DicePanel />
    </div>
  </div>
);
```

允许保留现有内部节点，但要满足：
- 外层 `min-h-0`
- 中间内容可收缩或局部滚动
- `DicePanel` 不因高度挤压而掉出可视区

- [ ] **Step 2: 运行与当前玩家区相关的单元测试**

Run: `pnpm --filter @ultraman/web run test -- --runInBand`

Expected: 现有 Web 测试通过，未因布局类名调整引入渲染错误。

- [ ] **Step 3: 提交左侧栏改动**

```bash
git add apps/web/src/features/game/CurrentPlayerSpotlight.tsx
git commit -m "fix: make spotlight panel shrink safely"
```

### Task 4: 调整排行榜为稳定的局部滚动容器

**Files:**
- Modify: `apps/web/src/features/game/Leaderboard.tsx`

- [ ] **Step 1: 将排行榜结构固定为“头部 + 可滚列表 + 底部”**

保持现有排序逻辑，仅调整容器类名，让中间列表真正承担滚动。目标结构：

```tsx
return (
  <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-2xl bg-slate-900/70 p-3">
    <header className="flex shrink-0 items-center justify-between text-sm font-bold text-slate-200">
      <span>🏆 排行榜</span>
      <span className="text-xs text-slate-400">按总资产</span>
    </header>

    <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
      {/* ranked items */}
    </ul>

    <footer className="shrink-0 rounded-xl bg-slate-800/70 p-2 text-xs text-slate-300">
      <div>🎲 上次骰：{lastDice ?? '—'}</div>
    </footer>
  </div>
);
```

如果现状接近，也要补足 `min-h-0` / `overflow-hidden` 这类约束，确保平板横屏时底部 footer 不被挤出容器。

- [ ] **Step 2: 重新运行 iPad 横屏 e2e 测试**

Run: `pnpm --filter @ultraman/web exec playwright test tests/e2e/fitsInViewport.spec.ts --project=chromium`

Expected: PASS，iPad 横屏测试中棋盘、周次、掷骰按钮、排行榜底部均可进入视口。

- [ ] **Step 3: 提交排行榜改动**

```bash
git add apps/web/src/features/game/Leaderboard.tsx apps/web/tests/e2e/fitsInViewport.spec.ts
git commit -m "fix: keep leaderboard footer visible on tablet"
```

### Task 5: 完整验证并整理交付说明

**Files:**
- Review: `apps/web/src/features/game/GameScreen.tsx`
- Review: `apps/web/src/features/game/CurrentPlayerSpotlight.tsx`
- Review: `apps/web/src/features/game/Leaderboard.tsx`
- Review: `apps/web/tests/e2e/fitsInViewport.spec.ts`

- [ ] **Step 1: 运行完整 Web 测试**

Run: `pnpm --filter @ultraman/web run test`

Expected: PASS，Web 侧 Vitest 测试全部通过。

- [ ] **Step 2: 运行生产构建**

Run: `pnpm --filter @ultraman/web run build`

Expected: PASS，生成最新生产包。

- [ ] **Step 3: 记录验证结果并准备交付**

整理需要向用户说明的内容：

```md
- iPad 横屏问题的根因是 `100svh + overflow-hidden + 固定三栏 + 强制正方形棋盘`
- 修复后改为“主体自适应 + 侧栏局部滚动”
- 已验证 `pnpm --filter @ultraman/web run test`
- 已验证 `pnpm --filter @ultraman/web run build`
```

- [ ] **Step 4: 提交最终改动**

```bash
git add apps/web/src/features/game/GameScreen.tsx \
  apps/web/src/features/game/CurrentPlayerSpotlight.tsx \
  apps/web/src/features/game/Leaderboard.tsx \
  apps/web/tests/e2e/fitsInViewport.spec.ts
git commit -m "fix: adapt game layout for ipad landscape"
```
