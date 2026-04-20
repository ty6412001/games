# v4 验证自动化 + 学习进度重置入口 实施计划

> **Task**: 把 `board-and-quiz-v4` 交付报告里给出的 6 条人工验证项自动化，并把"清除跨局学习进度"做成用户可达的按钮。

## Analysis Summary

- **Claude 评估**：6 条验证项分成 4 类 ——
  - **纯领域/store 行为**（#1, #5）→ Vitest 单/集成测，fake-indexeddb 已就位
  - **UI 状态渲染**（#4）→ React Testing Library 组件测（已有同文件夹 bossContrast/childRotation 测作参考）
  - **端到端交互链路**（#2, #3）→ store 集成测 + 一条简短 Playwright smoke；Codex 建议为 E2E 加 `window.__ultraman__` 测试钩子，但更简方案是**不动 E2E**，仅做 store 集成测（覆盖率相同，零 test-hook 增量）
  - **工具入口**（#6）→ ReviewMode 底部加"清除学习进度"按钮 + 确认弹窗 + store action，顺带加 repo 集成测
- **Codex 评估**（SESSION `codex-1776583101-33031`）：给出了完全一致的层级分配；建议 #6 放"hidden debug page"而不是 ReviewMode。Claude 分歧：**把按钮放 ReviewMode 底部**，因为家长心智上"清除学习记录"属于学习管理，和每日复习同一场景；加确认弹窗避免误触。
- **共识**：#2 / #3 不走 E2E 避免 flakiness；用 store 集成测验证关键分支；#4 走 RTL；#1 / #5 走 store 集成 + repo 单测。
- **分歧**：#6 入口位置 → Claude 推荐 ReviewMode 底部（用户可达性优先）。

## Technical Solution

### 自动化矩阵

| # | 验证项 | 目标行为 | 测试层 | 文件 |
|---|---|---|---|---|
| 1 | 每局棋盘不同 | 连开 3 局，至少 2 局 `tiles[i].type` 序列不同（极小概率冲突可忽略） | 单测 + store 集成 | `domain/__tests__/tiles.randomness.test.ts` + `stores/__tests__/startGameLayout.test.ts` |
| 2 | 别人地双按钮 + 答对免租 / 答错扣租 | UI 按钮出现；触发 store action 走正确路径 | store 集成 | `stores/__tests__/propertyRent.test.ts` |
| 3 | 自己地双按钮 + 答对奖励 / 答错无惩罚 | 同上 | store 集成 | `stores/__tests__/propertyBonus.test.ts` |
| 4 | 连答 2 题后学科禁用 | 给定 `lastChildSubject`，核心学科卡片 `disabled` + 提示文字出现 | RTL 组件 | `features/quiz/__tests__/SubjectSelector.rotationUI.test.tsx` |
| 5 | 跨局去重显示 N-1 | mock `listCorrectIdsByChild` 返回预置 set；`startGame` 后 availCount 减少 | store 集成 | `stores/__tests__/crossSessionDedup.test.ts` |
| 6 | 学习进度重置 | ReviewMode 底部按钮 + 确认弹窗 → 调用 `clearCorrectForChild` → 下一局 availCount 恢复 | 组件 + repo 集成 | `features/review/__tests__/ReviewMode.reset.test.tsx` + `data/repo/__tests__/correctBookRepo.test.ts`（已有，扩展） |

### 检查项 1 细节

单测 `tiles.randomness.test.ts`：
```ts
it('produces distinct layouts across 10 independent seeds', () => {
  const sequences = Array.from({ length: 10 }, (_, i) =>
    createBoardTiles(mulberry32(i + 1)).map((t) => t.type).join(','),
  );
  const unique = new Set(sequences);
  // 容忍偶发碰撞，但 10 个种子里至少 8 种序列不同
  expect(unique.size).toBeGreaterThanOrEqual(8);
});
```

Store 集成 `startGameLayout.test.ts`：调用 `startGame` 3 次，在测试钩子里比对 `store.game.tiles` 序列。

### 检查项 2 细节（别人地答题路径）

```ts
// stores/__tests__/propertyRent.test.ts
it('correct property-rent answer waives rent, no transfer to owner', async () => {
  const useStore = await startGameWithOwnership({ owner: adult, payer: child, rent: 100 });
  // 手动设置 landingEvent 模拟落到 owned-other
  useStore.setState({ landingEvent: { kind: 'property-owned-other', position: X, ownerId: adult.id, rent: 100 } });
  useStore.getState().chooseRentQuiz();
  // activeQuiz 进入、pendingQuiz 为 null；设 activeQuiz 手动跳过 subject 选择
  useStore.setState({ activeQuiz: { ... context: { kind: 'property-rent', ... }, ... } });
  await useStore.getState().submitAnswer(correctAnswer);
  expect(payer.money).toBe(payerBefore);   // 未扣
  expect(owner.money).toBe(ownerBefore);   // 未得
  expect(store.quizResult.message).toMatch(/免除租金/);
});

it('wrong property-rent answer deducts full rent + possibly liquidates', async () => {
  /* 类似，但 submitAnswer 用错误答案；断言 payer.money 减 rent 并写 rentNotice */
});
```

### 检查项 3 细节（自己地奖励）

```ts
it('correct property-bonus adds min(80, baseRent/2); wrong adds 0', async () => {
  const [useStore, tile] = await startGameOwningOwnProperty({ baseRent: 140 });
  useStore.setState({ landingEvent: { kind: 'property-owned-self', position: tile.position } });
  useStore.getState().chooseSelfPropertyQuiz();
  useStore.setState({ activeQuiz: { ..., context: { kind: 'property-bonus', position: tile.position, bonus: 70 } } });
  await useStore.getState().submitAnswer(correctAnswer);
  expect(playerAfter.money - playerBefore).toBe(70);
  expect(store.quizResult.message).toMatch(/\+¥70/);
});
```

### 检查项 4 细节（SubjectSelector RTL）

```tsx
it('disables last-child-subject card with cooldown hint when child answers next', () => {
  useGameStore.setState({
    game, childId: child.id, pendingQuiz: { playerId: child.id, context: { kind: 'study' } },
    currentPack: pack, lastChildSubject: 'chinese',
    correctQuestionIds: emptyCorrect(),   // 其他核心科目仍有题
  });
  render(<SubjectSelector />);
  const chinese = screen.getByRole('button', { name: /语文/ });
  expect((chinese as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText('上一题选过，先换一门')).toBeTruthy();
});
```

### 检查项 5 细节（跨局去重）

```ts
it('hydrates correctQuestionIds from IndexedDB on startGame; SubjectSelector count reflects it', async () => {
  mockListCorrectIds.mockResolvedValue({
    math: new Set(['m1']),
    chinese: new Set(), english: new Set(), brain: new Set(),
  });
  await useStore.getState().startGame(baseSetup);
  // pack has m1 + m2; availCount should be 1 (m2 only)
  const { getByRole } = render(<SubjectSelector />);
  // pendingQuiz preset...
  expect(getByRole('button', { name: /数学/ })).toHaveTextContent('共 1 题');
});
```

### 检查项 6 细节（重置按钮）

**新 store action**：
```ts
resetCorrectBook: () => Promise<void>;
```
实现：
```ts
resetCorrectBook: async () => {
  await clearCorrectForChild(DEFAULT_CHILD_ID);
  set({ correctQuestionIds: emptyCorrect() });
},
```

**ReviewMode 底部**：
```tsx
<ConfirmResetProgressButton />
```
内部：
```tsx
const [confirming, setConfirming] = useState(false);
<button onClick={() => setConfirming(true)}>🗑️ 清除学习进度</button>
{confirming && (
  <div role="dialog" aria-label="确认清除">
    <p>这会清空所有答对记录，下次开局题目会重新出现。确定吗？</p>
    <button onClick={async () => { await useGameStore.getState().resetCorrectBook(); setConfirming(false); onReset?.(); }}>
      确定清除
    </button>
    <button onClick={() => setConfirming(false)}>取消</button>
  </div>
)}
```

**RTL 测试**：
```tsx
it('clicking 清除学习进度 → 确定 calls resetCorrectBook and closes modal', async () => {
  const resetSpy = vi.fn().mockResolvedValue(undefined);
  useGameStore.setState({ resetCorrectBook: resetSpy });
  const { getByRole, queryByRole } = render(<ReviewMode childId="child-default" onExit={() => {}} />);
  fireEvent.click(getByRole('button', { name: /清除学习进度/ }));
  expect(getByRole('dialog')).toBeTruthy();
  fireEvent.click(getByRole('button', { name: /确定清除/ }));
  await waitFor(() => expect(resetSpy).toHaveBeenCalled());
  expect(queryByRole('dialog')).toBeNull();
});
```

## Implementation Steps

### 第 1 组 — 单测 / store 集成（#1, #5）

1. **Create `apps/web/src/domain/__tests__/tiles.randomness.test.ts`** — 10 个种子下序列 unique 计数
2. **Create `apps/web/src/stores/__tests__/startGameLayout.test.ts`** — 连续 3 次 `startGame`，断言至少 2 次 `tiles` 序列不同（mock `Math.random` 两次切换）
3. **Create `apps/web/src/stores/__tests__/crossSessionDedup.test.ts`** — mock `listCorrectIdsByChild` 返回 `{ math: new Set(['m1']) }`；`startGame` 后验证 `correctQuestionIds.math.has('m1')`；再创 SubjectSelector 检查 availCount

### 第 2 组 — store 集成（#2, #3）

4. **Create `apps/web/src/stores/__tests__/propertyRent.test.ts`** — 2 条：correct/wrong；验证金额、rentNotice、bankruptcy 分支
5. **Create `apps/web/src/stores/__tests__/propertyBonus.test.ts`** — 2 条：correct 加 bonus、wrong streak reset

### 第 3 组 — RTL 组件（#4）

6. **Create `apps/web/src/features/quiz/__tests__/SubjectSelector.rotationUI.test.tsx`** — 3 条：cooldown disabled、hint 文字、fallback 条件下 banner 出现

### 第 4 组 — 重置入口（#6）

7. **Modify `apps/web/src/stores/gameStore.ts`** — 新增 `resetCorrectBook` action + Store 类型
8. **Modify `apps/web/src/features/review/ReviewMode.tsx`** — 底部添加"清除学习进度"按钮 + 确认弹窗
9. **Create `apps/web/src/features/review/__tests__/ReviewMode.reset.test.tsx`** — 点击 → 弹窗 → 确定 → action 被调用、弹窗关闭
10. **Extend `apps/web/src/data/repo/__tests__/correctBookRepo.test.ts`**（已有）— 无需改动；`clearCorrectForChild` 已测

### 第 5 组 — 全量回归

11. **Run** `pnpm --filter @ultraman/web typecheck && pnpm --filter @ultraman/web lint && pnpm --filter @ultraman/web test && pnpm --filter @ultraman/web test:e2e`

## Key Files

| 文件 | 操作 | 描述 |
|---|---|---|
| `apps/web/src/domain/__tests__/tiles.randomness.test.ts` | Create | 随机布局多样性断言 |
| `apps/web/src/stores/__tests__/startGameLayout.test.ts` | Create | startGame 连续 3 次布局差异测 |
| `apps/web/src/stores/__tests__/crossSessionDedup.test.ts` | Create | hydrate 后 availCount 减少 |
| `apps/web/src/stores/__tests__/propertyRent.test.ts` | Create | property-rent 正确/错误路径 |
| `apps/web/src/stores/__tests__/propertyBonus.test.ts` | Create | property-bonus 正确/错误路径 |
| `apps/web/src/features/quiz/__tests__/SubjectSelector.rotationUI.test.tsx` | Create | 轮换 UI 行为 |
| `apps/web/src/stores/gameStore.ts` | Modify | + `resetCorrectBook` action |
| `apps/web/src/features/review/ReviewMode.tsx` | Modify | + 清除学习进度 按钮 + 确认弹窗 |
| `apps/web/src/features/review/__tests__/ReviewMode.reset.test.tsx` | Create | 按钮交互测 |

## Risks and Mitigation

| 风险 | 严重度 | 缓解 |
|---|---|---|
| 随机布局偶发 2 次序列巧合相同 → #1 测误报 | LOW | 用 10 个 seed 比 3 个更稳；容忍阈值设 `unique >= 8` |
| store 集成测依赖 fake-indexeddb 跨测污染 | LOW | 每个 test file 各自 `vi.mock('correctBookRepo.js')` 或 `beforeEach clear()`（已有模式） |
| 家长误触"清除学习进度" | MEDIUM | 确认弹窗（双步操作）+ 按钮放 ReviewMode 底部而非 MainMenu |
| `resetCorrectBook` 在 `screen !== 'menu'` 时被调用 → 与当前局 state 冲突 | LOW | 仅 ReviewMode 暴露；ReviewMode 只从 MainMenu 进入；不会与 game 状态并存 |
| Codex 倾向把重置入口放 hidden debug 页（心智差异） | LOW | v1 先走 ReviewMode 底部（用户可见可达）；若误触数据显示问题，再迁移到 ?debug=1 |

## Test Strategy

| Test Type | Scope | Verification |
|---|---|---|
| 单测（domain） | `createBoardTiles` 多样性 | 10 seed 下 unique 序列 ≥ 8 |
| 集成（store） | startGame、property-rent、property-bonus、cross-session dedup | 每条分支独立 it 断言金额/streak/correctIds/rentNotice |
| 组件（RTL） | SubjectSelector 轮换 UI、ReviewMode 重置按钮 | disabled + hint + dialog + spy call |
| repo | `correctBookRepo.clearCorrectForChild` | 已有测覆盖 |
| 回归 | 现有 128 unit + 7 E2E | 全保持绿 |

## Execution Model Routing

- 所有新测（store 集成 + RTL）：**Claude 直接写**（模板化、与现有测一致）
- `resetCorrectBook` + ReviewMode 按钮：**Claude 直接写**（< 60 行）
- Codex reviewer 在 Phase 5 审计（尤其确认弹窗不会在网络慢时双击触发两次 action）

## SESSION_ID

- `CODEX_SESSION: codex-1776583101-33031`

---

**Plan generated and saved to `.claude/plan/v4-verification-automation.md`**

**Please review the plan above. You can:**
- **Modify plan**: Tell me what needs adjustment, I'll update the plan
- **Execute plan**: Copy the following command to a new session

```
/ecc:multi-execute .claude/plan/v4-verification-automation.md
```
