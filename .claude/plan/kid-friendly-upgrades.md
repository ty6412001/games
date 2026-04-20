# 实施计划: 7 岁娃友好度三轴升级（A 文案 + B 输入 + C 德凯 + D 视觉）

> **Spec**: `docs/superpowers/specs/2026-04-19-kid-friendly-upgrades-design.md` (committed `bfaf9b7`)
> **Planning Mode**: dual-model (Claude Opus + Codex GPT-5.4 独立第二意见)
> **Codex Session**: `codex-1776587341-46679`

## Analysis Summary

- **Claude 评估**：4 批落地顺序 A → B → C → D 合理；C 是最重批次（domain + store + 多个 UI）；A/B 互独立可并行启动；D 依赖 A 文案稳定，依赖 B/C 组件 DOM 骨架。
- **Codex 评估（独立）**：同意 A → B → C → D 批次顺序；**捕获 spec 里 3 个需要修正的点**：
  1. `finisherUsedThisBoss` 重置应在 `enterBossBattle()`，spec 写成 "`bossAttack` 开始时重置" 是错的（每次出招都会清 flag，必杀会被无限放）
  2. `DigitKeypad` 判断条件用 `/^-?\d+$/` 错 —— 负数题会路由到没有负号键的 UI。应收紧为 `/^\d+$/`；一年级下学期不涉及负数
  3. 字体 `ZCOOL KuaiLe / Orbitron` 推荐走 Google Fonts `<link>`，不走 npm 包
- **共识**：
  - 批次顺序、domain → store → UI → visual 的分层一致
  - 测试策略分层（纯函数单测 + store 集成 + 组件 UI + E2E 冒烟）一致
  - 模型路由：Codex 主做 store/domain 大面积改、Tailwind token、批量文案替换；Claude 主做中文文案润色、产品决策
- **分歧 / 需产品决策**：
  - **Decker 系统 trigger 条件** —— 当前 HeroSelect 娃默认 `tiga`，不是 `decker`。两种绑法：
    - (a) 绑 `childId`（spec 原意 "只给娃"）—— 不管娃选哪个英雄，德凯 HUD 永远显示
    - (b) 绑 `hero.heroId === 'decker'` —— 娃必须选德凯，不选则无 HUD
    - **本计划采用 (a)**：按 spec "只给娃" 原意，绑 `childId`；并顺手把 HeroSelect 默认娃的英雄改成 `decker`，让视觉一致
  - **动力型 × 2 + 必杀 × 0.5 是否会秒杀 Boss** —— Codex 指出 Boss 最低 HP 1000，dynamic + 900 武器 = 1800 单次伤害 + 必杀 500 HP = 实际可能 2 次击杀
    - **本计划决策**：保留当前数值（爽点即目标），但在 `bossBattle.ts` 加 "最低回合数保护"：即使 HP 归零，若 `turnCount < 3` 则 Boss 血量至少保留 10%，确保有答题 2 轮的教学容量
    - 标注为 "动手时产品复核"，可以关掉这个保护

## Technical Solution

### 架构分层

```
Batch A 文案        Batch B 输入手感      Batch C 德凯核心         Batch D 视觉细节
 ┌──────────┐       ┌──────────┐        ┌───────────────┐        ┌───────────────┐
 │ terms.ts │       │ DigitKey │        │ domain/decker │ ──→ 依 │ Tailwind tokens│
 │ TermGloss│       │  pad     │        │ gameStore 接入 │        │ 2s 动画 overlay│
 │ 全局替换 │       │ Ordering │        │ UI 骨架        │        │ 7 组件 reskin  │
 │ CI 扫描  │       │ 大按钮   │        └───────────────┘        └───────────────┘
 └──────────┘       └──────────┘                ↑                        ↑
      │                  │                      │                        │
      └─────可并行启动───┘                      └────C → D 依赖──────────┘
                    └── 两者完成后进入 C ──→ C 完成后进入 D
```

### 关键技术决策（对 spec 的修正 / 补充）

| # | 决策 | 原因 |
|---|---|---|
| T1 | `finisherUsedThisBoss` 在 `enterBossBattle()` 重置，不在 `bossAttack()` | Codex 指出；避免每回合重置 flag |
| T2 | DigitKeypad 正则收紧为 `/^\d+$/` | 一年级下无负数；keypad 无负号键 |
| T3 | 新增 `clearTransitionMark()` action | `FormTransitionOverlay` 定时回调清状态，避免重复播放 |
| T4 | `formFromEnergy` 允许跨级跃迁（flash → strong），仅播一次动画 | 若某步 +20 刚好让能量跨过 30 和 60 两线 |
| T5 | `rollDice(rand, max)` 增加 `max` 参数（默认 6），奇迹+ 形态传 7 | 保留原 `DiceRoll` 类型基础上扩展 `1 \| ... \| 7` |
| T6 | DeckerStatusBar 展示策略：`screen === 'playing' && childId != null` 常驻；`boss` 阶段移到 Boss HP 下方 | Codex 建议；避免布局冲突 |
| T7 | HeroSelect 娃默认英雄改为 `decker`（从 `tiga`）| 视觉一致性；绑定仍是 `childId` |
| T8 | `check-legacy-terms` 排除 `docs/**`、`**/__tests__/**`、`apps/web/src/data/**` | Codex 指出；题包/spec/测试含合法原词 |
| T9 | 字体走 Google Fonts `<link>` + preconnect | Codex 建议；不加 npm 依赖 |
| T10 | 2s 变身动画有 `pendingQuiz || activeQuiz` suppress | 动画不能挡答题 |
| T11 | Boss 3 回合以内 HP 下限 10% 保护（可开关）| 防止双倍伤害 + 必杀导致秒杀，让娃有多题机会 |

## Implementation Steps

### Batch A — 文案层（独立，无阻塞；Codex 主力）

#### A.1 新增 `apps/web/src/config/terms.ts`
```ts
export const TERMS = {
  rent: '过路费', owner: '房主', rentWaiver: '不交过路费',
  payRent: '交过路费', bankruptcy: '钱用光了', property: '地',
  buyProperty: '买下这块地', settle: '算钱', studyTile: '学习星',
  brainPack: '挑战题',
} as const;

export const GLOSS = {
  bossOutpost: 'Boss 住在这里等你',
  transformEnergy: '钱（用来变身）',
  wrongBook: '错的题会记在这本子里，下次再练',
  helpCard: '卡住时能看提示',
} as const;
```

#### A.2 新增 `apps/web/src/components/TermGloss.tsx`
- 点击优先、hover 兼容的轻量气泡
- Props `{ term: keyof typeof GLOSS; children }`
- 测试 `TermGloss.test.tsx`：click 展开、outside click 收起

#### A.3 批量替换（8 个入口文件 + gameStore 内 message 分支）
- `LandingOverlay.tsx` / `QuizModal.tsx` / `SubjectSelector.tsx` / `SettleScreen.tsx` / `CurrentPlayerSpotlight.tsx` / `ResultScreen.tsx` / `MainMenu.tsx` / `BossScene.tsx`
- gameStore.ts 内的 `message = '...'` 分支全部过 `TERMS`
- 测试夹具里"租金""业主"等字符串断言同步更新
- **不碰**：题包 JSON（`public/question-packs/*`）、docs、测试数据、题目 title

#### A.4 新增 `scripts/check-legacy-terms.ts` + 挂载
- 根脚本：扫 `apps/web/src/**/*.{ts,tsx}` 裸词；exclude `__tests__/**`、`data/**`、`config/terms.ts`、`docs/**`
- `package.json` 加 `"check:terms": "tsx scripts/check-legacy-terms.ts"`，根依赖 devDep `tsx`
- CI `.github/workflows/ci.yml` 新增一步 `pnpm run check:terms`

#### A.5 测试
- `TermGloss.test.tsx` UI 行为
- `terms.test.ts` 覆盖度断言（所有 key 非空）
- 字符串断言回归

---

### Batch B — 输入手感（独立，无阻塞；Codex 主力）

#### B.1 新增 `apps/web/src/components/input/DigitKeypad.tsx`
```ts
interface Props { onSubmit: (v: string) => void; placeholder?: string; }
// 内部 useState<string>('')，手机电话布局
// 3x4 网格，按钮 100x100，圆角 24，active:scale-95
// 按钮: 1-9 append，清空 = setValue(''), 确认 = value && onSubmit(value)
```

#### B.2 `QuizModal.tsx` input 分支路由
```ts
case 'input': {
  const normalized = question.answer.trim();
  const canUseDigitKeypad = /^\d+$/.test(normalized);  // T2 收紧
  return canUseDigitKeypad
    ? <DigitKeypad onSubmit={onSubmit} />
    : <InputArea onSubmit={onSubmit} />;
}
```

#### B.3 重写 `OrderingArea`（`QuizModal.tsx` 内）
- `grid-cols-2 gap-3`，按钮 `min-h-[72px] min-w-[88px] text-2xl`
- 选中时左上角 `absolute -left-3 -top-3` 圆形角标（40×40）显示序号
- 取消 = 点角标消失；答案协议不变（仍 `order.join(',')`）

#### B.4 测试
- `DigitKeypad.test.tsx`：append / clear / confirm 序列
- `QuizModal.inputModes.test.tsx`：
  - 纯数字题 → DigitKeypad
  - 含负号 `-3` / 小数 / 空格 → InputArea
  - ordering → 角标显示 + 反选

---

### Batch C — 德凯核心（重中之重；顺序：Domain → Store → UI 骨架；Codex 主写 store，Claude 主写文案 & UI 骨架）

#### C.1 Domain 纯函数（Codex）
**`apps/web/src/domain/decker/forms.ts`**
```ts
export type DeckerForm = 'flash' | 'miracle' | 'strong' | 'dynamic';
export const FORM_ORDER: readonly DeckerForm[] = ['flash', 'miracle', 'strong', 'dynamic'];
export const FORM_THRESHOLDS: Record<DeckerForm, number> = {
  flash: 0, miracle: 30, strong: 60, dynamic: 100,
};

export const formFromEnergy = (energy: number, current: DeckerForm): DeckerForm => {
  let target: DeckerForm = 'flash';
  for (const f of FORM_ORDER) if (energy >= FORM_THRESHOLDS[f]) target = f;
  const ti = FORM_ORDER.indexOf(target), ci = FORM_ORDER.indexOf(current);
  return ti > ci ? target : current;   // T4 支持跳级但不降级
};

export const isAtLeast = (current: DeckerForm, bar: DeckerForm): boolean =>
  FORM_ORDER.indexOf(current) >= FORM_ORDER.indexOf(bar);
```

**`apps/web/src/domain/decker/energy.ts`**
```ts
export type DeckerEvent = 'correct' | 'monster-defeat' | 'wrong';
const DELTA: Record<DeckerEvent, number> = { correct: 10, 'monster-defeat': 20, wrong: -5 };

export const applyDeckerEvent = (energy: number, ev: DeckerEvent): number =>
  Math.max(0, energy + DELTA[ev]);

export const applyFinisherEvent = (
  finisher: number, ev: DeckerEvent, dynamicUnlocked: boolean,
): number => {
  if (!dynamicUnlocked || ev === 'wrong') return finisher;
  return Math.min(100, finisher + 20);
};
```

**`apps/web/src/domain/turnEngine.ts` 改造**
```ts
export type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export const rollDice = (rand: RandomFn = Math.random, max = 6): DiceRoll => {
  const n = Math.floor(rand() * max) + 1;
  if (n < 1 || n > 7) throw new Error(`dice roll out of range: ${n}`);
  return n as DiceRoll;
};
// advancePosition、crossedStart 的 steps 上限从 6 放宽到 7
```

**`apps/web/src/domain/bossBattle.ts` 改造**
```ts
export type AttackInput = {
  attackerId: string; weaponId?: string; correct: boolean;
  damageMultiplier?: number;   // 新参数，默认 1
};
export const computeAttackDamage = (input: AttackInput): number => {
  const weapon = input.weaponId ? getWeapon(input.weaponId) : null;
  const base = weapon?.combatPowerBonus ?? 300;
  const raw = input.correct ? base : Math.floor(base / 2);
  return Math.floor(raw * (input.damageMultiplier ?? 1));
};

// 新增：最低回合保护（T11）
export const applyFinisher = (state: BossBattleState): BossBattleState => {
  const nextHp = Math.floor(state.currentHp * 0.5);
  return { ...state, currentHp: Math.max(1, nextHp) };  // 至少保留 1 HP
};
```

**测试**：
- `forms.test.ts`：阈值边界、单调不退、跨级跃迁
- `energy.test.ts`：三类事件 delta、0 下限、100 上限（finisher）
- `turnEngine.test.ts` 新增：`rollDice(rand, 7)` 输出 1-7、旧 6 面默认不变
- `bossBattle.test.ts` 新增：`damageMultiplier: 2` 双倍伤害、`applyFinisher` HP 减半

#### C.2 Store 接入（Codex）

**新增字段（Store type + 初始值）**
```ts
deckerState: DeckerState;
// 初始 / startGame reset: { currentForm:'flash', energy:0, finisherEnergy:0, finisherUsedThisBoss:false, lastTransitionAt:null }
// enterBossBattle() 调用时: finisherUsedThisBoss = false  (T1)
```

**新 action**
```ts
fireFinisher: () => void;         // Boss 场景必杀
clearTransitionMark: () => void;  // 动画 overlay 自清
```

**submitAnswer / quizTimeout 注入 Decker 事件**（仅当 `quiz.playerId === childId`）：
```ts
const isChildAnswering = quiz.playerId === state.childId;
const ev: DeckerEvent | null = isChildAnswering ? (
  correct
    ? (quiz.context.kind === 'monster' || quiz.context.kind === 'boss-attack'
        ? 'monster-defeat' : 'correct')
    : 'wrong'
) : null;
const prevForm = state.deckerState.currentForm;
let nextDecker = state.deckerState;
if (ev) {
  const nextEnergy = applyDeckerEvent(state.deckerState.energy, ev);
  const nextForm   = formFromEnergy(nextEnergy, prevForm);
  const dynamicUnlocked = isAtLeast(nextForm, 'dynamic');
  nextDecker = {
    ...state.deckerState,
    currentForm: nextForm,
    energy: nextEnergy,
    finisherEnergy: applyFinisherEvent(state.deckerState.finisherEnergy, ev, dynamicUnlocked),
    lastTransitionAt: nextForm !== prevForm ? performance.now() : state.deckerState.lastTransitionAt,
  };
}
```

**奖励倍率**：
```ts
// property-buy 分支
if (correct && isChildAnswering && isAtLeast(nextDecker.currentForm, 'strong')) {
  reward.correct = Math.floor(reward.correct * 1.5);
}
// property-bonus 分支
if (correct && isChildAnswering && isAtLeast(nextDecker.currentForm, 'strong')) {
  ctx.bonus = Math.floor(ctx.bonus * 1.5);
}
// boss-attack 分支
const damageMultiplier = (isChildAnswering && isAtLeast(nextDecker.currentForm, 'dynamic')) ? 2 : 1;
applyAttack(battle, { ..., damageMultiplier }, ...);
```

**`rollAndMove` 7 面骰**：
```ts
const rollMax = isAtLeast(state.deckerState.currentForm, 'miracle') ? 7 : 6;
const roll = rollDice(Math.random, rollMax);
// buildWalkPath / advancePosition 支持 7 步（上限放宽）
```

**`fireFinisher`**：
```ts
const s = get();
if (!s.game || s.game.phase !== 'boss' || !s.game.bossBattle) return;
if (s.deckerState.currentForm !== 'dynamic') return;
if (s.deckerState.finisherEnergy < 100) return;
if (s.deckerState.finisherUsedThisBoss) return;
const nextBattle = applyFinisher(s.game.bossBattle);
set({
  game: { ...s.game, bossBattle: nextBattle },
  deckerState: { ...s.deckerState, finisherEnergy: 0, finisherUsedThisBoss: true },
});
```

**测试** `stores/__tests__/deckerProgression.test.ts`：
- 娃答对 +10 / 答错 -5（下限 0）/ 击怪 +20
- 大人答题不影响 deckerState
- 能量跨阈值时 currentForm 升级、lastTransitionAt 更新
- 强力型下 property-buy / property-bonus ×1.5
- 动力型下 bossAttack damage ×2
- `fireFinisher` guard：非 Boss / 非动力 / 能量不足 / 已用 均拒绝
- `enterBossBattle` 重置 `finisherUsedThisBoss`（不在 bossAttack 重置）
- 奇迹型 roll 上限 7，闪耀型 6

#### C.3 UI 骨架（Claude 写，无视觉，先通）

**新增组件**（Batch C 阶段为"功能最小化"，视觉到 Batch D 再砸）：
- `features/decker/DeckerStatusBar.tsx` —— 横排 4 图标 + 进度条 + 必杀条
- `features/decker/FinisherButton.tsx` —— Boss 场景按钮
- `features/decker/FormTransitionOverlay.tsx` —— 空 overlay，骨架 2s timer

**GameScreen / BossScene 接入**：
- `GameScreen.tsx`：顶部 `<DeckerStatusBar />`（monopoly 阶段）
- `BossScene.tsx`：Boss HP 下方 `<DeckerStatusBar compact />` + 出招区旁 `<FinisherButton />`
- `FormTransitionOverlay` 放 GameScreen 根（z-50）

**HeroSelect 默认**：娃选用 `decker` 代替 `tiga`（T7）

---

### Batch D — 视觉细节（Claude + Codex 协作；依赖 A/B/C 骨架）

#### D.1 Tailwind tokens + 字体（Codex）
- `tailwind.config.ts` extend 按 spec 视觉章节落地（colors / fontFamily / boxShadow / keyframes / animation）
- `index.html` 加 Google Fonts preconnect + `<link>`（T9）：
  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=ZCOOL+KuaiLe&family=Orbitron:wght@700;900&display=swap" rel="stylesheet">
  ```
- `index.css` 加 utilities（`.text-stroke-black` / `.cosmic-bg` / `.hud-frame`）

#### D.2 7 组件视觉重写（Claude 主写 JSX + Tailwind）
按 spec "各组件视觉升级" 一节逐一应用：
1. **DeckerStatusBar** —— HUD 紫调 + 娃头像圆徽章 + 4 形态阶梯 + 流动能量条 + 必杀条
2. **FormTransitionOverlay** —— 射线爆炸 + 德凯剪影 + "奇迹型！" 砸字
3. **FinisherButton** —— 圆形能量核心 + "⬆ 点我" 浮动箭头
4. **DigitKeypad** —— cosmic-bg + HUD 输入条 + 质感键帽
5. **SubjectSelector** —— TCG 卡牌 + 纹章背景 + 封印禁用层
6. **LandingOverlay** —— HUD 通讯频道 + 闪烁红点 + 纵排大按钮
7. **OrderingArea** —— 2 列大卡 + 圆形序号 + 选中金色脉动

#### D.3 新增资产
- `apps/web/public/assets/decker/flash.png` / `miracle.png` / `strong.png` / `dynamic.png`（200×200 透明 PNG）
- `apps/web/public/assets/decker/silhouette.png`（600×800 透明）
- 若素材未到：用 emoji / CSS 纯形状占位，不阻塞前端

#### D.4 视觉验收
- 视觉一致性 QA 清单（spec 末尾）
- 375×667 手机 viewport 无横向滚动
- `prefers-reduced-motion` 下动画退化到 0.001ms

---

### 共同验证（跨批次）

最终全量回归：
1. `pnpm typecheck && pnpm lint`
2. `pnpm test`（vitest 全 pass，含新加）
3. `pnpm test:e2e`（Playwright：
   - 娃连对 3 题 → 奇迹型激活 + 骰子可出 7
   - 纯数字题 → DigitKeypad 可交互
   - Boss + dynamic + finisher=100 → 按钮可点，释放后失效 + HP 减半）
4. `pnpm run check:terms`（新加 CI）
5. 视觉手动过一遍（dev server，主流程打一局）

## Key Files

| 文件 | 操作 | 描述 |
|---|---|---|
| `apps/web/src/config/terms.ts` | Create | TERMS + GLOSS |
| `apps/web/src/components/TermGloss.tsx` | Create | 说明气泡组件 |
| `apps/web/src/components/__tests__/TermGloss.test.tsx` | Create | |
| `apps/web/src/components/input/DigitKeypad.tsx` | Create | 手机电话布局键盘 |
| `apps/web/src/components/input/__tests__/DigitKeypad.test.tsx` | Create | |
| `apps/web/src/domain/decker/forms.ts` | Create | 形态阶梯 + formFromEnergy |
| `apps/web/src/domain/decker/energy.ts` | Create | Decker 能量纯函数 |
| `apps/web/src/domain/decker/__tests__/forms.test.ts` | Create | |
| `apps/web/src/domain/decker/__tests__/energy.test.ts` | Create | |
| `apps/web/src/domain/turnEngine.ts` | Modify | `rollDice(rand, max=6)` + `DiceRoll` 类型扩展 1..7 |
| `apps/web/src/domain/bossBattle.ts` | Modify | `AttackInput.damageMultiplier` + `applyFinisher` 下限保护 |
| `apps/web/src/domain/__tests__/turnEngine.test.ts` | Modify | 7 面骰测试 |
| `apps/web/src/domain/__tests__/combatAndBoss.test.ts` | Modify | damageMultiplier + finisher 测试 |
| `apps/web/src/stores/gameStore.ts` | Modify | + deckerState / fireFinisher / clearTransitionMark / submitAnswer+quizTimeout 注入 / enterBossBattle 重置 / rollAndMove 7 面 |
| `apps/web/src/stores/__tests__/deckerProgression.test.ts` | Create | 综合集成测 |
| `apps/web/src/features/decker/DeckerStatusBar.tsx` | Create | HUD 顶栏 |
| `apps/web/src/features/decker/FinisherButton.tsx` | Create | 必杀按钮 |
| `apps/web/src/features/decker/FormTransitionOverlay.tsx` | Create | 2s 变身 overlay |
| `apps/web/src/features/decker/__tests__/*.test.tsx` | Create | UI 测 |
| `apps/web/src/features/game/GameScreen.tsx` | Modify | 接 DeckerStatusBar + FormTransitionOverlay |
| `apps/web/src/features/boss/BossScene.tsx` | Modify | 接 FinisherButton + DeckerStatusBar(compact) |
| `apps/web/src/features/setup/HeroSelect.tsx` | Modify | 娃默认英雄改 `decker` |
| `apps/web/src/features/quiz/QuizModal.tsx` | Modify | AnswerArea input 路由 + OrderingArea 重写 + 文案 |
| `apps/web/src/features/quiz/__tests__/QuizModal.inputModes.test.tsx` | Create | |
| `apps/web/src/features/board/LandingOverlay.tsx` | Modify | 文案 + 视觉 |
| `apps/web/src/features/quiz/SubjectSelector.tsx` | Modify | 文案 + 视觉 |
| `apps/web/src/features/settle/SettleScreen.tsx` | Modify | 文案 |
| `apps/web/src/features/menu/MainMenu.tsx` | Modify | 文案 |
| `apps/web/src/features/game/CurrentPlayerSpotlight.tsx` | Modify | 文案 |
| `apps/web/src/features/result/ResultScreen.tsx` | Modify | 文案 |
| `apps/web/tailwind.config.ts` | Modify | extend colors / fontFamily / boxShadow / keyframes / animation |
| `apps/web/index.html` | Modify | Google Fonts link |
| `apps/web/src/index.css` | Modify | utilities: text-stroke-black / cosmic-bg / hud-frame |
| `apps/web/public/assets/decker/*.png` | Create | 4 形态 + 1 剪影素材 |
| `scripts/check-legacy-terms.ts` | Create | 扫裸词 CI 脚本 |
| `package.json` (root) | Modify | devDep `tsx`，script `check:terms` |
| `.github/workflows/ci.yml` | Modify | 加一步 `pnpm run check:terms` |
| `apps/web/tests/e2e/kidUpgrades.spec.ts` | Create | E2E 冒烟三条 |

## Risks and Mitigation

| 风险 | 严重 | 缓解 |
|---|---|---|
| `finisherUsedThisBoss` 若在 `bossAttack` 重置会导致必杀无限放 | HIGH | **T1** 已修正：放在 `enterBossBattle` |
| DigitKeypad 负号题路由错 | MEDIUM | **T2** 收紧正则 `/^\d+$/` |
| 动力型 + ×2 + 必杀 ×0.5 秒杀 Boss | MEDIUM | **T11** 最低回合保护；或留待手动平衡 |
| 大人答题触发 decker 状态变化 | HIGH | 所有注入点都先判 `quiz.playerId === childId` |
| 形态动画挡 pendingQuiz | MEDIUM | **T10** overlay 内 `if (pendingQuiz \|\| activeQuiz) return null` |
| 7 面骰导致 `buildWalkPath` / `advancePosition` 越界 | MEDIUM | turnEngine.ts `steps` 校验上限从 6 放宽到 7 + 单测覆盖 |
| `check-legacy-terms` 误伤题包/测试 | MEDIUM | **T8** 排除规则 |
| 文案替换漏改（store message 分支多） | MEDIUM | CI 脚本兜底 |
| Batch C 改动面广，回归风险 | HIGH | 分 C.1/C.2/C.3 三步，每步跑 test；Codex 主写 + Claude review |
| Google Fonts CORS / 网络 | LOW | fallback font stack 保留 `sans-serif` / `monospace` |
| 素材未到位阻塞前端 | LOW | Emoji / CSS 纯形状占位，动画/HUD 可先用 SVG |
| `lastTransitionAt = performance.now()` 在 SSR 里不存在 | LOW | Vite SPA 无 SSR，无风险；若后续接 SSR 再改成 counter |
| Boss HP 下限保护使得娃感觉"无效伤害" | LOW | 留 feature flag 关闭 |
| HeroSelect 改默认英雄可能破坏其他玩家的体验 | LOW | 只改娃默认；大人仍可自由选 |

## Test Strategy

| 层级 | 范围 | 新增测试文件 |
|---|---|---|
| **Domain 单测** | forms / energy / turnEngine / bossBattle 纯函数 | `forms.test.ts` / `energy.test.ts` / `turnEngine.test.ts (扩)` / `combatAndBoss.test.ts (扩)` |
| **Store 集成** | submitAnswer+decker / quizTimeout+decker / fireFinisher guard / startGame+enterBossBattle 重置 / rollAndMove 7 面 / 倍率 | `deckerProgression.test.ts` |
| **组件 UI** | TermGloss 展开、DigitKeypad 按键、OrderingArea 角标、DeckerStatusBar 显示策略、FinisherButton disabled/enabled、FormTransitionOverlay 定时消失 | 各组件 `__tests__/*.test.tsx` |
| **E2E 冒烟** | 3 条核心流程 | `kidUpgrades.spec.ts`：<br>1. 娃连对 3 题 → 奇迹型 + 骰子可 7<br>2. 纯数字题显示 keypad<br>3. Boss 场景 finisher 可点 → HP 减半 |
| **CI 新增** | 裸词扫描 | `pnpm run check:terms` |
| **回归** | 全量 typecheck/lint/test/e2e | 已有流水线 |

## Execution Model Routing

| 任务 | 推荐模型 | 原因 |
|---|---|---|
| Batch A 批量文案替换 + check-legacy-terms 脚本 | **Codex GPT-5.4** | 机械化替换，上下文量大 |
| Batch A TERMS/GLOSS 中文润色 | **Claude Opus** | 儿童向语感 |
| Batch B DigitKeypad + OrderingArea 改造 | **Codex GPT-5.4** | 组件模版化 |
| Batch B 单测 | **Codex** | 表驱动 |
| Batch C 全部 `domain/decker/*` + 纯函数测 | **Codex GPT-5.4** | 纯算法 |
| Batch C gameStore.ts 改造（submitAnswer 注入等） | **Codex GPT-5.4** | 分支多、回归面大，机械落地 + 测试 |
| Batch C UI 骨架（DeckerStatusBar / FinisherButton / Overlay） | **Claude Opus** | React 结构设计 |
| Batch C `deckerProgression.test.ts` 集成测 | **Claude + Codex 协作** | Claude 框架、Codex 扩断言 |
| Batch D Tailwind tokens / keyframes / utilities | **Codex GPT-5.4** | 批量 config |
| Batch D 7 组件视觉 reskin | **Claude Opus** | 美学决策、布局微调 |
| 产品决策（动力型秒杀、非德凯娃 HUD、Boss 血量保护开关）| **Claude + 用户确认** | 产品口径 |

## SESSION_ID (for /ecc:multi-execute use)

- **CODEX_SESSION**: `codex-1776587341-46679`

---

**Plan generated and saved to `.claude/plan/kid-friendly-upgrades.md`**

**Please review the plan above. You can:**
- **Modify plan**: Tell me what needs adjustment, I'll update the plan
- **Execute plan**: Copy the following command to a new session

```
/ecc:multi-execute .claude/plan/kid-friendly-upgrades.md
```
