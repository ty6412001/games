# 棋盘重排 + 地产答题 + 小朋友科目轮换 实施计划

> **Task**: 三项独立改动一起落地。(A) 调整 28 格棋盘布局让 4 角都是特殊格、消除同类相邻；(B) 踩到别人地改为"答题免租"可选，踩到自己地改为"答题领奖励"可选；(C) 小朋友答题时不能连续选同一门学科，强制在 语文/数学/英语 之间轮换。

## Analysis Summary

- **Claude 评估**：三项彼此独立，串起来做：先完成 A（只动 `tiles.ts` 与相关单测，无链式副作用），再做 B（turnEngine + store + LandingOverlay + 新 QuizContext），最后做 C（store 状态 + SubjectSelector 显示逻辑）。每一项都有独立的验收面，不会互相阻塞。
- **Codex 评估**（SESSION `codex-1776579328-15144`）：与 Claude 共识度高，贡献了 3 条关键补强：
  - A 的具体位置方案清晰，采纳
  - B 的自己地奖励额度建议 `min(80, floor(baseRent × 0.5))`（与 `STUDY_REWARD_CORRECT` 量级对齐，不超过普通答题奖），采纳
  - 提示了若干现有漏洞需要顺手修：`cancelPendingQuiz` 白名单需扩充、`DicePanel` 没守护 `pendingQuiz` 可能导致二次骰、`SubjectSelector` 的计数展示没考虑资格筛选
- **共识**：免租时业主不分钱（"waive" 就是 0 转账），租约失败走现有清算流程；轮换只作用于语/数/英三门，Boss 攻击场景不受轮换约束。
- **分歧**：无。

## Technical Solution

### A. 棋盘重排（28 格）

4 角放 4 种特殊，每条边 6 格用"地产-学习-地产-(变化)-地产-学习"模板，彻底消除同类相邻：

| 位置 | 类型 | 说明 |
|---:|---|---|
| 0 | start | 起点（角） |
| 1 | property | 巴尔坦（monster-forest） |
| 2 | study | |
| 3 | property | 哥莫拉（monster-forest） |
| 4 | chance | |
| 5 | property | 雷德王（monster-forest） |
| 6 | study | |
| 7 | boss-outpost | 角 |
| 8 | property | 杰顿（monster-forest） |
| 9 | study | |
| 10 | property | 金星（space-station） |
| 11 | chance | |
| 12 | property | 火星（space-station） |
| 13 | study | |
| 14 | monster | 角（原 22 的怪兽挪到角） |
| 15 | property | M78（space-station） |
| 16 | study | |
| 17 | property | 泰坦（space-station） |
| 18 | monster | 第二头怪兽 |
| 19 | property | 胜利之塔（land-of-light） |
| 20 | study | |
| 21 | reward-vault | 角 |
| 22 | property | 光之塔（land-of-light） |
| 23 | study | |
| 24 | property | 长老殿（land-of-light） |
| 25 | chance | |
| 26 | property | 和平广场（land-of-light） |
| 27 | study | |

统计：12 property（3 区各 4）+ 8 study + 3 chance + 2 monster + 1 reward-vault + 1 boss-outpost + 1 start = 28 ✓

district 映射：
- `monster-forest`: `[1, 3, 5, 8]`
- `space-station`: `[10, 12, 15, 17]`
- `land-of-light`: `[19, 22, 24, 26]`

### B. 地产答题：租金减免 / 自地奖励

新增两个 `QuizContext` 子类型（在 `gameStore.ts`）：
```ts
| { kind: 'property-rent'; position: number; ownerId: string; rent: number }
| { kind: 'property-bonus'; position: number; bonus: number }
```

行为：

**踩到别人地（`property-owned-other`）**：
- `LandingOverlay` 显示两个按钮：
  - `答题免租` → 开启 SubjectSelector → 进入 `property-rent` 答题
  - `直接交租` → 立即 `triggerRentSettlement` + 清算
- 答题结果：
  - ✅ 正确：租金完全免除（0 元转账），业主不拿钱
  - ❌ 错误 / 超时 / 求助卡命中：按原规则扣全额租金 → 若 money < 0 走 `autoLiquidate`
- 破产规则：与现状一致（先结算再清算；业主拿到全额即使支付方破产）

**踩到自己地（`property-owned-self`）**：
- `LandingOverlay` 显示两个按钮：
  - `答题领奖励` → SubjectSelector → 进入 `property-bonus` 答题
  - `跳过` → 直接结束，不变
- 答题结果：
  - ✅ 正确：`money += bonus`（无扣分，下行保护）
  - ❌ / 超时 / 跳过：无奖励、无惩罚

**奖励计算**：`bonus = min(80, floor(tile.baseRent × 0.5))`
- 巴尔坦基地 baseRent=40 → bonus=20
- 哥莫拉 baseRent=44 → bonus=22
- 雷德王 baseRent=48 → bonus=24
- 金星 baseRent=70 → bonus=35
- M78 baseRent=92 → bonus=46
- 光之塔 baseRent=140 → bonus=70
- 和平广场 baseRent=180 → bonus=80（被 80 上限截断）

**`cancelPendingQuiz` 白名单扩充**：新增 `property-rent`（取消 = 直接交租）和 `property-bonus`（取消 = 无奖励）。保留已有的 `study` / `monster` 可跳过。

### C. 小朋友科目轮换

Store 新增字段：
```ts
lastChildSubject: Subject | null;   // 最近一次小朋友选过的语/数/英
```

在 `submitAnswer` 结束时（小朋友答题、非 boss-attack、非 brain）：
```ts
if (quiz.playerId === childId && CORE_SUBJECTS.has(quiz.question.subject)) {
  newLastChildSubject = quiz.question.subject;
}
```

`SubjectSelector` 里对小朋友：
```ts
const isChildAnswering = pending.playerId === childId;
const lastSubject = store.lastChildSubject;
const coreSubjects: Subject[] = ['chinese', 'math', 'english'];
const eligibleCoreCount = coreSubjects.filter(
  (s) => s !== lastSubject && availCount(s) > 0
).length;

// 对每张学科卡：
const gateReason =
  s.adultOnly && isChildAnswering
    ? 'adult-only'
    : isChildAnswering && s.id === lastSubject && eligibleCoreCount > 0
      ? 'repeat-cooldown'
      : availCount(s.id) === 0
        ? 'out-of-questions'
        : null;
const disabled = gateReason !== null;
const hint =
  gateReason === 'adult-only' ? ''  // 保留现有 "仅限大人"
    : gateReason === 'repeat-cooldown' ? '上一题选过，先换一门'
      : gateReason === 'out-of-questions' ? '本轮无题'
        : `共 ${availCount(s.id)} 题`;
```

边界兜底（Codex 补充）：
- 如果 `eligibleCoreCount === 0`（其他核心学科都没题），放宽允许连选上一题那门，并在头部显示提示条："其他学科没题了，这次可以连选"
- 大人不受轮换约束
- `brain` 不纳入轮换（本身就是 adultOnly）
- Boss 攻击场景（`boss-attack`）不启用轮换（规则简单，避免死锁）

### 顺手修复（Codex 发现的现有漏洞）

- **Dice 守卫**：`apps/web/src/features/board/Dice.tsx` 的 disabled 条件不含 `pendingQuiz`。因为 LandingOverlay 清空 landingEvent 前可能已开启 pendingQuiz → 可能二次骰。加 `|| pendingQuiz`。
- **SubjectSelector 计数一致性**：`availCount` 今天只按题包总数算，不考虑答对排除；与 `questionPicker` 的 `pickRandomQuestion` 过滤口径不一致。本次不重构，但加 TODO。

## Implementation Steps

### A 组（棋盘重排，2 步）

1. **Modify `apps/web/src/domain/tiles.ts`** —
   - 重排 `PROPERTY_DEFS` 的 position 字段（按上表）
   - `STUDY_POSITIONS = [2, 6, 9, 13, 16, 20, 23, 27]`
   - `CHANCE_POSITIONS = [4, 11, 25]`
   - `MONSTER_POSITIONS = [14, 18]`
   - `REWARD_VAULT_POSITION = 21`
   - `BOSS_OUTPOST_POSITION = 7`

2. **Update `apps/web/src/domain/__tests__/tiles.test.ts`** —
   - 新增 "28 tiles with correct counts" 断言
   - "no two adjacent same-type tiles" 断言
   - "4 corners are specials" 断言
   - district 字段按新位置

### B 组（地产答题，7 步）

3. **Modify `apps/web/src/stores/gameStore.ts` — QuizContext 扩展**：
   ```ts
   export type QuizContext =
     | { kind: 'study' }
     | { kind: 'monster' }
     | { kind: 'property-buy'; position: number; price: number }
     | { kind: 'property-rent'; position: number; ownerId: string; rent: number }
     | { kind: 'property-bonus'; position: number; bonus: number }
     | { kind: 'boss-attack'; weaponId?: string };
   ```
   同步更新 `QuizContextKind` 类型。

4. **Modify `rollAndMove` `property-owned-other` 分支**：
   - 不再立即 `triggerRentSettlement`
   - 设置 `landingEvent = landing`（仍显示 LandingOverlay），等待用户从 overlay 选择 `答题免租` 或 `直接交租`
   - 新 action `chooseRentQuiz(position, ownerId, rent)` 把 pendingQuiz 写成 `property-rent`
   - 新 action `acceptRentPayment(position, ownerId, rent)` 执行当前的结算逻辑

5. **Modify `rollAndMove` `property-owned-self` 分支**：
   - 读 `tile.baseRent`，计算 `bonus = Math.min(80, Math.floor(tile.baseRent * 0.5))`
   - 新 action `chooseSelfPropertyQuiz(position, bonus)` 把 pendingQuiz 写成 `property-bonus`
   - 新 action `dismissSelfPropertyLanding()` 直接跳过

6. **Modify `submitAnswer` 支持两个新 context**：
   ```ts
   if (quiz.context.kind === 'property-rent') {
     if (correct) {
       // rent waived, no transfer
       message = `答对！免除租金 ¥${quiz.context.rent}`;
     } else {
       // fall through: settle rent + auto-liquidate
       workingGame = triggerRentSettlement(workingGame, payer, quiz.context.ownerId, quiz.context.rent);
       // ... autoLiquidate check identical to current owned-other branch
       message = `答错了，交租 ¥${quiz.context.rent}`;
     }
   } else if (quiz.context.kind === 'property-bonus') {
     if (correct) {
       workingGame = addMoney(workingGame, quiz.playerId, quiz.context.bonus);
       message = `答对！自己的地奖金 +¥${quiz.context.bonus}`;
     } else {
       message = '答错了，无奖励';
     }
   }
   ```
   错题本记录：与现有规则一致（仅小朋友答错且未用求助卡才记）。

7. **Modify `cancelPendingQuiz` 扩充白名单**：
   ```ts
   const CANCELLABLE: readonly QuizContextKind[] =
     ['study', 'monster', 'property-rent', 'property-bonus'];
   ```
   - 取消 `property-rent` 时：等同 `acceptRentPayment`，直接结算
   - 取消 `property-bonus` 时：直接清空 pending，等同跳过

8. **Modify `apps/web/src/features/board/LandingOverlay.tsx`** —
   - `property-owned-other` 渲染两个按钮：`答题免租`（橙色 primaryAction）/ `直接交租`（灰色 secondaryAction）
   - `property-owned-self` 渲染两个按钮：`答题领奖励` / `跳过`
   - 标题保持（`💸 交租！` / `🏙️ 这是你的地产`）
   - 按钮点击分别调用新 action

9. **Modify `apps/web/src/features/board/Dice.tsx`** —
   - disabled 条件加 `|| state.pendingQuiz`

### C 组（小朋友科目轮换，4 步）

10. **Modify `apps/web/src/stores/gameStore.ts` — 状态扩展**：
    ```ts
    lastChildSubject: Subject | null;
    ```
    - 初始/startGame/endGame 三处 reset 加 `lastChildSubject: null`
    - `submitAnswer` 结束时（无论对错，仅当 `quiz.playerId === childId && CORE_SUBJECTS.has(quiz.question.subject) && quiz.context.kind !== 'boss-attack'`），把 `lastChildSubject` 设为 `quiz.question.subject`

11. **Modify `apps/web/src/features/quiz/SubjectSelector.tsx`** —
    - 引入 `lastChildSubject` selector
    - 核心学科常量：`const CORE_SUBJECTS: readonly Subject[] = ['chinese', 'math', 'english'];`
    - 计算 `eligibleCoreCount`（其他核心学科还有题的数量）
    - `gateReason` 逻辑如上
    - 弹窗顶部：当 `eligibleCoreCount === 0 && isChildAnswering && lastChildSubject !== null` 时显示一条提示条："其他学科没题了，这次可以连选 xxx"

12. **Add test `apps/web/src/stores/__tests__/childRotation.test.ts`** —
    - 小朋友连续答 chinese 后 `lastChildSubject === 'chinese'`
    - 大人答题不改 `lastChildSubject`
    - Boss 攻击的 chinese 题不改 `lastChildSubject`

13. **Add test `apps/web/src/features/quiz/__tests__/SubjectSelector.childRotation.test.tsx`** —
    - 给定 `lastChildSubject = 'chinese'`，小朋友视角下 chinese 按钮 `disabled`，提示 "上一题选过，先换一门"
    - 给定 `lastChildSubject = 'chinese'` 且 math/english 题包空，chinese 仍可选（fallback）
    - 大人视角下全部可选

### 共同验证（4 步）

14. **Regression E2E** `apps/web/tests/e2e/propertyQuiz.spec.ts` — smoke：主菜单→开局→任意玩家到别人地→看到 `答题免租` 按钮可点击
15. **全量回归** typecheck + lint + test + test:e2e
16. **视觉验证**（本地 `pnpm dev`）：
    - 棋盘 28 格视觉确认 4 角特殊 + 无同类相邻
    - 别人地弹出"答题免租 / 直接交租"选项
    - 自己地弹出"答题领奖励 / 跳过"选项
    - 小朋友连续两轮看到同学科卡片被禁用 + 提示

## Key Files

| 文件 | 操作 | 描述 |
|---|---|---|
| `apps/web/src/domain/tiles.ts` | Modify | 28 格位置全面重排；district 映射更新 |
| `apps/web/src/domain/__tests__/tiles.test.ts` | Modify | 新位置断言 |
| `apps/web/src/stores/gameStore.ts` | Modify | + `QuizContext.property-rent` / `property-bonus` / `lastChildSubject`；改 `rollAndMove`、`submitAnswer`、`cancelPendingQuiz`；新增 4 个 action |
| `apps/web/src/features/board/LandingOverlay.tsx` | Modify | owned-other / owned-self 渲染双按钮 |
| `apps/web/src/features/board/Dice.tsx` | Modify | disabled 加 `pendingQuiz` |
| `apps/web/src/features/quiz/SubjectSelector.tsx` | Modify | 轮换 gate + eligibleCore 计数 + 兜底提示 |
| `apps/web/src/stores/__tests__/childRotation.test.ts` | Create | 轮换状态机测 |
| `apps/web/src/features/quiz/__tests__/SubjectSelector.childRotation.test.tsx` | Create | 轮换 UI 测 |
| `apps/web/tests/e2e/propertyQuiz.spec.ts` | Create | 地产答题 smoke |

## Risks and Mitigation

| 风险 | 严重度 | 缓解 |
|---|---|---|
| 棋盘重排破坏现有单测 / E2E 的硬编码位置 | MEDIUM | tiles.test.ts + turnEngine.test.ts 统一更新；Playwright 测试不依赖具体位置 |
| LandingOverlay 新按钮与当前 `rentNotice` / `buyPrompt` 状态冲突 | MEDIUM | owned-other 分支不再自动写 `rentNotice`，改在用户选择"直接交租"后写；`buyPrompt` 路径不变 |
| 业主在答题免租成功后不拿钱，可能让孩子感到「大人不公平」 | LOW | 产品决策：免租就是免租（Codex 推荐），文案明确展示"租金免除" |
| 小朋友陷入轮换死锁（3 个学科都没题） | LOW | `eligibleCoreCount === 0` 时允许连选，UI 文案解释 |
| `boss-attack` 遇小朋友学科轮换规则 | LOW | 明确排除：轮换仅作用于非 boss 场景 |
| `rollAndMove` 不再立即清算会影响 autoLiquidate 路径 | HIGH | 新 action `acceptRentPayment` 完整复用当前结算+清算代码；单测覆盖"答错后破产"路径 |
| Dice 二次骰漏洞已存在 | LOW | 顺手 disabled 补齐，不影响现有行为 |

## Test Strategy

| Test Type | Scope | Verification |
|---|---|---|
| 单元（domain） | `tiles.ts` 新布局 | 28 计数、4 角、无相邻、district 正确 |
| 单元（store） | `property-rent` / `property-bonus` 结算、`lastChildSubject` 迁移 | 答对免租、答错清算、自地奖金额度、轮换标记仅针对 child/core |
| 单元（UI） | SubjectSelector 轮换 gate | 小朋友 vs 大人、fallback、提示文案 |
| 集成（store） | `rollAndMove` owned-other/self 新路径 | 不自动扣租；按 action 分岔 |
| E2E | propertyQuiz smoke | 主流程可达、按钮可交互 |
| 回归 | 全部现有 typecheck/lint/test/e2e | 保持绿 |

## Execution Model Routing

- A 组（`tiles.ts` + 测）：Claude 直接改（机械位置重排，无逻辑风险）
- B 组 gameStore 改动超过 100 行 + 新增 action：**Codex GPT-5.4 出原型**（architect role），Claude refactor 落地
- B 组 LandingOverlay / Dice：Claude 直接改（< 30 行 className + 分支）
- C 组 store 状态 + SubjectSelector UI：Claude 直接改（逻辑集中、< 80 行）
- 新增测：Claude 直接写
- Codex reviewer 在 Phase 5 全量审计

## Pre-Execution Confirmation Questions

若用户对下列默认有不同意见，请在执行前说明，我会先改计划：

1. **布局方案**：采用上表（4 角 = start/boss/monster/reward，每边严格"地-学-地-事件-地-学"）。若你想要不同分布（例如保留原有 boss-outpost@7 但只重排中段，或每局随机洗牌），告诉我。
2. **免租时业主收益**：推荐**业主不拿钱**（waive = 0）。若希望业主仍拿 50% 或全额（"教学奖励"式），告诉我。
3. **自地答题奖金刻度**：推荐 `min(80, baseRent × 0.5)`（低价地 20 分，高价地 80 分封顶）。若要更大（例如全 `STUDY_REWARD_CORRECT=80`）或按难度走，告诉我。
4. **轮换强度**：推荐**一步冷却**（禁上一题那门）。若要更严（必须三门都答一次才能重复），告诉我。

## SESSION_ID

- `CODEX_SESSION: codex-1776579328-15144`

---

**Plan generated and saved to `.claude/plan/board-and-quiz-v2.md`**

**Please review the plan above. You can:**
- **Modify plan**: Tell me what needs adjustment, I'll update the plan
- **Execute plan**: Copy the following command to a new session

```
/ecc:multi-execute .claude/plan/board-and-quiz-v2.md
```
