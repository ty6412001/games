# 机会格补充设计 实施计划

> **Task**: 把棋盘上占位的"🎲 机会"格做成真正的抽卡系统，落地后抽一张"好事 / 坏事"卡，立即展示并结算，对一年级儿童偏友好。

## Analysis Summary

- **Claude 评估**：现有管线已完成 80%：`tile.ts` 有 chance 位置、`resolveLanding()` 返回 chance 事件、`Player` 字段足够承载 v1 所有效果，缺口只在 gameStore 的 chance 分支与 UI 层的"后续版本"占位。新增应落在**领域层**（`chanceDeck.ts` 纯函数），store 只消费领域返回。
- **Codex 评估**（SESSION `codex-1776572614-624`）：同意领域层抽卡、UI 拆分、复用可注入 `rand`。Codex 额外指出**2 条高风险**我漏掉的：① `tick()` 时间到会直接 `endGame()`，可能截断 chance overlay 的展示；② 负面卡叠加租金可能意外把孩子打进破产结算——v1 要规定"机会卡绝不直接触发破产"。
- **共识**：10 张卡、7+/2-/1 混合、只用 `money/streak/helpCards`、纯函数 + 可注入 `rand`、复用 `LandingOverlay` 外壳。
- **分歧**：无。Codex 的卡池文案更贴主题，直接采用。

## Technical Solution

### 分层
| 层 | 职责 | 文件 |
|---|---|---|
| Domain（纯函数） | 卡池定义、权重抽取、效果结算 | `apps/web/src/domain/chanceDeck.ts` |
| Store | 在 `rollAndMove` 的 chance 分支调用领域函数，维护 `chanceResult` 展示状态；`tick()` 在 chance 展示期间暂缓 `endGame()` | `apps/web/src/stores/gameStore.ts` |
| UI | `ChanceCardOverlay` 独立组件展示卡面 + 效果条；`LandingOverlay` 移除"后续版本"占位 | `apps/web/src/features/chance/ChanceCardOverlay.tsx`、`apps/web/src/features/board/LandingOverlay.tsx`、`apps/web/src/features/game/GameScreen.tsx` |

### v1 硬规则
1. **卡池 10 张** — 卡面分：7 张纯正向 + 2 张纯负向 + 1 张轻微取舍（正+负组合）
2. **效果只动 3 字段**：`money ±`、`streak ±`、`helpCards +`
3. **破产防护**：机会卡结算后若 `money < 0`，把扣款夹到 `-player.money_before = 0`（即"最多扣到 0"），**绝不触发 `autoLiquidate`**
4. **连胜下限**：`streak` 永远 `>= 0`（已有 `adjustStreak` 保证）
5. **求助卡软上限 `4`**：若 `+helpCards` 会超过 4，多余转为 `+40 金币 / 张`
6. **位置不动**：v1 不做 teleport / 前进 / 后退，避免二次落地 + 过起点 + 终局连锁
7. **时间竞态**：若 `chanceResult !== null` 正在展示，`tick()` 不能立即 `endGame()`，延迟到 `dismissChanceResult()` 之后

### 卡池（Codex 版本，采纳）

| id | 卡名 | money | streak | helpCards | 权重 | 语气 |
|---|---|---:|---:|---:|---:|---|
| `supply-drop` | 光之补给 | +120 | 0 | 0 | 16 | 明确奖励 |
| `hero-praise` | 英雄表扬 | +80 | +1 | 0 | 12 | 正反馈 |
| `family-help` | 爸妈支援 | 0 | 0 | +1 | 12 | 安全感 |
| `special-training` | 特训成功 | 0 | +2 | 0 | 10 | 成长感 |
| `bonus-medal` | 奥特奖金 | +200 | 0 | 0 | 8 | 大奖励 |
| `gift-pack` | 补给礼包 | +40 | 0 | +1 | 8 | 温和奖励 |
| `good-day` | 今天状态真好 | 0 | +1 | 0 | 10 | 轻奖励 |
| `monster-prank` | 小怪恶作剧 | -40 | 0 | 0 | 10 | 轻微坏事 |
| `daydream` | 走神一下 | 0 | -1 | 0 | 8 | 轻挫折 |
| `repair-kit` | 修理小装备 | -40 | 0 | +1 | 6 | 轻取舍 |

权重总和 100，正向占 76%、纯负向占 18%、取舍占 6%。

### 类型 & 接口（伪代码）

```ts
// apps/web/src/domain/chanceDeck.ts

export type ChanceCardId =
  | 'supply-drop' | 'hero-praise' | 'family-help' | 'special-training'
  | 'bonus-medal' | 'gift-pack' | 'good-day'
  | 'monster-prank' | 'daydream' | 'repair-kit';

export type ChanceCardTone = 'good' | 'bad' | 'mixed';

export type ChanceCardDef = {
  readonly id: ChanceCardId;
  readonly title: string;
  readonly description: string;   // 一句话说明，面向孩子
  readonly effect: {
    readonly money?: number;
    readonly streak?: number;
    readonly helpCards?: number;
  };
  readonly weight: number;
  readonly tone: ChanceCardTone;
};

export const CHANCE_DECK: readonly ChanceCardDef[] = [ /* 10 张 */ ];

export const HELP_CARD_SOFT_CAP = 4;
export const HELP_CARD_OVERFLOW_CASH_PER_CARD = 40;

export type ChanceDraw = {
  readonly card: ChanceCardDef;
  readonly randomIndex: number;   // 供测试断言
};

export const drawChanceCard = (rand: () => number = Math.random): ChanceDraw;

export type ChanceApplyResult = {
  readonly player: Player;                  // 结算后玩家
  readonly actualDelta: {                   // 真正生效的变化（夹下限、转现后）
    readonly money: number;
    readonly streak: number;
    readonly helpCards: number;
  };
  readonly converted: {                     // 因软上限而转为金币的求助卡数量
    readonly helpCardToMoney: number;
  };
};

export const applyChanceCard = (
  player: Player,
  card: ChanceCardDef,
): ChanceApplyResult;
```

### Store 变化（伪代码）

```ts
// 新 state
chanceResult: {
  playerId: string;
  card: ChanceCardDef;
  actualDelta: { money: number; streak: number; helpCards: number };
  converted: { helpCardToMoney: number };
} | null;

// rollAndMove 中
} else if (landing.kind === 'chance') {
  const { card } = drawChanceCard();
  const player = findPlayer(workingGame.players, movedPlayer.id);
  const { player: updated, actualDelta, converted } = applyChanceCard(player, card);
  workingGame = { ...workingGame, players: replacePlayer(workingGame.players, updated) };
  set({
    game: workingGame,
    isMoving: false,
    movementAnim: null,
    landingEvent: landing,
    chanceResult: { playerId: movedPlayer.id, card, actualDelta, converted },
  });
  return;   // 不通过统一 set 走，因为需要先 return 阻止默认分支
}

// 新 action
dismissChanceResult: () => set({ chanceResult: null, landingEvent: null });

// tick() 守卫
if (state.chanceResult) {
  set({ nowMs });
  return;   // 倒计时继续走，但不会 endGame
}
```

### UI 组件

```tsx
// apps/web/src/features/chance/ChanceCardOverlay.tsx
// - fixed inset-0 z-40 backdrop
// - 中央卡面：320×440px，圆角 24px
//   · 头部 tone 色条（good=emerald / bad=rose / mixed=amber）
//   · 卡名（text-3xl font-black）
//   · 描述（text-lg）
//   · 效果条 3 行：💰 金币 / 🔥 连胜 / 🆘 求助卡（±显示，=0 隐藏）
//   · 若 converted.helpCardToMoney > 0 显示 "求助卡已满，多出的 N 张换成 ¥{N*40}"
// - 底部按钮 "继续"（BATTLE_CONTRAST.primaryAction）触发 dismissChanceResult
// - 进入动画：翻牌 360°（0.6s）→ 效果数字缓动（0.4s，from 0 to delta）
```

## Implementation Steps

每一步对应一个可验证的 commit。

### 领域层（纯函数）

1. **Create `apps/web/src/domain/chanceDeck.ts`** — 全部 10 张卡定义 + `drawChanceCard(rand)` + `applyChanceCard(player, card)`
2. **Create `apps/web/src/domain/__tests__/chanceDeck.test.ts`** —
   - 卡池权重总和 `100`（断言编译期常量）
   - `drawChanceCard` 在 `rand=0` 返回第一张、`rand→1` 返回最后一张
   - 负面卡扣款后金币不小于 `0`
   - 求助卡达到软上限时溢出转金币（`+N×40`）
   - 连胜不会小于 `0`
   - 纯函数：`player` 输入不被 mutate

### Store 集成

3. **Modify `apps/web/src/stores/gameStore.ts`** —
   - 在 `Store` 类型加 `chanceResult: ChanceResult | null`
   - `rollAndMove` 的 chance 分支调用 `drawChanceCard() + applyChanceCard()`，写入 `chanceResult`
   - 新增 `dismissChanceResult` action
   - `tick()` 在 `state.chanceResult` 存在时跳过 `endGame`
   - `dismissLanding` 守卫里加 `state.chanceResult` 防止误关
4. **Create `apps/web/src/stores/__tests__/chanceFlow.test.ts`** —
   - mock `chanceDeck.drawChanceCard` 固定返回某张卡
   - 模拟玩家落到 chance 格 → 断言 `chanceResult` 非空 + money/streak/helpCards 已更新
   - 展示期间调用 `tick` 超时 → 不进 settle
   - `dismissChanceResult` 后再次 `tick` → 才会 `endGame`
   - 负面卡即使扣到 `-50`，最终 money 也为 `0`，不会触发 bankruptcy

### UI 层

5. **Create `apps/web/src/features/chance/ChanceCardOverlay.tsx`** — 组件 + 翻牌动画 + 效果条
6. **Create `apps/web/src/features/chance/__tests__/ChanceCardOverlay.test.tsx`** —
   - 给定 `chanceResult` 渲染出卡名与描述
   - good/bad/mixed 渲染不同 tone 色条
   - 点击"继续"调用 `dismissChanceResult`
7. **Modify `apps/web/src/features/game/GameScreen.tsx`** — 在 overlay 栈里挂 `<ChanceCardOverlay />`（放在 `LandingOverlay` 后面，保证 z-index 正确）
8. **Modify `apps/web/src/features/board/LandingOverlay.tsx`** — 当 `chanceResult !== null` 时 `return null`，并把 `titleByKind.chance` 的 "后续版本" 去掉

### 动画 & 主题

9. **Modify `apps/web/tailwind.config.ts`（如有必要）** — 新增 keyframes
   - `chance-flip`：0% `rotateY(180deg)` → 100% `rotateY(0)`（0.6s ease-out）
   - `chance-count`：数字从 `0` 缓动到最终（动画通过 CSS 变量 + `@keyframes` 或简单 `transition`）

### E2E 验证

10. **Modify `apps/web/tests/e2e/chance.spec.ts`** —
    - 通过 `window.__TEST_HOOKS__`（或沿用当前 setState 钩子）强制把玩家位置设到 chance 格之前一格
    - 掷一次骰子
    - 断言出现"机会"卡面标题 + "继续"按钮
    - 点继续 → overlay 消失

## Key Files

| 文件 | 操作 | 描述 |
|---|---|---|
| `apps/web/src/domain/chanceDeck.ts` | Create | 卡池 + 抽卡 + 结算纯函数 |
| `apps/web/src/domain/__tests__/chanceDeck.test.ts` | Create | 领域层单测 |
| `apps/web/src/stores/gameStore.ts:531-676, 482-508, 708-716` | Modify | rollAndMove chance 分支、tick 守卫、dismissChanceResult action |
| `apps/web/src/stores/__tests__/chanceFlow.test.ts` | Create | store 集成测试（含 tick 竞态） |
| `apps/web/src/features/chance/ChanceCardOverlay.tsx` | Create | 抽卡 overlay 组件 |
| `apps/web/src/features/chance/__tests__/ChanceCardOverlay.test.tsx` | Create | overlay 组件测试 |
| `apps/web/src/features/game/GameScreen.tsx` | Modify | 挂载 overlay |
| `apps/web/src/features/board/LandingOverlay.tsx:9` | Modify | 去掉 "后续版本" 文案，chance 时让位 |
| `apps/web/tailwind.config.ts` | Modify (optional) | 翻牌 keyframes |
| `apps/web/tests/e2e/chance.spec.ts` | Create | E2E 冒烟 |

## Risks and Mitigation

| 风险 | 严重度 | 缓解 |
|---|---|---|
| `tick()` 在 chance 展示中把游戏结束 | HIGH | `tick()` 在 `chanceResult !== null` 时短路；`endGame()` 清理状态时一并清 `chanceResult` 以防 overlay 卡死 |
| 负面卡把孩子打进破产 | HIGH | `applyChanceCard` 内把扣款夹到 `money >= 0`，绝不调用 `autoLiquidate` |
| 连续抽到同一张卡（纯权重） | MEDIUM | v1 接受，卡池够大（10 张）+ 权重分散，重复概率可接受；若用户反馈再升级为"预洗牌方案 2" |
| 求助卡累积过多导致失衡 | LOW | 软上限 4 + 溢出转 ¥40/张 |
| UI 翻牌动画在 iPad 卡顿 | LOW | 单次 0.6s，仅 `transform: rotateY`，GPU 加速；回落方案是跳过动画直接显示 |
| 旧 E2E 的 "dismissLanding 下一位" 路径可能被 chance 打断 | MEDIUM | E2E 新增 `chance.spec.ts` 覆盖；`dismissLanding` 守卫已加 chanceResult 条件，避免提前清空 |

## Test Strategy

| Test Type | Scope | Verification |
|---|---|---|
| 单元（领域） | `chanceDeck.ts` | 权重、抽卡边界、结算下限、求助卡溢出、不可变 |
| 单元（组件） | `ChanceCardOverlay.tsx` | tone 渲染、继续按钮回调、有/无 converted 分支 |
| 集成（store） | `rollAndMove` + `tick` + `dismiss` | mock 随机 + mock chance 位置，验证完整生命周期与竞态 |
| 集成（现有回归） | `wrongBookScope.test.ts` / `turnEngine.test.ts` / `fullLoop.spec.ts` | 全部保持绿色 |
| E2E（Playwright） | `chance.spec.ts` | 真实骰子 + UI 交互，验证 overlay 可达可关 |

## Execution Model Routing

- `chanceDeck.ts` 卡池定义 + 逻辑：**Claude Opus 4.7**（数据结构 + 规则敏感，需审慎）
- `chanceDeck.test.ts` 单测：**Codex gpt-5.4**（testcase 生成适合）
- `gameStore.ts` rollAndMove chance 分支 + tick 守卫：**Claude Opus 4.7**（改动现有大文件需高准确度）
- `ChanceCardOverlay.tsx` + 动画：**Codex --lite**（< 80 行 JSX + Tailwind）
- E2E spec：**Codex --lite**

## SESSION_ID

- `CODEX_SESSION: codex-1776572614-624`（analyzer 会话，`/ecc:multi-execute` 可 `resume` 此会话以复用上下文）

---

**Plan generated and saved to `.claude/plan/chance-tile-design.md`**

**Please review the plan above. You can:**
- **Modify plan**: Tell me what needs adjustment, I'll update the plan
- **Execute plan**: Copy the following command to a new session

```
/ecc:multi-execute .claude/plan/chance-tile-design.md
```
