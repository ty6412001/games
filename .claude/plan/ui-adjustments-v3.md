# UI 调整计划 v3 · 答题选学科 + 满屏布局 + 奥特曼 SVG 资源重制

**迭代于**：`.claude/plan/ui-adjustments-v2.md`（已执行）
**Scope**：UI 层 + 少量 store 状态扩展 + 一批 SVG 资源
**Execution target**：`/ecc:multi-execute`

---

## 0 · 改动概述

| 项 | 类型 |
|---|---|
| **①** 答题前选择学科（语文/数学/英语） | store 状态机扩展 + 新 UI |
| **②** 一屏满屏（填满 iPad 横屏 1180×820，左右不留空） | 布局重构 |
| **③** 奥特曼 SVG 资源重制（英雄 4 + 怪兽 18） | 手工 SVG 艺术资源 |

---

## 1 · Analysis Summary（Claude + Codex 一致）

### 1.1 Codex 抓到的 CRITICAL 陷阱（Claude 需警惕）

> **学科历史追踪**：当前 `pickQuestionWithReshuffle` 抽不到题时**清空整个 askedQuestionIds**。放开学科选择后，若"英语"答完触发 reshuffle，会把数学/语文的已答记录也清掉 → 数学/语文开始早期重复。必须改成 **按学科隔离** askedIds。

修正：`askedQuestionIds: Set<string>` 改为 `askedQuestionIds: Map<Subject, Set<string>>`，reshuffle 只清对应学科。

### 1.2 一致结论

- **学科选择器**是独立 overlay 相位 (`pendingQuiz`)，不合并入 `activeQuiz`
- **满屏**用 3 列 grid（左 spotlight / 中 Board / 右 leaderboard），避免塞中心
- **SVG** 用透明底 portrait，不要自带 card 背景；组件框架负责装饰
- 顺序：先做 ① 释放流程影响，再做 ② 容纳新 UI，最后 ③ 艺术资源

### 1.3 默认决策（若无异议直接用）

| Codex 提问 | 默认 |
|---|---|
| 学科全部显示 vs 灰掉空池？ | **全部显示**，空池时学科按钮显示 "本轮已答完，点即重抽" 但仍可点 |
| property-buy/boss-attack 有"返回"吗？ | **无**。一旦确认 buy/attack 就必须答题（避免投机） |
| 侧栏宽度？ | `clamp(200px, 18vw, 240px)` |
| SVG 格式 | **透明底 portrait**，viewBox 统一 `0 0 128 128`；组件提供框架/背景 |

---

## 2 · Technical Solution

### 2.1 改动 A · 答题前学科选择

#### State machine 扩展

```
idle → pendingQuiz → activeQuiz → quizResult → idle
       ^                               ↑
  Subject picker                 Battle effect + toast
```

#### gameStore 变更

```ts
// 扩展 store state
type Store = {
  // ...
  // 旧：askedQuestionIds: Set<string>
  // 新：按学科隔离
  askedQuestionIds: Record<Subject, Set<string>>;

  // 新：pending quiz 等待学科选择
  pendingQuiz: {
    context: QuizContext;
    playerId: string;
  } | null;

  // 新 action
  enqueueQuiz: (context: QuizContext, playerId: string) => void;
  selectSubject: (subject: Subject) => void;
  cancelPendingQuiz: () => void; // 仅 study/monster 场景可取消
};
```

#### 新 helper（替换 `pickQuestionWithReshuffle`）

```ts
const pickQuestionForSubject = (
  pack: QuestionPack,
  asked: Record<Subject, Set<string>>,
  subject: Subject,
): { question: Question; asked: Record<Subject, Set<string>> } | null => {
  const subjectAsked = asked[subject] ?? new Set();
  const fresh = pickRandomQuestion(pack, { subject, excludeIds: subjectAsked });
  if (fresh) {
    return {
      question: fresh,
      asked: { ...asked, [subject]: new Set([...subjectAsked, fresh.id]) },
    };
  }
  // 只清该学科 history，其他学科保持
  const reshuffled = pickRandomQuestion(pack, { subject, excludeIds: new Set() });
  if (!reshuffled) return null;
  return {
    question: reshuffled,
    asked: { ...asked, [subject]: new Set([reshuffled.id]) },
  };
};
```

#### 调用点改造

`rollAndMove` (study/monster) / `confirmBuy` / `bossAttack` 不再直接调用 `startQuiz`，改为：
```ts
enqueueQuiz({ kind: 'study' }, movedPlayer.id);
// ↑ 只设置 pendingQuiz；UI 上弹 SubjectSelector
```

`selectSubject(subject)` 读取 `pendingQuiz`，抽题，转 `activeQuiz`，清 `pendingQuiz`。

#### 新 UI：SubjectSelector.tsx

```tsx
// features/quiz/SubjectSelector.tsx
const SUBJECTS: { id: Subject; label: string; icon: string; color: string }[] = [
  { id: 'chinese', label: '语文', icon: '📝', color: 'bg-rose-500' },
  { id: 'math',    label: '数学', icon: '🔢', color: 'bg-blue-500' },
  { id: 'english', label: '英语', icon: '🔤', color: 'bg-emerald-500' },
];

export const SubjectSelector = () => {
  const pending = useGameStore((s) => s.pendingQuiz);
  const pack = useGameStore((s) => s.currentPack);
  const asked = useGameStore((s) => s.askedQuestionIds);
  const select = useGameStore((s) => s.selectSubject);
  const cancel = useGameStore((s) => s.cancelPendingQuiz);
  if (!pending || !pack) return null;

  const canCancel = pending.context.kind === 'study' || pending.context.kind === 'monster';
  const availCount = (subj: Subject) => pack.questions.filter(q => q.subject === subj).length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-6">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-900 p-6 ring-2 ring-amber-400/40">
        <h2 className="text-center text-2xl font-black">选择学科答题</h2>
        <p className="mt-1 text-center text-sm text-slate-400">点击下面三门学科之一开始</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {SUBJECTS.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => select(s.id)}
              disabled={availCount(s.id) === 0}
              className={`flex min-h-[120px] flex-col items-center justify-center rounded-2xl ${s.color} px-4 py-6 text-white shadow-lg transition disabled:opacity-40`}
            >
              <span className="text-5xl">{s.icon}</span>
              <span className="mt-2 text-2xl font-black">{s.label}</span>
              <span className="text-xs opacity-80">共 {availCount(s.id)} 题</span>
            </button>
          ))}
        </div>
        {canCancel ? (
          <button
            type="button"
            onClick={cancel}
            className="mt-4 w-full rounded-xl bg-slate-700 py-2 text-sm"
          >
            跳过本题（错过加成）
          </button>
        ) : null}
      </div>
    </div>
  );
};
```

cancelPendingQuiz：对 study/monster 走 fallback reward；对 property-buy/boss-attack 不允许（按钮隐藏）。

#### 集成点

- `GameScreen.tsx` 新增挂载 `<SubjectSelector />`
- 现有 gate 条件（`isRolling || buyPrompt || landingEvent || activeQuiz || quizResult`）需加 `|| pendingQuiz`

### 2.2 改动 B · 一屏满屏布局

#### 新 Shell（GameScreen）

```tsx
export const GameScreen = () => {
  // ... 原判断
  return (
    <div className="h-[100svh] overflow-hidden bg-slate-950 p-2 text-slate-50">
      <div
        className="mx-auto grid h-full max-w-[1400px] gap-2"
        style={{
          gridTemplateColumns: 'clamp(200px, 18vw, 260px) minmax(0, 1fr) clamp(200px, 18vw, 260px)',
        }}
      >
        <CurrentPlayerSpotlight />  {/* 左 */}
        <BoardArea />                {/* 中，保持 aspect-square，max-h-full */}
        <Leaderboard />              {/* 右 */}
      </div>
      {/* overlays */}
      <LandingOverlay />
      <QuizModal />
      <SubjectSelector />
      <BattleEffect />
      <QuizResultToast />
      <WeaponAwardToast />
      {game.phase === 'settle' ? <SettleScreen /> : null}
    </div>
  );
};
```

#### 组件分工

**Left · `CurrentPlayerSpotlight`**（聚焦当前出手的人）
```
┌──────────────┐
│              │
│  🎖️ 第 N 周  │ ← 小标签
│   ⏳ 12:34   │
│              │
│  ┌────────┐ │
│  │        │ │
│  │ 大头像  │ │ ← 当前玩家 HeroAvatar size=xl
│  │  (96px) │ │
│  └────────┘ │
│              │
│  小明 👶     │
│  赛罗 (#1)   │
│              │
│  💰 ¥1,320   │
│  🏠 3 地产   │
│  🎫 2 求助    │
│  🔥 连对 2    │
│              │
│  ⚡ 装备:     │
│  赛罗光线    │
│              │
│  ┌────────┐ │
│  │ 🎲 掷骰 │ │ ← 主 CTA
│  └────────┘ │
└──────────────┘
```

**Center · `BoardArea`** — 居中正方形 Board，去掉 centerControls prop（中心放一个小标题/本周 Boss 预告即可）

**Right · `Leaderboard`**（所有玩家，按资产降序）
```
┌──────────────┐
│  🏆 排行榜    │
│              │
│ #1 爸爸      │ ← HeroAvatar sm + name
│    ¥2,100    │
│    🏠3       │
│              │
│ #2 小明 👶   │
│    ¥1,320    │
│              │
│ #3 妈妈      │
│    ¥1,150    │
│              │
│ ...          │
│              │
│ 🎲 上次 4    │ ← 底部小块：最近事件
│ 📚 学习格    │
└──────────────┘
```

#### 删除/改造

- `CenterControls.tsx` **删除**（内容拆进 Spotlight / Leaderboard）
- `Board.tsx` `centerContent` prop **保留**，但默认内容改为简短标题
- `PlayerPanel.tsx` 保留（错题本复习 / 结算仍会复用）但 GameScreen 不再直接挂它

### 2.3 改动 C · 奥特曼 SVG 资源重制

#### 产出

**英雄 4 件**（`public/assets/heroes/*.svg`）
- `tiga.svg`（迪迦）—— 紫银体 + V 型胸口水晶 + 头顶短冠 + 圆柱状额头水晶
- `zero.svg`（赛罗）—— 蓝银体 + 红横纹 + 头顶两把 Zero Sluggers（锯齿状）
- `decker.svg`（德凯）—— 绿银体 + 流线胸甲 + D 型额头标志
- `belial.svg`（贝利亚）—— 深紫黑体 + 金色獠牙尖齿 + 一对兽形犄角 + 胸甲反派款

模板规范：
- viewBox `0 0 128 128`
- 透明底（组件框架负责圆角/色块）
- 每个 80-140 行纯手写 path
- 共通元素：头盔轮廓 / 一对晶体眼 / 胸口色彩计时器（圆/方/钻型）/ 肩甲 / 短躯干
- 各自 signature 元素（V 冠 / Sluggers / D 标 / 獠牙）

**怪兽 18 只**（`public/assets/monsters/*.svg`）

5 个 archetype 基底：
1. **龙型暴兽**（杰顿、哥莫拉、雷德王、潘顿、磁力怪兽）：粗壮四肢 + 长尾 + 头顶单角/多角
2. **虫型异星人**（巴尔坦、扎拉布、美特隆）：蟹钳 + 多眼 + 触角
3. **飞行/爬行**（泰雷斯顿、伯顿、艾雷王）：翼状肩甲 + 长喙/尖嘴
4. **犄角魔王**（恩贝拉、皇帝贝利亚、黑暗扎基、怪兽之王）：宽肩 + 利爪 + 王冠状头饰
5. **人型入侵者**（美菲拉斯、斯卡伊冬、杰米拉）：人形轮廓 + 面具/披风

按 archetype 复用 path 骨架，换颜色/细节 → 18 只可控工作量。

#### 模板示例（供 Codex 批量生成参考）

```svg
<!-- 龙型基底 (archetype-brute.svg) -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <!-- 躯干 -->
  <path d="M40 70 L88 70 L92 110 L36 110 Z" fill="{bodyColor}" stroke="{outline}" stroke-width="2"/>
  <!-- 头 -->
  <ellipse cx="64" cy="48" rx="22" ry="24" fill="{headColor}" stroke="{outline}" stroke-width="2"/>
  <!-- 角 (signature 位) -->
  <!-- 眼睛 -->
  <circle cx="56" cy="48" r="3" fill="{eyeColor}"/>
  <circle cx="72" cy="48" r="3" fill="{eyeColor}"/>
  <!-- 嘴/獠牙 -->
  <path d="M52 58 L64 66 L76 58" stroke="{outline}" stroke-width="2" fill="none"/>
  <!-- 腿 -->
  <rect x="44" y="95" width="10" height="20" fill="{bodyColor}" stroke="{outline}"/>
  <rect x="74" y="95" width="10" height="20" fill="{bodyColor}" stroke="{outline}"/>
  <!-- 尾巴 -->
  <path d="M90 100 Q110 90 118 110" stroke="{bodyColor}" stroke-width="6" fill="none"/>
</svg>
```

#### 代码侧微调

- `HeroAvatar.tsx` 背景色保留（透明 portrait 需要色背景衬托）
- `MonsterSprite.tsx` 背景色保持 `bg-rose-950/50`
- `heroes.ts` 颜色表保持（owner dot 用 `hero.color`，SVG 独立色彩系统）

---

## 3 · Implementation Steps

### A 组 · 学科选择（状态 + UI）

| # | 步骤 | 执行者 |
|---|---|---|
| A1 | 把 `askedQuestionIds` 从 `Set<string>` 改为 `Record<Subject, Set<string>>`，迁移所有引用 | Claude |
| A2 | 新增 `pendingQuiz` 状态 + `enqueueQuiz/selectSubject/cancelPendingQuiz` 三个 action | Claude |
| A3 | 替换 `pickQuestionWithReshuffle` → `pickQuestionForSubject`（subject-scoped reshuffle）| Claude |
| A4 | `rollAndMove`/`confirmBuy`/`bossAttack` 改为 enqueue 而非直接 startQuiz | Claude |
| A5 | 所有 gate 条件加 `|| pendingQuiz` | Claude |
| A6 | 新建 `features/quiz/SubjectSelector.tsx` | Claude |
| A7 | `GameScreen`/`BossScene` 挂载 `<SubjectSelector />` | Claude |
| A8 | 新单测：subject-scoped reshuffle / pendingQuiz 转换 | Claude |
| A9 | 迁移现有 `wrongBookScope.test.ts` 因签名变更 | Claude |

### B 组 · 满屏布局

| # | 步骤 | 执行者 |
|---|---|---|
| B1 | 新建 `features/game/CurrentPlayerSpotlight.tsx`（左栏） | Codex → Claude 审 |
| B2 | 新建 `features/game/Leaderboard.tsx`（右栏） | Codex → Claude 审 |
| B3 | 重写 `GameScreen.tsx` 3 列 grid | Claude |
| B4 | 简化 `Board.tsx` 中心默认内容（周次+本周 Boss 小卡） | Claude |
| B5 | 删除 `CenterControls.tsx` | Claude |
| B6 | 调整 `DicePanel` 样式让它嵌入 Spotlight 底部（加 `compact` 模式） | Claude |
| B7 | 更新 E2E `fitsInViewport` 断言左中右都可见 | Claude |

### C 组 · 奥特曼 SVG 资源

| # | 步骤 | 执行者 |
|---|---|---|
| C1 | 产出 4 个英雄 SVG master（tiga/zero/decker/belial） | Codex（艺术）→ Claude 审 |
| C2 | 产出 5 个怪兽 archetype 模板 | Codex |
| C3 | 基于模板批量生成 18 个怪兽 SVG（按周一一对应） | Codex（批量 2-3 次调用）|
| C4 | 本地渲染校验（sm/md/lg 尺寸都清晰可辨）| Claude |
| C5 | 更新 README 说明"系统自带风格化奥特曼 SVG；放 PNG 可覆盖" | Claude |

### 顺序与检查点

1. **A 组先全做完**（释放对 pendingQuiz 的引用，否则 B/C 测试会漂）
2. **B 组**（布局）
3. **C 组**（资源）—— 可在 B 过程中并行启动 Codex 生成，B 完成后应用
4. 最后跑全 CI + E2E + 手动 iPad 横屏验证

---

## 4 · Key Files

| File | Operation |
|---|---|
| `apps/web/src/stores/gameStore.ts` | MODIFY（askedQuestionIds 结构 + pendingQuiz + subject helper） |
| `apps/web/src/domain/questionPicker.ts` | 如需 subject-scoped helper 扩展此处（可选） |
| `apps/web/src/features/quiz/SubjectSelector.tsx` | NEW |
| `apps/web/src/features/game/GameScreen.tsx` | REWRITE（3 列 grid） |
| `apps/web/src/features/game/CurrentPlayerSpotlight.tsx` | NEW |
| `apps/web/src/features/game/Leaderboard.tsx` | NEW |
| `apps/web/src/features/game/CenterControls.tsx` | DELETE |
| `apps/web/src/features/board/Board.tsx` | MODIFY（默认中心内容简化） |
| `apps/web/src/features/board/Dice.tsx` | MODIFY（可选 compact 嵌入 Spotlight） |
| `apps/web/public/assets/heroes/tiga.svg` | REWRITE（详细奥特曼风格） |
| `apps/web/public/assets/heroes/zero.svg` | REWRITE |
| `apps/web/public/assets/heroes/decker.svg` | REWRITE |
| `apps/web/public/assets/heroes/belial.svg` | REWRITE |
| `apps/web/public/assets/monsters/*.svg` | NEW × 18 |
| `apps/web/src/stores/__tests__/wrongBookScope.test.ts` | 跟随签名变更 |
| `apps/web/src/stores/__tests__/pendingQuiz.test.ts` | NEW |
| `apps/web/src/domain/__tests__/questionPicker.test.ts` | 加 subject-scoped 用例 |

---

## 5 · Risks and Mitigation

| 风险 | 严重 | 缓解 |
|---|---|---|
| askedQuestionIds 结构迁移破坏现有 wrongBookScope 测试 | HIGH | A9 步骤同步改测试 |
| Subject 空池时 UI 卡死 | MEDIUM | 学科按钮 disabled + cancelPendingQuiz 兜底 |
| Subject reshuffle 跨学科污染 | HIGH (Codex 找到) | `pickQuestionForSubject` 只清目标学科 |
| Leaderboard 玩家多时高度溢出 | MEDIUM | 右栏 `overflow-y-auto` + 每行压缩到 64px |
| Spotlight 当前玩家切换 UI 闪烁 | LOW | 用 `key={playerId}` + transition |
| SVG 在 sm (32px) 下细节丢失 | MEDIUM | 手工校对每只；signature 元素放粗线 |
| 18 只怪兽 SVG 工作量大 | MEDIUM | archetype + 批量 Codex 生成 |

---

## 6 · Test Strategy

| Type | Scope |
|---|---|
| Unit | `pickQuestionForSubject` subject-scoped reshuffle（含耗尽后重抽） |
| Unit | `pendingQuiz` 状态转换：enqueue → select → active / cancel → idle |
| Unit | `wrongBookScope`（迁移） |
| E2E | 完整答题循环：dice → landing → SubjectSelector 弹出 → 选语文 → 题 → 结果 |
| E2E | Boss 阶段：选武器 → SubjectSelector → 题 → 攻击 |
| E2E | 1180×820 viewport：左中右三列均可见，`toBeInViewport` 断言 |
| Visual | 手工校验 4 英雄 SVG + 18 怪兽 SVG 小尺寸可辨识 |

---

## 7 · Execution Model Routing

| 任务 | 执行者 |
|---|---|
| gameStore 状态结构变更 | Claude 直写 |
| SubjectSelector UI | Claude 直写 |
| CurrentPlayerSpotlight / Leaderboard | Codex 生成 → Claude 审 |
| GameScreen rewrite | Claude 直写 |
| 英雄 SVG × 4 | Codex（每个独立调用）→ Claude 审 |
| 怪兽 SVG × 18 | Codex 批量（2-3 次调用）→ Claude 审 |
| 单测 / E2E | Claude 直写 |
| 终审 | Codex (session resume) |

---

## 8 · 默认答案（无异议即采用）

| Codex Q | 默认 |
|---|---|
| 学科全显/灰屏？ | 全显；空池学科按钮 disabled + "本轮已答完" 标记 |
| property-buy/boss-attack 返回？ | 无返回 |
| 侧栏宽度？ | `clamp(200px, 18vw, 260px)` 两侧 |
| SVG 风格？ | 透明底 portrait + viewBox `0 0 128 128` |

---

## 9 · SESSION_ID

- CODEX_SESSION: `codex-1776555975-66166`

---

**预计工作量**：4-5 小时编码 + 2-3 小时 SVG 产出 + 40 分钟 QA。共 21 步，Codex 调度 ~8 次（UI 2 + 英雄 4 + 怪兽 batch 2 + 终审 1）。
