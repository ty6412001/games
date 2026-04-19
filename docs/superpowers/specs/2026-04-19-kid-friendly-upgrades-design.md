# 7 岁娃友好度三轴升级（A 文案 + C 德凯收集 + F 输入手感）

**日期**：2026-04-19
**目标用户画像**：一年级下学期小朋友（约 7 岁），正在"认字阶段"
**动机**：以娃的视角回看现有游戏，识字门槛 / 爽感缺失 / 输入笨重是三大痛点；本次一起落地

## 范围（不含什么）

**含**：
- A 类 UI 术语简化 + 难词小字讲解
- C 类 德凯专属形态 / 武器 / 必杀系统（局内）
- F 类 数字键盘 + 排序题大按钮
- 6 处 UI 调整

**不含**：
- 拼音注音（认字阶段，娃要自己读）
- 朗读 / TTS（同上）
- 声音 / 音效 / 庆祝音（C1 范畴，明确跳过）
- 角色语音（C3 范畴）
- 其他奥特曼的形态扩展（本次只扩德凯）
- 破产缓冲 / 情绪安全（B 类，本轮不动）
- 游戏节奏 / 等待时间（D 类，本轮不动）

## 为什么不要拼音

一年级下学期娃处于"认字阶段"，给界面加拼音会变成识字拐杖，反而延迟独立认字能力。本次选择把**学习材料（题目）**和**游戏外壳（UI 术语）**区分：
- 题目一字不改，是真正的认字训练场
- UI 术语不是课标内容，简化或讲解掉，让娃能独立玩游戏

---

## A. 文案层

### A.1 术语替换表（REPLACE）

| 原词 | 改为 | 典型出现位置 |
|---|---|---|
| 租金 | **过路费** | `LandingOverlay` / `RentNotice` / `QuizModal` |
| 业主 | **房主** | 提示文案 |
| 免租 | **不交过路费** | "答题免租" → "答题不交过路费" |
| 交租 | **交过路费** | "直接交租" → "直接交过路费" |
| 破产 | **钱用光了** | `BankruptcyNotice` |
| 地产 / 买地 | **地 / 买下这块地** | `LandingOverlay` |
| 结算 | **算钱** | `SettleScreen` |
| 学习格 | **学习星** | Tile 标签 |
| 通用题库 | **挑战题** | `SubjectSelector` |
| 清算 | *不露出* | 仅内部日志使用 |

### A.2 难词小字讲解（GLOSS）

| 词 | 小字讲解 |
|---|---|
| Boss 前哨 | Boss 住在这里等你 |
| 变身能量 | 钱（用来变身） |
| 错题本 | 错的题会记在这本子里，下次再练 |
| 求助卡 | 卡住时能看提示 |

### A.3 实现

- 新建 `apps/web/src/config/terms.ts`：
  ```ts
  export const TERMS = {
    rent: '过路费',
    owner: '房主',
    rentWaiver: '不交过路费',
    payRent: '交过路费',
    bankruptcy: '钱用光了',
    property: '地',
    buyProperty: '买下这块地',
    settle: '算钱',
    studyTile: '学习星',
    brainPack: '挑战题',
  } as const;

  export const GLOSS: Record<string, string> = {
    bossOutpost: 'Boss 住在这里等你',
    transformEnergy: '钱（用来变身）',
    wrongBook: '错的题会记在这本子里，下次再练',
    helpCard: '卡住时能看提示',
  };
  ```
- 新建组件 `apps/web/src/components/TermGloss.tsx`：
  - Props：`{ term: string; children: ReactNode }`
  - 首次渲染时带 📘 小图标
  - 点击 / hover 弹出气泡显示 `GLOSS[term]`
- 全局搜替换：以下文件扫一遍 `rg "租金|业主|免租|交租|破产|地产|结算|学习格|通用题库"`，替换为 `TERMS.*`：
  - `LandingOverlay.tsx` `QuizModal.tsx` `SubjectSelector.tsx` `SettleScreen.tsx` `ChanceCardOverlay.tsx` `BossScene.tsx` `MainMenu.tsx` `GameScreen.tsx`
- CI 断言：lint 规则或 `scripts/check-legacy-terms.ts` 扫源文件中是否还有裸"租金""业主"等（避免后续漂移）。

---

## C. 德凯专属形态系统

### C.1 形态梯子（按战力升序）

| 战力 | 形态 | 颜色主调 | 能量阈值 | 局内效果 |
|---|---|---|---|---|
| 1️⃣ | **闪耀型** | 紫银 | 0 起手 | 基础德凯，无加成 |
| 2️⃣ | **奇迹型** | 蓝白 | ≥ 30 | 骰子范围 1–6 → 1–7（+1 上限） |
| 3️⃣ | **强力型** | 红金 | ≥ 60 | 答对买地 / 自地奖金 **×1.5** |
| 4️⃣ | **动力型** | 金色 | ≥ 100 | 解锁必杀按钮；Boss 伤害 **×2** |

**可升不可退**：一旦进入更高形态，即使能量再掉也不会降回（能量只做"进度条"用）。

### C.2 能量累积规则

仅在**娃**答题时累加：
- 答对任意题 **+10**
- 打赢怪兽（`monster` / `boss-attack` 命中生效） **+20**
- 答错 **-5**（下限 0）

大人答题 / 求助卡命中 / 取消答题不影响娃的能量。

### C.3 必杀技（独立能量槽）

- **动力型解锁后**才开始积 `finisherEnergy`
- 积累规则：娃答对 +20、击怪 +20、答错无变化
- 满 100 点 → `🔥 终极光线` 按钮亮起
- 只在 `phase === 'boss'` 可按
- 一次 Boss 战一次（`finisherUsedThisBoss` 标记）
- 效果：Boss 当前血量 **×0.5**（直接削半）
- 与 Boss 伤害 ×2 共生：娃答对击中的输出叠加

### C.4 武器 / 形态绑定（视觉为主）

| 形态 | 武器名 | 视觉位置 |
|---|---|---|
| 闪耀 | D 闪光棒 | DeckerHUD 右侧武器图标 |
| 奇迹 | D 光盾 | 同上 |
| 强力 | D 锤 | 同上 |
| 动力 | D 动力武装 | 同上 |

武器是**形态附带显示**，不单独维护库存（与原 `player.weaponIds` 的 Boss 战武器体系并行，不混用）。

### C.5 数据模型

**`apps/web/src/domain/decker/forms.ts`**（新）
```ts
export type DeckerForm = 'flash' | 'miracle' | 'strong' | 'dynamic';

export const FORM_THRESHOLDS: Record<DeckerForm, number> = {
  flash: 0,
  miracle: 30,
  strong: 60,
  dynamic: 100,
};

export const FORM_ORDER: DeckerForm[] = ['flash', 'miracle', 'strong', 'dynamic'];

export const formFromEnergy = (energy: number, current: DeckerForm): DeckerForm => {
  // 单调不降，只能升
  const currentIdx = FORM_ORDER.indexOf(current);
  let target = current;
  for (const f of FORM_ORDER) {
    if (energy >= FORM_THRESHOLDS[f]) target = f;
  }
  const targetIdx = FORM_ORDER.indexOf(target);
  return targetIdx > currentIdx ? target : current;
};
```

**`apps/web/src/domain/decker/energy.ts`**（新）
```ts
export type DeckerEvent =
  | { kind: 'correct' }
  | { kind: 'monster-defeat' }
  | { kind: 'wrong' };

export const applyDeckerEvent = (energy: number, ev: DeckerEvent): number => {
  const delta = ev.kind === 'correct' ? 10 : ev.kind === 'monster-defeat' ? 20 : -5;
  return Math.max(0, energy + delta);
};

export const applyFinisherEvent = (finisher: number, ev: DeckerEvent, formReached: boolean): number => {
  if (!formReached) return finisher;
  if (ev.kind === 'wrong') return finisher;
  const delta = 20;
  return Math.min(100, finisher + delta);
};
```

**`stores/gameStore.ts` 新增字段**
```ts
deckerState: {
  currentForm: DeckerForm;
  energy: number;
  finisherEnergy: number;
  finisherUsedThisBoss: boolean;
  lastTransitionAt: number | null;  // 触发升级动画用
};
```

初始：`{ currentForm: 'flash', energy: 0, finisherEnergy: 0, finisherUsedThisBoss: false, lastTransitionAt: null }`
`startGame` 完全重置。`bossAttack` 开始时重置 `finisherUsedThisBoss`（仅重置标记，不重置能量槽；能量槽一局有效）。

### C.6 接入点（修改 `submitAnswer`）

在现有 `correct / wrong` 分支里插一段（仅 `quiz.playerId === childId`）：

```ts
if (quiz.playerId === state.childId) {
  const ev: DeckerEvent = correct
    ? (quiz.context.kind === 'monster' || quiz.context.kind === 'boss-attack'
        ? { kind: 'monster-defeat' }
        : { kind: 'correct' })
    : { kind: 'wrong' };
  const nextEnergy = applyDeckerEvent(state.deckerState.energy, ev);
  const nextForm = formFromEnergy(nextEnergy, state.deckerState.currentForm);
  const dynamicReached = nextForm === 'dynamic' || state.deckerState.currentForm === 'dynamic';
  const nextFinisher = applyFinisherEvent(state.deckerState.finisherEnergy, ev, dynamicReached);
  nextDecker = {
    ...state.deckerState,
    currentForm: nextForm,
    energy: nextEnergy,
    finisherEnergy: nextFinisher,
    lastTransitionAt: nextForm !== state.deckerState.currentForm ? performance.now() : state.deckerState.lastTransitionAt,
  };
}
```

**Reward 倍率**：
- 当 `currentForm === 'strong'` 且 `context.kind === 'property-buy' | 'property-bonus'`：`money += Math.floor(base × 1.5)`
- 动力型 Boss 战：现有 `bossAttack` 的 weapon damage × 2

**必杀技新 action `fireFinisher()`**：
- 前置：`phase === 'boss' && currentForm === 'dynamic' && finisherEnergy >= 100 && !finisherUsedThisBoss`
- 效果：`boss.hp = Math.floor(boss.hp * 0.5)`；`finisherEnergy = 0`；`finisherUsedThisBoss = true`
- 不触发答题，是直接技能释放

### C.7 骰子 +1（奇迹型）

在 `rollDice` 里检查 `deckerState.currentForm`：
- `miracle` / `strong` / `dynamic`：骰子点数空间 `[1..7]`
- `flash`：默认 `[1..6]`

---

## F. 输入层

### F.1 数字键盘（新组件）

**`apps/web/src/components/input/DigitKeypad.tsx`**
- Props：`{ onSubmit: (value: string) => void; placeholder?: string }`
- 手机电话布局：
  ```
  [ 1 ][ 2 ][ 3 ]
  [ 4 ][ 5 ][ 6 ]
  [ 7 ][ 8 ][ 9 ]
  [清空][ 0 ][ ✓ ]
  ```
- 按钮：`w-[100px] h-[100px] rounded-[24px] text-4xl font-black`
- 按下缩放：`active:scale-95 transition-transform`
- 顶部显示当前输入：`text-6xl` 大字
- 支持负号？—— v1 不支持（一年级下学期不涉及负数）；若题目答案包含 `-`，回落到文字 input

### F.2 QuizModal input 分支改造

`AnswerArea` 的 `case 'input'`：
```ts
case 'input': {
  const isPureDigit = /^-?\d+$/.test(question.answer);
  return isPureDigit ? <DigitKeypad onSubmit={onSubmit} /> : <InputArea onSubmit={onSubmit} />;
}
```

### F.3 OrderingArea 改造

```tsx
<div className="grid grid-cols-2 gap-3">
  {items.map((item, idx) => {
    const sel = order.indexOf(idx);
    return (
      <button
        className="relative min-h-[72px] min-w-[88px] rounded-2xl text-2xl font-black"
      >
        {sel >= 0 && (
          <span className="absolute left-2 top-2 flex h-10 w-10 items-center justify-center rounded-full bg-amber-400 text-slate-900 text-xl font-black">
            {sel + 1}
          </span>
        )}
        <span>{item}</span>
      </button>
    );
  })}
</div>
```

---

## 6 处 UI 调整

### UI-1. DeckerStatusBar 顶栏常驻

**新组件** `apps/web/src/features/decker/DeckerStatusBar.tsx`
- 在 `GameScreen` 根 grid 之外，`fixed top-0 left-0 right-0 h-[72px] z-20`
- 主菜单 / 设置页 / settle 屏不显示
- boss 场景下移到 Boss 头像下方（避免遮挡）

### UI-2. 能量条 = 4 形态图标 + 填充

- 水平排列 4 形态头像（每个 48×48）
- 形态之间用一段进度条连接（渐变填充 amber-400）
- 当前形态金环脉动；未解锁形态 opacity-40 + 🔒
- 右侧额外显示"光之能量 XX / 100"小字

### UI-3. 形态升级 2s 动画

- 检测 `deckerState.lastTransitionAt` 变化
- 全屏 overlay：`fixed inset-0 z-50 bg-slate-950/80`
- 动画时序：
  - 0–200ms：屏幕暗下
  - 200–800ms：德凯剪影 + 旧 → 新形态交叉淡入淡出
  - 800–1400ms：中央大字 "奇迹型！" 从上砸下带 scale 回弹
  - 1400–2000ms：淡出回游戏
- 纯 CSS + `@keyframes`，无声（符合 "不做 C1 声光" 的决策）
- 用 `useEffect` + setTimeout(2000) 触发，结束后 `clearTransitionMark`

### UI-4. 必杀按钮脉动

- Boss 场景 `FinisherButton` 组件
- disabled 时 opacity-40
- enabled 且未释放时：
  - `animate-pulse` + 自定义 `scale: 1 ↔ 1.08` @ 600ms 循环
  - 红橙渐变背景
- Boss 头顶画一个 ↓ 箭头指向按钮（SVG 浮动），只在按钮 enabled 时显示

### UI-5. 数字键盘 100×100

见 F.1，已写入规格。

### UI-6. 排序题圆形角标

见 F.3，已写入规格。

---

## 测试策略

| 模块 | 测试 |
|---|---|
| `domain/decker/energy.ts` | 纯函数：加减边界（0 下限）、三种事件 delta |
| `domain/decker/forms.ts` | `formFromEnergy` 单调升不降、各阈值边界 |
| `stores/gameStore.test.ts` 新增 | 娃答对 → energy +10；答错 → -5 下限 0；怪兽击破 +20；非娃答题不变；强力型下买地奖励 ×1.5；动力型下 bossAttack × 2；fireFinisher 只在 boss + dynamic + energy 100 下可用 |
| `config/terms.ts` | 覆盖度断言：所有 key 非空 |
| `TermGloss.tsx` | 点击展开 / 收起 |
| `DigitKeypad.tsx` | 按键序列组成字符串；清空；确认回调 |
| `DeckerStatusBar.tsx` | 依赖 store 渲染；4 种形态视觉 snapshot |
| `OrderingArea` | 角标显示 / 取消 |
| E2E `deckerProgression.spec.ts` | 娃开局 → 连对 3 题（+30 energy）→ 奇迹型激活 → 骰子可达 7 |

---

## 文件清单

| 文件 | 操作 |
|---|---|
| `apps/web/src/config/terms.ts` | 新增 REPLACE + GLOSS |
| `apps/web/src/components/TermGloss.tsx` | 新增组件 |
| `apps/web/src/components/input/DigitKeypad.tsx` | 新增组件 |
| `apps/web/src/domain/decker/forms.ts` | 新增 |
| `apps/web/src/domain/decker/energy.ts` | 新增 |
| `apps/web/src/domain/decker/__tests__/*.test.ts` | 新增单测 |
| `apps/web/src/features/decker/DeckerStatusBar.tsx` | 新增组件 |
| `apps/web/src/features/decker/FormTransitionOverlay.tsx` | 新增 2s 动画 |
| `apps/web/src/features/decker/FinisherButton.tsx` | 新增按钮 |
| `apps/web/src/stores/gameStore.ts` | +deckerState + applyDeckerEvent 接入 + fireFinisher + 奖励倍率 + 骰子 +1 |
| `apps/web/src/features/quiz/QuizModal.tsx` | input 分支判断 → DigitKeypad；OrderingArea 改网格 + 角标 |
| `apps/web/src/features/game/GameScreen.tsx` | 接 DeckerStatusBar |
| `apps/web/src/features/board/LandingOverlay.tsx` | 文案走 TERMS |
| `apps/web/src/features/quiz/SubjectSelector.tsx` | 文案走 TERMS |
| `apps/web/src/features/settle/SettleScreen.tsx` | 文案走 TERMS |
| `apps/web/src/features/boss/BossScene.tsx` | 接 FinisherButton + Boss 头顶箭头 |
| `apps/web/src/features/board/Dice.tsx` | `roll` 上限受 form 控制 |
| `scripts/check-legacy-terms.ts` | 新增 CI 检查脚本 |
| `apps/web/tests/e2e/deckerProgression.spec.ts` | 新增 E2E |

---

## 风险 & 缓解

| 风险 | 严重度 | 缓解 |
|---|---|---|
| 文案替换漏改，娃还是看到"租金" | MEDIUM | `scripts/check-legacy-terms.ts` 在 CI 扫源码 |
| 动力型 + Boss ×2 + 必杀 ×0.5 三连击秒 Boss | MEDIUM | Boss 初始血量验算：Boss HP 设计目标至少需 5-6 次高倍攻击才能击败，确保娃需要多轮答题 |
| 2s 形态升级动画打断 pendingQuiz 流程 | LOW | 动画只在 submitAnswer 后的 nextTick 触发；有 pendingQuiz 时不显示 |
| 娃永远是德凯，其他奥特曼被冷落 | LOW | v1 不扩展其他奥特曼；后续迭代再说 |
| 数字键盘答案格式歧义（负号 / 小数） | LOW | `/^-?\d+$/` 只处理纯整数；非纯整数回落到 text input |
| `FORM_THRESHOLDS` 选择不当，娃一局到不了动力型 | MEDIUM | v1 阈值 30/60/100 = 答对约 3/6/10 题；单局设计时长 20 min 内可达 |
| Boss 战中形态升级叠加动画挡视线 | LOW | Boss 场景下形态动画改为半屏、300ms 快闪（`phase === 'boss'` 特例） |
| 娃连续答错能量掉到 0 感觉挫败 | LOW | 但不会降形态，形态锁定；能量只影响"下一次升级还差多远" |

---

## 实施顺序（分 4 批）

1. **Batch 1 — A 文案（低风险，立即见效）**：`terms.ts` + `TermGloss.tsx` + 全项目替换 + CI 脚本
2. **Batch 2 — F 输入（独立，无耦合）**：`DigitKeypad.tsx` + `OrderingArea` 改造 + QuizModal 接入
3. **Batch 3 — C 核心（最重）**：`domain/decker/*` + `gameStore` 接入 + `DeckerStatusBar` + `FinisherButton` + 倍率逻辑
4. **Batch 4 — C 视觉细节**：`FormTransitionOverlay` + Boss 头顶箭头 + 脉动动画 + 排序角标

每批独立可发布，如时间紧可停在 Batch 2/3。

---

## 未决问题（需 writing-plans 阶段确认或动手时确认）

- 德凯其他形态（假面 / Dark 等）是否需要补进梯子？**当前答案**：v1 不补，4 形态满足
- 必杀技释放动画：预留 hook，后续接入
- `DeckerStatusBar` 在小屏（<480px）的布局降级？**当前答案**：压缩图标到 36×36，不显示光之能量数字

---

# 🎨 视觉设计方向（frontend-design 补充）

## Mood：奥特曼特摄 HUD × 童趣高饱和

**一句话审美**：每个 UI 元素都像奥特曼胸前那块**彩色计时器** —— 厚边框、内部光源、外部光晕、质感按钮。

**决定性细节**（拿一张截图就能判断是否做到）：
1. 每个可操作元素都有**内部高光 + 外部光晕**（两层阴影）
2. 所有重要文字带**漫画式黑描边**（-webkit-text-stroke）—— 即使娃识字不稳也能看清字形
3. 所有背景都有**星空 + 网格 + 光斑**层，**绝无纯 flat**
4. 颜色对比度 ≥ 4.5:1，**高饱和不走灰度**
5. 重要按钮按下有 **Y 轴 3px 位移 + 阴影消失**（实体感）

**禁忌**：
- 不用 `slate-900 / slate-950` 做大面积底色（改用 `ug-void / ug-deep` 带紫调的黑）
- 不用 `amber-400` 孤立做唯一亮色（改用"德凯色族 + 霓虹 cyan/magenta"三色系）
- 不用 1px border（至少 3px，变身主类至少 5px）
- 不用 `text-sm text-slate-400` 的成人说明小字（字号至少 16px，颜色 `text-white/90` + 描边）

---

## Design Tokens（加到 `tailwind.config.ts` `extend`）

```ts
colors: {
  // 宇宙背景
  'ug-void':    '#06081a',
  'ug-deep':    '#0d1240',
  'ug-nebula':  '#2a1a6e',
  // 德凯形态色族
  'decker-flash':   { 400: '#b794f4', 500: '#805ad5' },
  'decker-miracle': { 400: '#60a5fa', 500: '#2563eb' },
  'decker-strong':  { 400: '#ef4444', 500: '#b91c1c' },
  'decker-dynamic': { 400: '#fbbf24', 500: '#d97706' },
  // HUD 霓虹
  'hud-cyan':    '#00e5ff',
  'hud-magenta': '#ff1493',
  'hud-yellow':  '#ffd600',
},
fontFamily: {
  hero:    ['"ZCOOL KuaiLe"', '"Yuanti SC"', 'sans-serif'],  // 变身字幕
  digital: ['"Orbitron"', 'monospace'],                      // 数字 HUD
},
boxShadow: {
  'glow-sm': '0 0 8px var(--glow, #00e5ff)',
  'glow-md': '0 0 16px var(--glow, #00e5ff), 0 0 32px var(--glow, #00e5ff)',
  'glow-lg': '0 0 24px var(--glow, #00e5ff), 0 0 48px var(--glow, #00e5ff)',
  'panel':   '0 8px 0 rgba(0,0,0,.5), inset 0 2px 0 rgba(255,255,255,.25)',
  'button':  '0 6px 0 rgba(0,0,0,.45), inset 0 3px 0 rgba(255,255,255,.35)',
},
keyframes: {
  'pulse-glow': {
    '0%, 100%': { boxShadow: '0 0 12px var(--glow), 0 0 24px var(--glow)' },
    '50%':      { boxShadow: '0 0 24px var(--glow), 0 0 48px var(--glow)' },
  },
  'scanline': {
    '0%':   { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
  'hero-smash': {
    '0%':   { transform: 'translateY(-120%) scale(.6)', opacity: '0' },
    '60%':  { transform: 'translateY(0) scale(1.15)',    opacity: '1' },
    '75%':  { transform: 'translateY(0) scale(.95)' },
    '100%': { transform: 'translateY(0) scale(1)',       opacity: '1' },
  },
  'twinkle': {
    '0%, 100%': { opacity: '.4' }, '50%': { opacity: '1' },
  },
},
animation: {
  'pulse-glow': 'pulse-glow 1.2s ease-in-out infinite',
  'scanline':   'scanline 1.5s linear infinite',
  'hero-smash': 'hero-smash .6s cubic-bezier(.34,1.56,.64,1) forwards',
  'twinkle':    'twinkle 3s ease-in-out infinite',
},
```

## 全局 utility classes（加到 `src/index.css`）

```css
@layer utilities {
  .text-stroke-black    { -webkit-text-stroke: 2px #0a0a1a; paint-order: stroke fill; }
  .text-stroke-black-lg { -webkit-text-stroke: 4px #0a0a1a; paint-order: stroke fill; }

  .cosmic-bg {
    background:
      radial-gradient(ellipse at top, #2a1a6e 0%, transparent 50%),
      radial-gradient(ellipse at bottom right, #0d1240 0%, transparent 60%),
      #06081a;
    position: relative;
  }
  .cosmic-bg::after {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background-image:
      radial-gradient(1px 1px at 20% 30%, white, transparent),
      radial-gradient(1px 1px at 70% 60%, white, transparent),
      radial-gradient(1px 1px at 45% 85%, white, transparent),
      radial-gradient(2px 2px at 85% 15%, white, transparent);
    background-size: 200px 200px;
    opacity: .6; animation: twinkle 3s ease-in-out infinite;
  }

  .hud-frame {
    position: relative;
    background: linear-gradient(135deg, rgba(13,18,64,.92), rgba(42,26,110,.78));
    border: 3px solid rgba(255,255,255,.9);
    border-radius: 1.5rem;
    box-shadow:
      0 0 0 6px rgba(0,229,255,.28),
      0 12px 0 rgba(0,0,0,.55),
      inset 0 2px 0 rgba(255,255,255,.3);
  }
  .hud-frame::before {
    content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background-image:
      linear-gradient(rgba(0,229,255,.06) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0,229,255,.06) 1px, transparent 1px);
    background-size: 24px 24px;
  }
}
```

---

## 各组件视觉升级

### 1️⃣ DeckerStatusBar（顶栏 HUD）

**Before**：72px slate 条 + 小字数字
**After**：88px 紫调 HUD + 娃头像圆徽章 + 4 形态阶梯 + 流动能量条

```tsx
<div className="
  fixed top-0 inset-x-0 z-20 h-[88px] px-4
  bg-gradient-to-b from-ug-deep via-ug-nebula to-ug-deep
  border-b-4 border-hud-cyan/60
  shadow-[0_6px_24px_rgba(0,229,255,.4)]
  flex items-center gap-4
">
  {/* 娃头像圆徽章 */}
  <div className="relative shrink-0">
    <div className="h-16 w-16 rounded-full ring-[4px] ring-hud-cyan bg-ug-void overflow-hidden shadow-glow-md"
         style={{ '--glow': 'rgba(0,229,255,.7)' } as CSSProperties}>
      <img src="/assets/heroes/decker.png" className="h-full w-full object-cover" />
    </div>
    <span className="absolute -bottom-1 -right-1 px-2 h-6 rounded-full
      bg-decker-dynamic-400 border-2 border-white
      font-hero text-[11px] text-black flex items-center">Lv{formIdx + 1}</span>
  </div>

  {/* 4 形态阶梯 */}
  <div className="flex-1 flex items-center gap-1.5">
    {FORMS.map((f, i) => (
      <Fragment key={f}>
        <FormChip form={f} current={currentForm} />
        {i < 3 && <EnergyBar fill={fillRatio(f, energy)} />}
      </Fragment>
    ))}
  </div>

  {/* 必杀条 (仅动力型) */}
  {currentForm === 'dynamic' && (
    <div className="shrink-0 w-[140px] h-10 rounded-full bg-ug-void border-[3px] border-hud-yellow
      shadow-glow-md overflow-hidden relative"
      style={{ '--glow': 'rgba(255,214,0,.7)' } as CSSProperties}>
      <div className="h-full bg-gradient-to-r from-hud-yellow via-orange-400 to-rose-500"
           style={{ width: `${finisherEnergy}%` }} />
      <span className="absolute inset-0 flex items-center justify-center
        font-hero text-sm text-white text-stroke-black">🔥 {finisherEnergy}/100</span>
    </div>
  )}
</div>
```

**FormChip**（单个形态图标）：
```tsx
<div className={`
  relative h-14 w-14 rounded-2xl shrink-0
  flex items-center justify-center
  border-[3px] border-white
  shadow-panel
  ${isActive ? 'animate-pulse-glow' : ''}
  ${isLocked ? 'opacity-40 grayscale' : ''}
`} style={{
  background: isActive
    ? `linear-gradient(135deg, var(--decker-${form}-400), var(--decker-${form}-500))`
    : 'rgba(6,8,26,.7)',
  '--glow': isActive ? `var(--decker-${form}-glow)` : 'transparent',
} as CSSProperties}>
  <img src={`/assets/decker/${form}.png`} className="h-10 w-10" />
  {isLocked && <span className="absolute text-2xl">🔒</span>}
</div>
```

**EnergyBar**（两形态之间的流动条）：
```tsx
<div className="flex-1 h-3 rounded-full bg-ug-void/90 border-[2px] border-white/70 overflow-hidden">
  <div className="h-full bg-gradient-to-r from-hud-cyan via-hud-magenta to-hud-yellow relative"
       style={{ width: `${fill * 100}%` }}>
    <div className="absolute inset-0 animate-scanline
      bg-gradient-to-r from-transparent via-white/70 to-transparent" />
  </div>
</div>
```

---

### 2️⃣ FormTransitionOverlay（2s 变身动画）

**Before**：黑屏 + 文字
**After**：射线爆炸背景 + 剪影交叉 + 大字砸屏

```tsx
<div className="fixed inset-0 z-50 cosmic-bg/95 backdrop-blur-md overflow-hidden
  flex items-center justify-center">

  {/* 射线爆炸 */}
  <div className="absolute inset-0 opacity-70"
    style={{
      background: 'conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,.8) 2deg, transparent 5deg, transparent 28deg, rgba(255,214,0,.7) 30deg, transparent 33deg, transparent 58deg, rgba(0,229,255,.6) 60deg, transparent 63deg)',
      animation: 'spin 2s linear infinite',
    }}/>

  {/* 德凯剪影 (居中脉动) */}
  <img src="/assets/decker/silhouette.png"
       className="absolute h-[55vh] opacity-90 animate-pulse-glow"
       style={{ '--glow': 'rgba(251,191,36,.8)' } as CSSProperties} />

  {/* 大字 */}
  <h1 className="relative z-10 font-hero leading-none
    text-[140px] text-transparent
    bg-clip-text bg-gradient-to-b from-white via-hud-yellow to-decker-dynamic-500
    text-stroke-black-lg
    animate-hero-smash
    drop-shadow-[0_10px_0_rgba(0,0,0,.8)]">
    奇迹型！
  </h1>

  {/* 副标 */}
  <p className="absolute bottom-24 font-hero text-3xl text-white text-stroke-black-lg">
    ✨ 骰子 +1 激活！
  </p>
</div>
```

---

### 3️⃣ FinisherButton（必杀按钮）

**Before**：矩形按钮，变亮即可
**After**：圆形能量核心，满能量时外加"⬆点我"箭头浮动

```tsx
<button disabled={!ready} className={`
  relative h-[132px] w-[132px] rounded-full
  border-[5px] border-white shadow-button
  font-hero text-2xl text-white text-stroke-black-lg
  active:translate-y-[4px] active:shadow-none transition-transform
  ${ready
    ? 'bg-[radial-gradient(circle_at_30%_30%,#ffd600,#d97706_60%,#7c2d12)] animate-pulse-glow'
    : 'bg-ug-void/70 grayscale opacity-50'}
`} style={{ '--glow': 'rgba(251,191,36,.9)' } as CSSProperties}>
  <span className="absolute -top-8 left-1/2 -translate-x-1/2 text-5xl drop-shadow-[0_4px_0_rgba(0,0,0,.6)]">🔥</span>
  <span className="leading-tight">终极<br/>光线</span>
  {ready && (
    <span className="absolute -bottom-12 left-1/2 -translate-x-1/2
      font-hero text-xl text-hud-yellow text-stroke-black animate-bounce whitespace-nowrap">
      ⬆ 点我放！
    </span>
  )}
</button>
```

---

### 4️⃣ DigitKeypad（数字键盘）

**Before**：基础 3×4 按钮
**After**：HUD 输入条 + 质感键帽 + 确认键金色脉动

```tsx
<div className="cosmic-bg rounded-3xl p-6 shadow-panel">
  {/* 数字 HUD 输入条 */}
  <div className="mb-5 h-[88px] rounded-2xl px-6
    bg-gradient-to-b from-ug-void to-ug-deep
    border-[3px] border-hud-cyan/80
    shadow-[inset_0_4px_16px_rgba(0,0,0,.6)]
    flex items-center justify-end
    font-digital text-6xl text-hud-cyan text-stroke-black">
    {value || <span className="opacity-30">0</span>}
    <span className="ml-1 animate-pulse text-hud-cyan">▌</span>
  </div>

  {/* 键盘 */}
  <div className="grid grid-cols-3 gap-4">
    {[1,2,3,4,5,6,7,8,9].map(n => <DigitKey key={n} digit={n} />)}
    <ActionKey kind="clear"   label="✗" colorFrom="rose-400"    colorTo="rose-700" />
    <DigitKey digit={0} />
    <ActionKey kind="confirm" label="✓" colorFrom="emerald-400" colorTo="emerald-700" pulse />
  </div>
</div>
```

**DigitKey**：
```tsx
<button className="
  h-[100px] w-[100px] rounded-[24px]
  font-hero text-5xl text-white text-stroke-black-lg
  border-[4px] border-white/90 shadow-button
  bg-gradient-to-br from-hud-cyan/90 to-blue-700
  active:translate-y-[4px] active:shadow-none transition-transform
">{digit}</button>
```

**ActionKey**（清空 / 确认）：
```tsx
<button className={`
  h-[100px] w-[100px] rounded-[24px]
  font-hero text-5xl text-white text-stroke-black-lg
  border-[4px] border-white/90 shadow-button
  bg-gradient-to-br from-${colorFrom} to-${colorTo}
  active:translate-y-[4px] active:shadow-none transition-transform
  ${pulse ? 'animate-pulse-glow' : ''}
`} style={{ '--glow': pulse ? 'rgba(16,185,129,.75)' : undefined } as CSSProperties}>
  {label}
</button>
```

---

### 5️⃣ SubjectSelector（学科卡）

**Before**：色卡 + opacity-30 禁用
**After**：TCG 卡牌感 + 大纹章 + 禁用变"封印状态"

```tsx
<button disabled={disabled} className={`
  relative h-[200px] rounded-3xl overflow-hidden
  border-[4px] border-white shadow-panel
  transition-transform
  ${!disabled && 'hover:scale-105 hover:-rotate-1 active:scale-95'}
  ${disabled && 'saturate-50'}
`} style={{
  background: `linear-gradient(180deg, var(--${color}-300) 0%, var(--${color}-600) 100%)`,
}}>
  {/* 纹章背景 */}
  <div className="absolute inset-0 flex items-center justify-center
    text-[200px] opacity-15 blur-[1px]">{icon}</div>

  {/* 扫光斜条 */}
  <div className="absolute -inset-x-10 top-1/3 h-8 bg-white/20 rotate-[-15deg] blur-sm" />

  {/* 内容 */}
  <div className="relative flex h-full flex-col items-center justify-center gap-2">
    <span className="text-7xl drop-shadow-[0_6px_0_rgba(0,0,0,.45)]">{icon}</span>
    <span className="font-hero text-4xl text-white text-stroke-black-lg">{label}</span>
    <span className="font-digital text-base text-white/95 tracking-widest">剩 {count} 题</span>
  </div>

  {/* 禁用封印层 */}
  {disabled && (
    <div className="absolute inset-0 flex items-center justify-center bg-ug-void/85 backdrop-blur-[1px]">
      <span className="font-hero text-2xl text-hud-yellow text-stroke-black-lg rotate-[-8deg]
        border-[3px] border-hud-yellow px-4 py-1 rounded-lg">
        {disabledReason /* 例："上题选过" / "大人专属" */}
      </span>
    </div>
  )}

  {/* 核心学科角标 */}
  {isCoreSubject && (
    <span className="absolute top-2 left-2 px-2 py-1
      bg-black/70 border-2 border-hud-yellow rounded
      font-digital text-xs text-hud-yellow tracking-widest">★ 核心</span>
  )}
</button>
```

---

### 6️⃣ LandingOverlay（格子事件弹窗）

**Before**：slate 居中卡片
**After**：HUD 通讯频道弹出 + 闪烁红点 + 大尺寸双按钮纵排

```tsx
<div className="fixed inset-0 z-30 cosmic-bg/85 backdrop-blur-sm flex items-center justify-center p-4">
  <div className="hud-frame w-full max-w-lg p-7">
    {/* 状态条 */}
    <header className="flex items-center gap-3 pb-3 border-b-2 border-hud-cyan/40">
      <span className="h-3 w-3 rounded-full bg-hud-magenta animate-ping" />
      <span className="font-digital text-xs text-hud-cyan tracking-[0.3em]">INCOMING EVENT</span>
      <span className="ml-auto font-digital text-xs text-white/60">#047</span>
    </header>

    {/* 标题 */}
    <h2 className="mt-4 font-hero text-5xl text-hud-yellow text-stroke-black-lg">
      💸 交过路费！
    </h2>

    {/* 金额 */}
    <p className="mt-5 font-hero text-3xl text-white text-stroke-black">
      过路费 <span className="text-rose-400 text-5xl">¥140</span>
    </p>

    {/* 双按钮 */}
    <div className="mt-7 space-y-3">
      <BigActionButton variant="good"    icon="📝" title="答题不交过路费" subtitle="答对就免费通过" />
      <BigActionButton variant="neutral" icon="💸" title="直接交过路费"   subtitle="¥140 给房主" />
    </div>
  </div>
</div>
```

**BigActionButton**（通用大按钮，也可给 LandingOverlay 买地 / 自地 / 跳过共用）：
```tsx
<button className={`
  w-full rounded-2xl px-5 py-4 flex items-center gap-4
  border-[3px] border-white shadow-button
  active:translate-y-[4px] active:shadow-none transition-transform
  ${variant === 'good'    ? 'bg-gradient-to-br from-emerald-400 to-emerald-700' :
    variant === 'danger'  ? 'bg-gradient-to-br from-rose-400 to-rose-700' :
                            'bg-gradient-to-br from-slate-500 to-slate-800'}
`}>
  <span className="text-4xl drop-shadow-[0_4px_0_rgba(0,0,0,.4)]">{icon}</span>
  <span className="flex-1 text-left">
    <span className="block font-hero text-2xl text-white text-stroke-black">{title}</span>
    <span className="block font-sans text-sm text-white/90">{subtitle}</span>
  </span>
  <span className="text-white text-3xl">➜</span>
</button>
```

---

### 7️⃣ OrderingArea（排序题）

**Before**：行内小按钮 `1.hello` 挤成一团
**After**：2 列大卡 + 左上角圆形大序号 + 选中金色脉动

```tsx
<div className="cosmic-bg rounded-3xl p-5 shadow-panel">
  <p className="mb-4 font-hero text-xl text-hud-cyan text-stroke-black
    tracking-widest">⚡ 按顺序点击</p>

  <div className="grid grid-cols-2 gap-3">
    {items.map((item, idx) => {
      const order = selected.indexOf(idx);
      const picked = order >= 0;
      return (
        <button key={idx} className={`
          relative min-h-[88px] rounded-2xl px-4 py-4
          border-[3px] border-white shadow-button
          active:translate-y-[4px] active:shadow-none transition-transform
          ${picked
            ? 'bg-gradient-to-br from-hud-yellow to-amber-600 animate-pulse-glow'
            : 'bg-gradient-to-br from-ug-deep to-ug-nebula'}
        `} style={{ '--glow': picked ? 'rgba(255,214,0,.7)' : undefined } as CSSProperties}>

          {picked && (
            <span className="absolute -left-3 -top-3
              h-11 w-11 rounded-full
              bg-gradient-to-br from-rose-400 to-rose-700
              border-[3px] border-white shadow-glow-md
              flex items-center justify-center
              font-hero text-2xl text-white text-stroke-black-lg">
              {order + 1}
            </span>
          )}

          <span className="font-hero text-2xl text-white text-stroke-black-lg">
            {item}
          </span>
        </button>
      );
    })}
  </div>
</div>
```

---

## 资产需求（新增素材清单）

| 资产 | 规格 | 用途 |
|---|---|---|
| `/assets/decker/flash.png` | 200×200 透明 PNG | 形态图标 |
| `/assets/decker/miracle.png` | 200×200 | 形态图标 |
| `/assets/decker/strong.png` | 200×200 | 形态图标 |
| `/assets/decker/dynamic.png` | 200×200 | 形态图标 |
| `/assets/decker/silhouette.png` | 600×800 透明 PNG | 变身动画剪影 |
| 字体 `ZCOOL KuaiLe` | Google Fonts 免费 | 标题 |
| 字体 `Orbitron` | Google Fonts 免费 | 数字 HUD |

**资产缺位兜底**：实现期间若素材未到，用 emoji / 纯 CSS circle 图形占位；不阻塞前端开发。

---

## 视觉一致性检查清单（Batch 4 交付前 QA）

- [ ] 全部可点击元素按下有位移 + 阴影消失
- [ ] 全部重要文字带黑描边（≥2px）
- [ ] 全部按钮边框 ≥ 3px
- [ ] 全部背景非纯黑 / 纯白，至少一层渐变或星空
- [ ] 配色只使用 token 里定义的色，不写 raw hex 或 slate-*
- [ ] 小屏 375×667 下 DeckerStatusBar 不换行、不遮挡棋盘
- [ ] 截一张对比图放 `docs/superpowers/specs/` 目录下供 review

---

## Commit 建议

视觉方向与功能逻辑一起作为同一份 spec 提交更自然。前端实施时分 Batch 4 再细化动画细节。
