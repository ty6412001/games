# UI 调整计划 v2 · 素材/去倒计时/一屏显示 + 路标动画/胜利特效/全员答题/骰子优化

**迭代于**：`.claude/plan/ui-adjustments-v1.md`
**新增项**：路标移动动画 / 答题胜利怪兽爆炸特效 / 所有人都答题 / 骰子动画优化
**Scope**：UI 层 + 少量 store 状态机扩展；领域逻辑与数据层稳定
**Execution target**：`/ecc:multi-execute`

---

## 0 · 核心变动概述

| 项 | 类型 | 来源 |
|---|---|---|
| 素材替换 | UI 层 | v1 |
| 倒计时移除（口子留着） | 1 feature flag | v1 |
| 一屏显示（无翻页） | UI 层 | v1 |
| **新 ①** 路标移动动画（逐格走） | **状态机扩展** | v2 |
| **新 ②** 答题后怪兽爆炸特效 | UI 层 + QuizResult 结构扩展 | v2 |
| **新 ③** 所有人都答题 | **行为变更 + 关键 bug 修复** | v2 |
| **新 ④** 骰子动画优化 | UI 层（单文件） | v2 |

---

## 1 · Analysis Summary（Claude + Codex 双审）

### 1.1 Codex 发现的 **CRITICAL** 隐患

> **错题本污染**：当前 `submitAnswer` / `quizTimeout` 写错题本时，判断条件是 `if (state.childId && !quiz.usedHelp)`，**没有校验答题者就是 childId**。本来孩子专属是因为只有孩子能触发 quiz，所以条件隐式成立；一旦放开成"所有人答题"，**大人答错的题会被写进孩子的错题本**，极其严重。

**修复路径**：`recordWrong` 写入条件改成 `quiz.playerId === state.childId`，即"只有被标记为 child 的那位玩家的错题才进错题本"。

### 1.2 Codex 发现的另一个 invariant 漏洞

> 当前 HeroSelect 允许 **0 个或多个 `isChild`** 玩家，而 store 只记第一个作为 `childId`。现在需要强制 **恰好 1 个 child**。

**修复路径**：HeroSelect 用"radio"风格的孩子标记（互斥，默认最后一人=孩子），并显式校验"必须有且仅有一个孩子"，否则开始按钮 disabled。

### 1.3 Codex 发现的时序耦合

- 路标动画如果纯 DOM transform，会和 `resolveLanding` 时机脱耦，容易出现"还没走到就触发落地事件"的 bug
- 解决：**动画由 store 驱动**，`resolveLanding` 在动画末尾才调用
- 也要提防 `tick()` 在动画过程中触发 `endGame`（时间耗尽）—— 需要 cancel token / 重入保护

### 1.4 Codex 发现的 QuizResult 语义缺陷

- 现有 `outcome: 'correct' | 'wrong' | 'timeout' | 'help'`
- 胜利特效若按 `outcome === 'correct'` 判定，会**漏掉求助成功的"help"分支**（求助命中其实也算答对）
- 修复：QuizResult 扩展，或者把 help 拆成 "correctWithHelp"

### 1.5 Codex 发现的现存 bug（顺带修）

| Bug | 位置 | 修复 |
|---|---|---|
| Boss 阶段答题无超时保护（timer flag 开启后依然失效） | gameStore.tick:382 early return | v1 计划已提，v2 沿用 |
| Boss-attack 中非 child 玩家 **自动命中不答题** | gameStore.bossAttack:842-868 | v2 必修：现在全员都要答 |
| Monster 格子抽不到题时**静默无效**（没有 fallback reward） | gameStore:531-543 | v2 修：抽不到题走 auto reward |
| Boss 胜利 finalize 3 处硬编码 `setTimeout(1200)` | gameStore:677/818/888 | v2 提取成常量 `BATTLE_EFFECT_DURATION_MS` |
| `QuizModal` 的文案"答错会进错题本"对大人不对 | QuizModal.tsx:205 | 动态文案：child→"答错会进错题本"，其他→"答错扣钱" |

### 1.6 Claude vs Codex 分歧

无明显分歧。Claude 最初没想到"求助命中算 help 而非 correct"这个分类在特效判定时的差异，Codex 抓到了。

---

## 2 · Technical Solution（v2 完整方案）

### 2.1 改动 A 组 · 行为纠正（**最先做，最高风险**）

#### A1. 全员答题 + 错题本归属修正

**gameStore 修改**（去掉所有 `movedPlayer.isChild && ...` 守护）：

```ts
// rollAndMove 中 study tile 处理（去掉 isChild 判断）
} else if (landing.kind === 'study') {
  if (current.currentPack) {
    const question = pickRandomQuestion(current.currentPack, {
      excludeIds: current.askedQuestionIds,
    });
    if (question) {
      nextActiveQuiz = startQuiz({ state: get(), question, context: { kind: 'study' }, playerId: movedPlayer.id });
    } else {
      // 题库耗尽 fallback：reshuffle 全部题目或自动给奖励
      workingGame = applyStudyAutoReward(workingGame, movedPlayer.id);
    }
  } else {
    workingGame = applyStudyAutoReward(workingGame, movedPlayer.id);
  }
}
```

`monster` tile 同样去掉 isChild 判断，并补 fallback（抽不到题时 auto hit）。

`confirmBuy` 去掉 isChild 判断：所有玩家买地都要答对。

`bossAttack` 去掉"非孩子自动命中"分支：所有玩家出手都要答题。

#### A2. 错题本归属修正（CRITICAL）

`submitAnswer` 与 `quizTimeout` 写 wrong book 的判断：

```ts
const childId = state.childId;
// 旧：if (childId && !quiz.usedHelp)
// 新：if (childId && quiz.playerId === childId && !quiz.usedHelp)
if (childId && quiz.playerId === childId && !quiz.usedHelp) {
  await recordWrong({ childId, question, wrongAnswer, week });
}
```

**效果**：大人答错也会被 QuizResultToast 扣钱，但**不会污染孩子的错题本**。

#### A3. 弱相关：weapon 奖励只给 child

保持现有 `attacker.isChild && attacker.streak >= 3` 逻辑（Codex 建议，Claude 同意）。

#### A4. 题库耗尽 fallback（pickRandomQuestion 返回 null）

策略：**reshuffle**（清空 `askedQuestionIds` 重来），避免卡游戏节奏。
```ts
if (!question && current.askedQuestionIds.size > 0) {
  // reshuffle
  const fresh = pickRandomQuestion(current.currentPack, { excludeIds: new Set() });
  if (fresh) {
    set({ askedQuestionIds: new Set() });
    nextActiveQuiz = startQuiz({ ..., question: fresh, ... });
  } else {
    // 极端：整个包空，降级到 auto reward
  }
}
```

#### A5. HeroSelect 强制恰好 1 个 child

- "孩子"改成 radio 风格：点击某玩家的孩子标记时自动取消其他玩家
- 开始按钮 disabled 条件：`drafts.filter(d => d.isChild).length === 1`
- 默认值：第一个 `isChild: true` 的玩家为"小朋友"

#### A6. QuizModal 动态文案

```tsx
const willRecord = quiz.playerId === state.childId;
<footer>
  {willRecord ? '答错会进错题本' : '答错扣钱（大人不进错题本）'}
</footer>
```

#### A7. QuizResult 扩展（配合特效）

```ts
export type QuizResult = {
  outcome: 'correct' | 'wrong' | 'timeout' | 'help';
  reward: number;
  message: string;
  // 新增：
  contextKind: 'study' | 'monster' | 'property-buy' | 'boss-attack';
  playerId: string;
  correct: boolean;  // true for 'correct' | 'help'，方便特效判定
};
```

### 2.2 改动 B · 素材替换（v1 方案，不变）

见 v1 § 改动一。关键：
- `public/assets/{heroes,monsters,weapons}/<id>.png` 约定
- `ImageWithFallback` + `HeroAvatar` 组件
- 缺图回退色块+首字母

**v2 追加**：`MonsterSprite` 组件（供 BossScene + 胜利特效使用）

```tsx
export const MonsterSprite = ({ bossId, size, fallback }: Props) => (
  <ImageWithFallback
    src={resolveMonsterImage(bossId)}
    alt={bossId}
    className={`${sizeClass[size]} object-contain`}
    fallback={fallback ?? <span className="text-5xl">🧟</span>}
  />
);
```

### 2.3 改动 C · 倒计时移除（v1 方案，不变）

见 v1 § 改动二。新增 `src/config/features.ts`：

```ts
export const features = {
  quizTimer: false,
  BATTLE_EFFECT_DURATION_MS: 1200,  // v2 新增常量，全局统一
} as const;
```

`tick()` 中把 timeout 判定挪到 monopoly 早退前（Codex 建议，修 boss 阶段漏洞）。

### 2.4 改动 D · 一屏显示（v1 方案，不变）

见 v1 § 改动三。统一 `h-[100svh] overflow-hidden` 外壳 + `grid-rows-[auto_1fr_auto]`。

**v2 补充**：QuizModal 在 input 题场景下，当虚拟键盘弹起时 `max-h-[100svh]` + 内部 `overflow-auto`，避免被键盘挤出屏幕。

### 2.5 改动 E · 路标移动动画

#### 状态扩展（gameStore）

```ts
export type MovementAnimation = {
  playerId: string;
  path: readonly number[];   // [start, step1, step2, ..., end]
  stepIndex: number;          // 当前走到第几步
};

type Store = {
  // ...
  movementAnim: MovementAnimation | null;  // 新增
};
```

#### rollAndMove 拆分为"掷骰 + 逐格走 + 落地"

```ts
rollAndMove: async () => {
  // ... 既有的 guard
  const roll = rollDice();
  set({ isRolling: true, lastDice: roll });
  await sleep(800);

  // 计算完整路径
  const path: number[] = [];
  let pos = currentPlayer.position;
  path.push(pos);
  for (let i = 0; i < roll; i++) {
    pos = (pos + 1) % BOARD_SIZE;
    path.push(pos);
  }

  set({
    isRolling: false,
    isMoving: true,
    movementAnim: { playerId: currentPlayer.id, path, stepIndex: 0 },
  });

  // 逐格走
  const STEP_MS = 260;
  for (let i = 1; i < path.length; i++) {
    // 可取消：每 step 前检查 phase 是否还是 monopoly
    const s = get();
    if (!s.game || s.game.phase !== 'monopoly') return;

    set({ movementAnim: { ...s.movementAnim!, stepIndex: i } });

    // 同步 player.position 到当前 step（Board 读 displayPosition = position）
    const stepPos = path[i]!;
    const updatedPlayer = { ...currentPlayer, position: stepPos };
    const players = s.game.players.map(p => p.id === updatedPlayer.id ? updatedPlayer : p);
    set({ game: { ...s.game, players } });

    await sleep(STEP_MS);
  }

  set({ movementAnim: null });

  // 之后流程：lapBonus + resolveLanding + ... 不变
}
```

#### Board 组件改动

- 为当前正在走的 pawn 加 CSS class `animate-hop`（每步 scale 1.15 → 1 的 bounce）
- 不改 `player.position` 读法（现有逻辑兼容）

```css
@keyframes hop {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-6px) scale(1.1); }
}
.animate-hop { animation: hop 260ms ease-out; }
```

#### E2E 风险与 mitigation

- `tick()` 仍可能在动画中触发 endGame → 每 step 前 re-check `phase`，早退清理 `movementAnim`
- `isMoving === true` 期间其他 actions 照样被 gate，不变

### 2.6 改动 F · 答题胜利怪兽爆炸特效

#### 设计

- 新增全屏 overlay 组件 `BattleEffect.tsx`：在 `quizResult.correct === true` 时，播放 ~1200ms 动画：
  - 怪兽图（或 🧟 回退）从屏幕中心小跳动 → 被光线穿过 → 爆炸粒子散开 → 消失
  - CSS keyframes 三段：`enter` (0-400ms) / `hit` (400-800ms) / `explode` (800-1200ms)
  - 光线从攻击者英雄位置（随机色，沿 `getHero().color`）向怪兽射出
- 同步 QuizResultToast：延迟 1200ms 后显示（或 z-index 压在特效之下，特效结束才可点击"继续"）

#### 实现

```tsx
// src/features/effects/BattleEffect.tsx
export const BattleEffect = () => {
  const result = useGameStore(s => s.quizResult);
  const [phase, setPhase] = useState<'idle' | 'playing'>('idle');

  useEffect(() => {
    if (result?.correct) {
      setPhase('playing');
      const t = setTimeout(() => setPhase('idle'), BATTLE_EFFECT_DURATION_MS);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [result]);

  if (phase !== 'playing' || !result) return null;
  return (
    <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center">
      <div className="animate-monster-enter">
        <MonsterSprite bossId={inferMonsterId(result)} size="xl" />
      </div>
      <div className="animate-ray-shoot absolute" />
      <div className="animate-explosion absolute" />
    </div>
  );
};
```

#### QuizResult 派生字段

- `result.correct = outcome === 'correct' || outcome === 'help'`（在 submitAnswer 设置）
- `result.contextKind` 帮助选择合适的怪兽视觉（study → 周目 Boss 预告版、monster → 通用小怪、property-buy → 光幕、boss-attack → 当前 Boss）

#### 延迟展示 QuizResultToast

```tsx
// QuizResultToast.tsx
const [ready, setReady] = useState(false);
useEffect(() => {
  if (!result) return;
  if (result.correct) {
    const t = setTimeout(() => setReady(true), BATTLE_EFFECT_DURATION_MS);
    return () => clearTimeout(t);
  }
  setReady(true);  // 答错立即显示
  return undefined;
}, [result]);

if (!result || !ready) return null;
```

#### Boss 阶段同步

Boss 血条在 `submitAnswer` 更新后，同步触发特效；finalize boss 用 `BATTLE_EFFECT_DURATION_MS` 常量代替硬编码 `1200`。

### 2.7 改动 G · 骰子动画优化

#### 改 `Dice.tsx`（view-local，无 store 改动）

```tsx
const PIPS = ['⚀','⚁','⚂','⚃','⚄','⚅'];

export const DicePanel = () => {
  const lastDice = useGameStore(s => s.lastDice);
  const isRolling = useGameStore(s => s.isRolling);
  const rollAndMove = useGameStore(s => s.rollAndMove);

  const [displayFace, setDisplayFace] = useState<number | null>(null);

  useEffect(() => {
    if (!isRolling) {
      if (lastDice) setDisplayFace(lastDice);
      return undefined;
    }
    // 减速序列：快→慢 切换面，总时长约 750ms
    const schedule = [60, 60, 80, 100, 140, 200]; // 间隔逐渐加长
    let i = 0;
    let t: number | undefined;
    const tick = () => {
      setDisplayFace(Math.floor(Math.random() * 6) + 1);
      if (i < schedule.length) {
        t = window.setTimeout(tick, schedule[i]!);
        i += 1;
      }
    };
    tick();
    return () => { if (t) clearTimeout(t); };
  }, [isRolling, lastDice]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-white text-7xl text-slate-900 shadow-xl transition-transform ${isRolling ? 'animate-dice-roll' : 'animate-dice-settle'}`}
        aria-live="polite"
        aria-label={lastDice ? `掷出 ${lastDice} 点` : '骰子'}
      >
        {displayFace ? PIPS[displayFace - 1] : '🎲'}
      </div>
      <button ... onClick={rollAndMove} ... />
    </div>
  );
};
```

#### CSS keyframes

```css
@keyframes dice-roll {
  0%, 100% { transform: rotate(0) scale(1); }
  25% { transform: rotate(180deg) scale(0.95); }
  50% { transform: rotate(360deg) scale(1.05); }
  75% { transform: rotate(540deg) scale(0.95); }
}
@keyframes dice-settle {
  0% { transform: scale(1.2); }
  60% { transform: scale(0.95); }
  100% { transform: scale(1); }
}
.animate-dice-roll { animation: dice-roll 800ms cubic-bezier(0.2, 0.7, 0.3, 1); }
.animate-dice-settle { animation: dice-settle 280ms cubic-bezier(0.3, 1.4, 0.6, 1); }
```

#### 无障碍

- `<button>` 保留，Enter/Space 触发
- `aria-live="polite" aria-label` 仅在 settle 后朗读最终点数
- `@media (prefers-reduced-motion: reduce)` 禁用 rotate/scale，仅平滑切换 face

---

## 3 · Implementation Steps（排序至关重要）

**铁律**：A 组先做（修正行为），再做 B/C/D（v1），最后 E/F/G（v2 增项）。这样 Codex 发现的 CRITICAL bug 最早解决。

| # | 步骤 | 交付 | 执行者 |
|---|---|---|---|
| 1 | **A1** 拆 isChild gate：rollAndMove (study/monster) / confirmBuy / bossAttack 移除守护 | gameStore 4 处 | Claude |
| 2 | **A2** `recordWrong` 写入加 `quiz.playerId === childId` 条件 | submitAnswer + quizTimeout 2 处 | Claude |
| 3 | **A3** 确认 weapon 奖励仍 child-only（无改动，加注释） | gameStore 注释 | Claude |
| 4 | **A4** 抽题耗尽 reshuffle 逻辑 | gameStore.rollAndMove | Claude |
| 5 | **A5** HeroSelect 强制恰好 1 个 child（radio 风格） | HeroSelect.tsx | Claude |
| 6 | **A6** QuizModal 文案根据 `playerId === childId` 动态 | QuizModal.tsx | Claude |
| 7 | **A7** 扩展 QuizResult 类型加 `correct`/`contextKind`/`playerId` | types + gameStore | Claude |
| 8 | **A8** bossAttack 移除 adult 自动命中，改为走 quiz | gameStore.bossAttack | Claude |
| 9 | 跑 typecheck + test，确认既有测试通过 | CI 绿 | Claude |
| 10 | **C** features.ts + quizTimer gate（v1 改动） | 3 处 | Claude |
| 11 | **B1-B2** assetResolver + ImageWithFallback + HeroAvatar + MonsterSprite + READMEs | 5 个新文件 | Claude |
| 12 | **B3** 各消费者换头像（HeroSelect/PlayerPanel/BossScene/Settle/Result/WeaponCabinet） | 6 处 | Codex → Claude 审 |
| 13 | **D** 一屏外壳 + HeroSelect/BossScene/Settle 布局重写 | 3 个文件重写 | Codex → Claude 审 |
| 14 | **D-follow** MainMenu/ReviewMode/ResultScreen/GameScreen 套一屏外壳 + PlayerPanel compact | 5 处小改 | Claude |
| 15 | **E** gameStore 加 movementAnim 状态 + rollAndMove 逐格循环 + cancel 保护 | gameStore 1 处 | Claude |
| 16 | **E-UI** Board 加 animate-hop 给当前 pawn | Board.tsx | Claude |
| 17 | **E** 单测：movementAnim 路径生成 + 每 step phase 校验 | 新增 tests | Claude |
| 18 | **F1** QuizResult 结构已扩展（A7 完成），在 submitAnswer 补 `correct`/`contextKind` 填充 | gameStore | Claude |
| 19 | **F2** 新建 BattleEffect.tsx + CSS keyframes | 新文件 | Claude |
| 20 | **F3** QuizResultToast 延迟 BATTLE_EFFECT_DURATION_MS 显示（correct 场景） | QuizResultToast.tsx | Claude |
| 21 | **F4** 替换 3 处 setTimeout(1200) 为常量 | gameStore | Claude |
| 22 | **F5** GameScreen / BossScene 注入 `<BattleEffect />` 到 overlay 层 | 2 处 | Claude |
| 23 | **G** Dice.tsx 加 face-cycling + CSS keyframes + aria | Dice.tsx + index.css | Claude |
| 24 | 跑完整 `pnpm -r typecheck lint test` + Playwright e2e | 全绿 | Claude |
| 25 | E2E 新测试：5 人全员答题一轮 + 路标动画时长 | 新增 spec | Claude |
| 26 | Codex review 终审整个 diff | 审校报告 | Codex (复用 session) |
| 27 | 按 review 修 CRITICAL/HIGH → commit | git | Claude |

---

## 4 · Key Files

| File | Operation | 说明 |
|---|---|---|
| `apps/web/src/config/features.ts` | NEW | `quizTimer: false` + `BATTLE_EFFECT_DURATION_MS: 1200` |
| `apps/web/src/theme/assetResolver.ts` | NEW | 3 个 resolve 函数 |
| `apps/web/src/ui/ImageWithFallback.tsx` | NEW | onError 回退 |
| `apps/web/src/theme/ultraman/HeroAvatar.tsx` | NEW | 4 size 英雄头像 |
| `apps/web/src/theme/ultraman/MonsterSprite.tsx` | NEW | 怪兽图（Boss + 特效共用） |
| `apps/web/src/theme/ultraman/heroes.ts` | MODIFY | 加 `imageUrl?` |
| `apps/web/public/assets/{heroes,monsters,weapons}/README.md` | NEW | 约定说明 |
| `apps/web/src/features/effects/BattleEffect.tsx` | NEW | 胜利爆炸特效 |
| `apps/web/src/features/board/Dice.tsx` | REWRITE | 面循环 + 减速 + a11y |
| `apps/web/src/features/board/Board.tsx` | MODIFY | animate-hop class |
| `apps/web/src/features/setup/HeroSelect.tsx` | REWRITE | radio child + 一屏 + 头像 |
| `apps/web/src/features/boss/BossScene.tsx` | REWRITE | 左右分栏 + Monster/Hero 图 + 一屏 |
| `apps/web/src/features/settle/SettleScreen.tsx` | MODIFY | 一屏 + HeroAvatar |
| `apps/web/src/features/result/ResultScreen.tsx` | MODIFY | 一屏 + HeroAvatar |
| `apps/web/src/features/game/GameScreen.tsx` | MODIFY | 传 compact + 注入 BattleEffect |
| `apps/web/src/features/players/PlayerPanel.tsx` | MODIFY | compact prop + HeroAvatar |
| `apps/web/src/features/players/WeaponCabinet.tsx` | MODIFY | HeroAvatar + 武器图 |
| `apps/web/src/features/quiz/QuizModal.tsx` | MODIFY | CountdownBar gate + 动态文案 |
| `apps/web/src/features/quiz/QuizResultToast.tsx` | MODIFY | 延迟显示 correct 场景 |
| `apps/web/src/features/menu/MainMenu.tsx` | MODIFY | 一屏外壳 |
| `apps/web/src/features/review/ReviewMode.tsx` | MODIFY | 一屏外壳 |
| `apps/web/src/features/board/LandingOverlay.tsx` | MODIFY | z-index 让位特效 |
| `apps/web/src/stores/gameStore.ts` | MODIFY | 全员答题 + wrongBook 归属 + movementAnim + reshuffle + tick 重排 + 常量化 1200 |
| `apps/web/src/index.css` | MODIFY | @keyframes dice-roll/dice-settle/hop/monster-*/ray-*/explosion |
| `apps/web/src/theme/__tests__/assetResolver.test.ts` | NEW | 3 种 resolve 测试 |
| `apps/web/src/stores/__tests__/movementAnim.test.ts` | NEW | 路径生成 + 取消 |
| `apps/web/src/stores/__tests__/wrongBookScope.test.ts` | NEW | 大人答错不入错题本 |
| `apps/web/tests/e2e/fitsInViewport.spec.ts` | NEW | iPad 横屏 1180×820 不滚动 |
| `apps/web/tests/e2e/allPlayersAnswer.spec.ts` | NEW | 全员答题流程 |

---

## 5 · Risks and Mitigation

| 风险 | 严重度 | Mitigation |
|---|---|---|
| 大人答错污染孩子错题本 | **CRITICAL** | A2 步骤强制 `quiz.playerId === childId` 才写 |
| 路标动画中 tick() 触发 endGame 导致状态撕裂 | HIGH | 每 step 前 re-check phase；早退清理 movementAnim |
| BattleEffect 重复播放（stale state） | MEDIUM | useEffect 依赖 `result`，用 key 保证 unmount 重建 |
| 5 人+全员答题节奏过长 | MEDIUM | 倒计时已关闭（D）+ 问题只在 study/monster/buy/boss 触发，不是每步 |
| 题库耗尽游戏卡死 | MEDIUM | A4 reshuffle 逻辑 |
| iPad Safari CSS 动画性能 | LOW-MED | 全部 transform+opacity，避免 filter/box-shadow |
| Help 答对应不应该算 streak | LOW | 按 Codex 建议：保持现状（help 仍加 streak），如需改再迭代 |

---

## 6 · Test Strategy

| Type | Scope | Verification |
|---|---|---|
| Unit | `assetResolver`（3 种）+ fallback | Vitest |
| Unit | `gameStore.wrongBookScope`：大人答错不入错题本 | Vitest |
| Unit | `gameStore.movementAnim`：路径生成 `[start, s1..s6]` 正确 + cancel 清理 | Vitest |
| Unit | `gameStore.reshuffle`：题库耗尽后能再抽 | Vitest |
| Unit | HeroAvatar 回退 / Dice 减速时序 | Vitest |
| E2E | 一屏：iPad 1180×820 断言 scrollHeight ≤ clientHeight（每屏） | Playwright |
| E2E | 全员答题：3 人依次走到 study 格都弹 quiz | Playwright |
| E2E | 路标动画：点掷骰 → 等待动画 → pawn 跨越正确格数 | Playwright |
| E2E | 胜利特效：答对后 1.2s 内不可点继续 | Playwright |
| 手动 | 视觉校准：骰子手感 / 怪兽爆炸视觉 / 头像真图替换生效 | 家长验收 |

---

## 7 · Execution Model Routing

| 任务 | 执行者 | 说明 |
|---|---|---|
| 状态机改动（gameStore 多处） | Claude 直写 | 复杂+关联紧，Claude 更稳 |
| 新建 UI 组件（HeroAvatar/ImageWithFallback/MonsterSprite/BattleEffect） | Claude 直写 | 小文件 |
| HeroSelect / BossScene 大屏重写（~200/~160 行） | Codex 生成 → Claude 审并应用 | 布局活 |
| Dice.tsx 优化 | Claude 直写 | view-local 小改 |
| 新增单测 | Claude 直写 | 设计测试用例 |
| E2E specs | Claude 直写 | |
| 终审 | Codex（resume session） | CRITICAL 复查 |

---

## 8 · 默认答案（若无异议直接用）

| Codex 提出的 Q | 默认答案 |
|---|---|
| Help 答对是否加 streak？ | 保持现状（加），如需改再迭代 |
| 题库耗尽处理？ | Reshuffle（清 askedQuestionIds 重抽） |
| 强制 1 个 child？ | 是，HeroSelect radio + 开始按钮 validation |
| 路标动画 per-step ms？ | 260ms |
| 特效总时长？ | 1200ms（全局常量） |
| 骰子减速总时长？ | ~750ms（schedule 60/60/80/100/140/200） |

---

## 9 · SESSION_ID

- CODEX_SESSION: `codex-1776555975-66166`（已在本次分析复用）

---

**估时**：连续编码 4-5 小时 + 1 小时 QA。27 个 step，Codex 调度 ~3 次（HeroSelect/BossScene 重写 + 终审）。
