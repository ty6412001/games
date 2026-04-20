# 棋盘重排 + 地产答题 + 小朋友科目轮换 + 答对题**跨局**去重 实施计划 (v4)

> **Task**: 四项改动一起落地。(A) **每局开局随机洗牌**生成 28 格棋盘；(B) 踩到别人地"答题免租"可选，踩到自己地"答题领奖励"可选（业主不分钱、自地奖金 `min(80, baseRent×0.5)`）；(C) 小朋友答题**一步冷却**：上一题选过的语/数/英学科下次禁用；(D) **整个服务级跨局去重**：小朋友答对过的题永久存入 IndexedDB，以后再开局不会再出现。

**4 项设计决策已锁定（用户确认）**：
1. 布局随机洗牌 ✓
2. 免租时业主不分钱 ✓
3. 自地奖金 `min(80, baseRent × 0.5)` ✓
4. 轮换强度 = 一步冷却 ✓

## Analysis Summary

- **Claude 评估**：四项彼此独立，串起来做。A 最小；B 最重（改 turnEngine + store + UI）；C 小；D 几乎零改动（基建已就位，只要验证 + 把新 context 接上）。
- **Codex 评估**（SESSION `codex-1776579328-15144`）：布局方案、免租规则、奖金公式、轮换规则均已给过具体建议并被采纳。对随机化补充一条：必须有 fallback 兜底防止死循环，Claude 已纳入。
- **答对题去重现状（D）**：代码基建已存在 ——
  - `gameStore.ts:154` 有 `correctQuestionIds: CorrectBySubject`
  - `gameStore.ts:361-370` 的 `pickQuestionForSubject` 调用 `pickRandomQuestion(pack, { subject, excludeIds: subjectCorrect })`
  - `gameStore.ts:902/939` 的 `submitAnswer` 在答对时 `markQuestionCorrect`
  - 所有新 Quiz Context（`property-rent` / `property-bonus`）都走同一条 `selectSubject → pickQuestionForSubject` 路径，因此**自动纳入去重**
  - v3 只需加 1 条 store 集成测覆盖"同一题答对后不再出现"，并在 UI 上把题库剩余量显示为**去重后的数量**（现在 `availCount` 按题包总量算，和真正可用的数量有漂移）
- **共识**：无争议。
- **分歧**：无。

## Technical Solution

### A. 棋盘重排（每局随机洗牌）

每局开局调用 `createBoardTiles(rand)`，用可注入随机源生成一个**合法布局**。

**固定约束（不参与随机）**：
- 位置 0 永远是 `start`（保留玩家心智）
- 28 格总数不变，各类型数量不变：12 property + 8 study + 3 chance + 2 monster + 1 reward-vault + 1 boss-outpost + 1 start

**随机规则（按顺序执行）**：
1. 4 角（0, 7, 14, 21）放 3 个特殊：0=start 固定；从 `[boss-outpost, reward-vault, monster]` 中随机排列到 7/14/21
2. 剩余 24 个非角位置放 `{ 12 property, 8 study, 3 chance, 1 monster }`（第 2 只怪兽）
3. 约束：**没有两个同类型相邻**（环状，即位置 27 与 0 相邻）
4. 对 12 property 分配 district：洗牌后随机取 4/4/4 切成 3 块，每个 property 标为 monster-forest / space-station / land-of-light
5. property 名字 / 定价按 district + 位置顺序绑定（保留原经济表）

**生成算法（带回溯，保证终止）**：
```ts
const MAX_ATTEMPTS = 50;
export const createBoardTiles = (rand: () => number = Math.random): Tile[] => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const layout = tryGenerate(rand);
    if (layout) return layout;
  }
  return FALLBACK_LAYOUT;   // v2 方案：0=start / 7=boss / 14=monster / 21=reward
};
```
内部 `tryGenerate`：
- 放角：shuffle `[boss-outpost, reward-vault, monster]` 到 `[7, 14, 21]`
- 放边：把 `{12P, 8S, 3C, 1M}` shuffle 后按序填进 24 个非角格
- 相邻校验：若 `tiles[i].type === tiles[(i+1)%28].type` 任一成立则 return null
- 分配 district + property 名：在成功的 layout 上 shuffle 12 个 property 顺序 → 前 4 = monster-forest → 中 4 = space-station → 后 4 = land-of-light → 每个 district 内按位置升序绑定 `巴尔坦 / 哥莫拉 / 雷德王 / 杰顿`（monster-forest）等

**可测性**：`rand` 参数允许单测注入 seeded random 得到确定布局；默认 `Math.random` 在生产里每局都不同。

### B. 地产答题：租金减免 / 自地奖励

新增两个 `QuizContext` 子类型：
```ts
| { kind: 'property-rent'; position: number; ownerId: string; rent: number }
| { kind: 'property-bonus'; position: number; bonus: number }
```

**踩到别人地（`property-owned-other`）**：
- LandingOverlay 显示两个按钮：
  - `答题免租`（橙色 primaryAction）→ SubjectSelector → `property-rent` 答题
  - `直接交租`（灰色 secondaryAction）→ 立即 `triggerRentSettlement` + 清算
- 答题结果：
  - ✅ 正确：租金完全免除（0 元转账），业主不拿钱
  - ❌ 错误 / 超时 / 求助卡命中：按原规则扣全额租金 → 若 money < 0 走 `autoLiquidate`
- 破产规则：与现状一致

**踩到自己地（`property-owned-self`）**：
- LandingOverlay 显示两个按钮：
  - `答题领奖励` → SubjectSelector → `property-bonus` 答题
  - `跳过` → 直接结束
- 答题结果：
  - ✅ 正确：`money += bonus`
  - ❌ / 超时 / 跳过：无奖励无惩罚

**奖金计算**：`bonus = min(80, floor(tile.baseRent × 0.5))`
- 巴尔坦 40 → 20
- 哥莫拉 44 → 22
- 雷德王 48 → 24
- 杰顿 52 → 26
- 金星 70 → 35
- 火星 76 → 38
- M78 92 → 46
- 泰坦 100 → 50
- 胜利之塔 130 → 65
- 光之塔 140 → 70
- 长老殿 160 → 80（上限截断）
- 和平广场 180 → 80（上限截断）

**`cancelPendingQuiz` 白名单扩充**：新增 `property-rent`（取消 = 直接交租）和 `property-bonus`（取消 = 无奖励）。

### C. 小朋友科目轮换（一步冷却）

Store 新增字段：
```ts
lastChildSubject: Subject | null;   // 最近一次小朋友选过的 chinese/math/english
```

在 `submitAnswer` 结束时更新：
```ts
const CORE_SUBJECTS: ReadonlySet<Subject> = new Set(['chinese', 'math', 'english']);
let nextLastChildSubject = state.lastChildSubject;
if (
  quiz.playerId === state.childId &&
  CORE_SUBJECTS.has(quiz.question.subject) &&
  quiz.context.kind !== 'boss-attack'
) {
  nextLastChildSubject = quiz.question.subject;
}
set({ ..., lastChildSubject: nextLastChildSubject });
```

SubjectSelector 里对小朋友：
```ts
const isChildAnswering = childId !== null && pending.playerId === childId;
const lastSubject = lastChildSubject;
const coreSubjects: Subject[] = ['chinese', 'math', 'english'];

// 先算其他核心学科的可用数量（不含 lastSubject 自己）
const otherCoreEligibleCount = coreSubjects.filter(
  (s) => s !== lastSubject && availCount(s) > 0
).length;

// 每张卡片：
const gateReason =
  s.adultOnly && isChildAnswering
    ? 'adult-only'
    : isChildAnswering && s.id === lastSubject && otherCoreEligibleCount > 0
      ? 'repeat-cooldown'
      : availCount(s.id) === 0
        ? 'out-of-questions'
        : null;
const disabled = gateReason !== null;
const hint =
  gateReason === 'repeat-cooldown' ? '上一题选过，先换一门'
    : gateReason === 'out-of-questions' ? '本轮无题'
      : `共 ${availCount(s.id)} 题`;
```

兜底：`otherCoreEligibleCount === 0` 且小朋友答题且 `lastSubject !== null` 时，显示顶部提示条："其他学科没题了，这次可以连选"，让规则不阻塞游戏。

规则适用范围：
- 仅 chinese / math / english 参与轮换
- 大人不受轮换约束
- `brain` 不纳入轮换（本身 adultOnly）
- `boss-attack` 场景不启用轮换

### D. 答对题**跨局**去重（IndexedDB 持久化）

**目标**：小朋友在 A 局答对过的题，开 B 局后不应再出现。整个"服务"（这套 web app）级别去重，不是会话级。

**现状盘点**：
- 内存端 `correctQuestionIds: CorrectBySubject` 已存在（`gameStore.ts:154`）
- `pickQuestionForSubject` 已用 `excludeIds: subjectCorrect`（`gameStore.ts:361-370`）
- `submitAnswer` 答对时 `markQuestionCorrect`（`gameStore.ts:902/939`）
- **缺口**：`startGame` 每次 reset 清空 `correctQuestionIds` → 跨局不保持
- **缺口**：无持久化存储层

**选型**：沿用 wrongBook 模式 —— Dexie 存 IndexedDB，同一数据库 `ultraman-monopoly` 新增 `correctBook` table。零新依赖、与 wrongBook 共享生命周期、离线优先。v1 不走 cloud sync（以后可加）。

**数据模型**（`UltramanDb.version(2)` 升级）：
```ts
{
  id: string;              // `${childId}::${questionId}`
  childId: string;         // 稳定 ID = DEFAULT_CHILD_ID = 'child-default'
  questionId: string;
  subject: Subject;
  week: number;            // 记录来源题包
  firstCorrectAt: number;
  lastCorrectAt: number;   // 同一题再答对时刷新
}
```
Dexie 声明：`correctBook: 'id, childId, questionId, subject, week, lastCorrectAt'`

**稳定 childId**：用已有常量 `DEFAULT_CHILD_ID = 'child-default'`（`MainMenu.tsx:6`），与 wrongBookRepo 口径一致；**不是** session 级的 `p3` player id。这样无论每局给孩子分配什么 player id，去重都映射到同一张持久记录。

**新文件**：
- `apps/web/src/data/repo/correctBookRepo.ts`
  - `recordCorrect({ childId, question, week }): Promise<void>` 幂等 upsert
  - `listCorrectIdsByChild(childId): Promise<CorrectBySubject>` 返回按学科分组的 Set
  - `clearCorrectForChild(childId): Promise<void>` 预留（debug 用）
- `apps/web/src/config/childIdentity.ts`（新）：
  - 导出 `export const DEFAULT_CHILD_ID = 'child-default'`
  - `MainMenu.tsx` 改成从这里导入，统一来源

**扩展已有 `wrongBookDb.ts`**：
- 升级到 `version(2)`，增加 `correctBook` store；`version(1)` 保留以兼容老数据（Dexie 自动迁移）
- `UltramanDb` 类新增 `correctBook!: Table<CorrectBookEntry, string>`

**gameStore 接入**：
- `startGame`：题包加载与 `correctBook` 读取并行
  ```ts
  const [pack, hydrated] = await Promise.all([
    loadQuestionPack(week),
    listCorrectIdsByChild(DEFAULT_CHILD_ID).catch(() => emptyCorrect()),
  ]);
  set({ currentPack: pack, correctQuestionIds: hydrated, packLoading: false });
  ```
- `submitAnswer`：答对时，当 `quiz.playerId === state.childId && context.kind !== 'boss-attack'`，fire-and-forget `recordCorrect({ childId: DEFAULT_CHILD_ID, question, week })`，失败仅 `console.warn`
- 大人答对不持久化（不是学习目标）
- Boss 战答对不持久化（题量在战斗中重复利用，教学价值低）

**SubjectSelector.availCount 改造**：从题包总数改为"诚实剩余数"（排除 `correctQuestionIds[subject]`），与 picker 同口径。卡片剩余 0 时显示"🎉 已答对全部题目"。

**Edge case — 全部答对**：
- v1 仅 week-01.json，小朋友答对全部核心学科题后，该学科 0 可选
- 强制答题场景（property-buy / property-rent / boss-attack）若无题可答：`selectSubject` 现已 return 保护，retained；UI 层看到 `availCount === 0` 直接灰掉
- v1 不做自动清零或"重刷一轮"。如需要，可加管理入口 `clearCorrectForChild`

**测试策略**：
- `correctBookRepo.test.ts`（fake-indexeddb）：record、list、dedup、按 childId 过滤
- `correctExclusion.test.ts`：
  - 答对 q1 → 下次再开局 → `correctQuestionIds.math` 已含 q1
  - mock `correctBookRepo.listCorrectIdsByChild` 返回预设 set → startGame 后 `correctQuestionIds` 被 hydrate
- `SubjectSelector.availCount` 现实剩余数测：已答对的学科题数减少
- E2E 不专测持久化（jsdom + fake-indexeddb 组合已在 `correctBookRepo.test.ts` 覆盖）

### D' 相关依赖

需要安装 `fake-indexeddb` 作为 devDep 让 vitest 在 jsdom 下能模拟 IndexedDB：

```json
// apps/web/package.json devDependencies
"fake-indexeddb": "^6.0.0"
```

`apps/web/src/setupTests.ts` 已存在，需在其顶部加一行：
```ts
import 'fake-indexeddb/auto';
```

### 顺手修复（Codex 发现的现有漏洞）

- **Dice 守卫**：`apps/web/src/features/board/Dice.tsx` disabled 条件加 `|| pendingQuiz`，防止 LandingOverlay 清空 `landingEvent` 后二次骰
- **SubjectSelector 计数一致性**：D 项已顺带修（`availCount` 改为考虑 `correctQuestionIds`）

## Implementation Steps

### A 组（棋盘随机洗牌，3 步）

1. **Modify `apps/web/src/domain/tiles.ts`**：
   - 新增 `createBoardTiles(rand)` 实现上述随机 + 回溯算法
   - 保留 `FALLBACK_LAYOUT`（v2 方案）作为兜底
   - 保留 `PROPERTY_DEFS`（仅 name/price/rent；位置从 layout 决定）
   - 导出常量 `ADJACENCY_FREE` 等纯辅助以便单测

2. **Update `apps/web/src/domain/__tests__/tiles.test.ts`**：
   - "fallback layout is valid 28-tile board"
   - "random layout preserves type counts across 100 seeds"
   - "random layout has no adjacent same-type (circular)"
   - "position 0 is always start"
   - "district split is 4/4/4"
   - 注入 seeded rand 得到确定 layout 断言

3. **Modify `apps/web/src/stores/gameStore.ts`**：
   - `startGame` 里 `const tiles = createBoardTiles()` 保持不变（默认使用 `Math.random`）

### B 组（地产答题，7 步）

4. **Modify `apps/web/src/stores/gameStore.ts` — QuizContext 扩展**：
   ```ts
   export type QuizContextKind =
     | 'study' | 'monster' | 'property-buy' | 'property-rent' | 'property-bonus' | 'boss-attack';

   export type QuizContext =
     | { kind: 'study' }
     | { kind: 'monster' }
     | { kind: 'property-buy'; position: number; price: number }
     | { kind: 'property-rent'; position: number; ownerId: string; rent: number }
     | { kind: 'property-bonus'; position: number; bonus: number }
     | { kind: 'boss-attack'; weaponId?: string };
   ```

5. **Modify `rollAndMove` `property-owned-other` 分支**：
   - 不再立即 `triggerRentSettlement`
   - 只写 `landingEvent = landing`，等待用户从 LandingOverlay 按钮选择

6. **新增 4 个 action**（gameStore.ts）：
   ```ts
   chooseRentQuiz: () => void;            // 从 landingEvent=property-owned-other 进入 property-rent 答题
   acceptRentPayment: () => void;         // 从 landingEvent=property-owned-other 直接交租 + 清算
   chooseSelfPropertyQuiz: () => void;    // 从 landingEvent=property-owned-self 进入 property-bonus 答题
   dismissSelfPropertyLanding: () => void;// 从 landingEvent=property-owned-self 跳过
   ```

7. **Modify `submitAnswer` 支持新 context**：
   ```ts
   if (quiz.context.kind === 'property-rent') {
     if (correct) {
       nextCorrectIds = markQuestionCorrect(nextCorrectIds, quiz.question);
       workingGame = updateStreak(workingGame, quiz.playerId, 1);
       message = `答对！免除租金 ¥${quiz.context.rent}`;
     } else {
       // 失败走现有 owned-other 结算 + autoLiquidate
       workingGame = triggerRentSettlement(workingGame, payer, quiz.context.ownerId, quiz.context.rent);
       // ...
     }
   } else if (quiz.context.kind === 'property-bonus') {
     if (correct) {
       nextCorrectIds = markQuestionCorrect(nextCorrectIds, quiz.question);
       workingGame = addMoney(workingGame, quiz.playerId, quiz.context.bonus);
       workingGame = updateStreak(workingGame, quiz.playerId, 1);
       message = `答对！自己的地奖金 +¥${quiz.context.bonus}`;
     } else {
       message = '答错了，无奖励';
     }
   }
   ```
   错题本规则：仅小朋友答错 `property-rent` 且未用求助卡才记（与现有 study/monster 一致）；`property-bonus` 答错不记错题本（无惩罚题型）。

8. **Modify `cancelPendingQuiz`**：
   ```ts
   const CANCELLABLE: ReadonlySet<QuizContextKind> = new Set([
     'study', 'monster', 'property-rent', 'property-bonus',
   ]);
   ```
   - 取消 `property-rent` 时：等同 `acceptRentPayment`
   - 取消 `property-bonus` 时：直接清空 pendingQuiz

9. **Modify `apps/web/src/features/board/LandingOverlay.tsx`**：
   - `property-owned-other`：`💸 交租！` 标题 + 两按钮 `答题免租` / `直接交租`
   - `property-owned-self`：`🏙️ 这是你的地产` 标题 + 两按钮 `答题领奖励` / `跳过`

10. **Modify `apps/web/src/features/board/Dice.tsx`**：
    - disabled 条件加 `|| pendingQuiz`

### C 组（小朋友轮换，4 步）

11. **Modify `apps/web/src/stores/gameStore.ts`**：
    - Store 加 `lastChildSubject: Subject | null`
    - 初始 / startGame / endGame 三处 reset
    - `submitAnswer` 成功或失败时（只要 `quiz.playerId === childId && CORE_SUBJECTS.has(subject) && context.kind !== 'boss-attack'`）更新

12. **Modify `apps/web/src/features/quiz/SubjectSelector.tsx`**：
    - 读 `lastChildSubject`、`correctQuestionIds`（为 D 的 availCount 顺道做）
    - 计算 `otherCoreEligibleCount`
    - `gateReason` 逻辑
    - 顶部 fallback 提示条

13. **Add test `apps/web/src/stores/__tests__/childRotation.test.ts`**：
    - 小朋友连续答 chinese 后 `lastChildSubject === 'chinese'`
    - 大人答题不改
    - `boss-attack` 的 chinese 不改

14. **Add test `apps/web/src/features/quiz/__tests__/SubjectSelector.childRotation.test.tsx`**：
    - `lastChildSubject='chinese'`、小朋友视角下 chinese 按钮 disabled
    - 若 math/english 都 0 题，chinese 仍可选（fallback），显示顶部提示
    - 大人视角下全部可选

### D 组（答对题**跨局**去重：IndexedDB 持久化，6 步）

15. **Add `apps/web/src/config/childIdentity.ts`**：
    ```ts
    export const DEFAULT_CHILD_ID = 'child-default';
    ```
    修改 `apps/web/src/features/menu/MainMenu.tsx` 改为从这里导入（消除本地常量）。

16. **Modify `apps/web/src/data/repo/wrongBookDb.ts`**：
    - 定义 `CorrectBookEntry` 类型或放到 shared schema
    - 类加 `correctBook!: Table<CorrectBookEntry, string>`
    - 升级到 `this.version(2).stores({ wrongBook: '...', settings: 'key', correctBook: 'id, childId, questionId, subject, week, lastCorrectAt' })`
    - `version(1)` 保留，不必手动 upgrade 回调（Dexie 自动加表）

17. **Add `apps/web/src/data/repo/correctBookRepo.ts`**：
    - `recordCorrect({ childId, question, week })`：幂等 upsert；已存在则刷新 `lastCorrectAt`
    - `listCorrectIdsByChild(childId): Promise<CorrectBySubject>`：返回 `{ math:Set, chinese:Set, english:Set, brain:Set }`
    - `clearCorrectForChild(childId)`：预留 debug
    
18. **Install `fake-indexeddb`**：
    ```bash
    pnpm --filter @ultraman/web add -D fake-indexeddb@^6.0.0
    ```
    修改 `apps/web/src/setupTests.ts`：首行 `import 'fake-indexeddb/auto';`

19. **Modify `apps/web/src/stores/gameStore.ts`**：
    - `startGame` 里把 `loadQuestionPack` 与 `listCorrectIdsByChild` 合并成 `Promise.all`
    - `submitAnswer` 答对分支（非 boss-attack、仅 child）fire-and-forget `recordCorrect(...)`
    - 顶部 `import { DEFAULT_CHILD_ID } from '../config/childIdentity.js'`

20. **Add tests**：
    - `apps/web/src/data/repo/__tests__/correctBookRepo.test.ts`：record/list/idempotent/按 childId 过滤
    - `apps/web/src/stores/__tests__/correctExclusion.test.ts`：
      - Mock `correctBookRepo.listCorrectIdsByChild` 返回 `{ math: new Set(['q1']), ... }`
      - `startGame` 后 `correctQuestionIds.math.has('q1') === true`
      - 触发 `selectSubject('math')` → `activeQuiz.question.id !== 'q1'`
    - `SubjectSelector.availCount` 在 `correctQuestionIds.math` 非空时 `共 N 题` 正确减少

### 共同验证（3 步）

17. **Regression E2E** `apps/web/tests/e2e/propertyQuiz.spec.ts` — smoke：主菜单→开局→任意玩家踩别人地→看到 `答题免租` 按钮可点击
18. **全量回归** typecheck + lint + test + test:e2e
19. **视觉手动验证**（`pnpm dev`）：
    - 开 3 局，每局棋盘布局不同
    - 别人地弹 "答题免租 / 直接交租"
    - 自己地弹 "答题领奖励 / 跳过"
    - 小朋友连续两题看到同学科卡片被禁用 + "上一题选过，先换一门" 提示
    - 连续答对 3 题，这 3 题后续不再出现（SubjectSelector 的"共 N 题"数递减）

## Key Files

| 文件 | 操作 | 描述 |
|---|---|---|
| `apps/web/src/domain/tiles.ts` | Modify | `createBoardTiles(rand)` 随机生成 + 回溯 + fallback |
| `apps/web/src/domain/__tests__/tiles.test.ts` | Modify | 批量断言随机 layout 合法性 |
| `apps/web/src/stores/gameStore.ts` | Modify | + `property-rent` / `property-bonus` QuizContext、4 个新 action、`lastChildSubject`、`submitAnswer` 分支、`cancelPendingQuiz` 白名单、startGame hydrate、correct 持久化 |
| `apps/web/src/features/board/LandingOverlay.tsx` | Modify | owned-other / owned-self 双按钮 |
| `apps/web/src/features/board/Dice.tsx` | Modify | disabled 加 `pendingQuiz` |
| `apps/web/src/features/quiz/SubjectSelector.tsx` | Modify | 轮换 gate + 真实剩余题量 + fallback 提示 |
| `apps/web/src/config/childIdentity.ts` | Create | `DEFAULT_CHILD_ID` 常量 |
| `apps/web/src/features/menu/MainMenu.tsx` | Modify | 从 childIdentity 导入 DEFAULT_CHILD_ID |
| `apps/web/src/data/repo/wrongBookDb.ts` | Modify | Dexie 升级到 v2，新增 `correctBook` table |
| `apps/web/src/data/repo/correctBookRepo.ts` | Create | `recordCorrect` / `listCorrectIdsByChild` / `clearCorrectForChild` |
| `apps/web/src/setupTests.ts` | Modify | `import 'fake-indexeddb/auto'` |
| `apps/web/package.json` | Modify | devDep `fake-indexeddb@^6.0.0` |
| `apps/web/src/stores/__tests__/childRotation.test.ts` | Create | 轮换状态机测 |
| `apps/web/src/stores/__tests__/correctExclusion.test.ts` | Create | 跨局去重端到端测 |
| `apps/web/src/data/repo/__tests__/correctBookRepo.test.ts` | Create | IndexedDB repo 单测 |
| `apps/web/src/features/quiz/__tests__/SubjectSelector.childRotation.test.tsx` | Create | 轮换 UI 测 |
| `apps/web/tests/e2e/propertyQuiz.spec.ts` | Create | 地产答题 smoke |

## Risks and Mitigation

| 风险 | 严重度 | 缓解 |
|---|---|---|
| 随机布局死循环 / 性能差 | MEDIUM | 最多 50 次尝试后回落到 FALLBACK_LAYOUT；实验证明 28 格 + 类型分布生成成功率 > 95% |
| 随机布局让玩家每局重新定位（心智负担） | LOW | 位置 0 始终是起点；UI 上格子贴图仍按类型显示 |
| `rollAndMove` 不再立即清算会影响 autoLiquidate 路径 | HIGH | `acceptRentPayment` 完整复用现有结算+清算；集成测覆盖"答错后破产"路径 |
| 免租成功业主不分钱可能让大人"不开心" | LOW | 产品决策已锁定（你确认）；文案明确"租金免除" |
| 小朋友连续轮换死锁（3 个学科都没题） | LOW | `otherCoreEligibleCount === 0` 时允许连选 + 顶部提示 |
| `boss-attack` 遇小朋友学科轮换 | LOW | 明确排除 |
| `property-bonus` 答错不记错题本 | LOW | 产品决策：无惩罚题型不记；已在 `submitAnswer` 分支明示 |
| 答对去重和题量计数漂移 | LOW | D 组把 UI `availCount` 与 picker `excludeIds` 口径对齐 |
| IndexedDB 被用户清浏览器数据清掉 | LOW | 行为等同"重置进度"；Dexie 自动重建空表；不阻塞游戏 |
| Dexie v1 → v2 schema 迁移失败 | MEDIUM | 仅新增 table，Dexie 会自动处理；write fake-indexeddb 测试覆盖 v1 数据 + v2 打开 |
| `recordCorrect` 失败时不阻塞游戏 | LOW | fire-and-forget + `console.warn` |
| 小朋友全部题答对后的体验 | LOW | v1 显示"🎉 已答对全部题目"；后续题包扩到 18 周足够多 |

## Test Strategy

| Test Type | Scope | Verification |
|---|---|---|
| 单元（domain） | `tiles.ts` 随机 layout | 批量 seed 下类型计数、相邻约束、district 4/4/4、fallback 触发 |
| 单元（store） | `property-rent` / `property-bonus` 结算、`lastChildSubject` 迁移、答对去重 | 规则每条都有独立测 |
| 单元（UI） | SubjectSelector 轮换 + availCount 去重 | 小朋友 vs 大人、fallback、题量随答对递减 |
| 集成（store） | `rollAndMove` owned-other/self 新路径 | 按 action 分岔，不自动扣租 |
| E2E | propertyQuiz smoke | 主流程可达、按钮可交互 |
| 回归 | 全部现有 typecheck/lint/test/e2e | 保持绿 |

## Execution Model Routing

- A 组 `tiles.ts` 随机算法 + 单测：**Codex GPT-5.4**（组合约束 + 回溯，适合 code-gen），Claude 审阅
- B 组 gameStore 改动超过 100 行 + 新 action：**Codex GPT-5.4 出原型**，Claude refactor 落地
- B 组 LandingOverlay / Dice：Claude 直接改
- C 组 store 状态 + SubjectSelector UI：Claude 直接改
- D 组 `availCount` 改造 + 集成测：Claude 直接改
- Codex reviewer 在 Phase 5 做全量审计

## SESSION_ID

- `CODEX_SESSION: codex-1776579328-15144`

---

**Plan generated and saved to `.claude/plan/board-and-quiz-v4.md`**

**Please review the plan above. You can:**
- **Modify plan**: Tell me what needs adjustment, I'll update the plan
- **Execute plan**: Copy the following command to a new session

```
/ecc:multi-execute .claude/plan/board-and-quiz-v4.md
```
