# 本局题目重复规则设计

**目标**

调整本局游戏内的出题规则：

- 答对的题目，本局后续不再出现
- 答错或超时的题目，本局后续仍可再次出现

**范围**

- 修改 `apps/web/src/domain/questionPicker.ts`
- 修改 `apps/web/src/stores/gameStore.ts`
- 新增或修改相关单元测试
- 只影响本局游戏内存态

**非目标**

- 不修改题库 JSON
- 不修改错题本数据结构和落库逻辑
- 不做跨局持久化
- 不调整题目权重，不额外提高错题出现概率

**现状**

当前 `gameStore` 维护的是按学科记录的 `askedQuestionIds`。

现有行为：

- 某题一旦出过，就先加入排除集合
- 当前学科题池被排空后，再整体放回重新抽

这会导致：

- 答错题也会在一段时间内被排除
- 规则是“出过先不出”，不是“答对不再出”

**新规则**

- 对每个学科，只记录 `answeredCorrectIds`
- 抽题时只排除 `answeredCorrectIds`
- 答对：
  - 把当前题 id 加入对应学科的 `answeredCorrectIds`
- 答错：
  - 不加入排除集合
- 超时：
  - 不加入排除集合
- 求助答对：
  - 视为答对，加入排除集合

**边界行为**

- 如果某学科所有题都答对过，则该学科不再有可抽题目
- 此时沿用当前“无题可出”的处理方式，不额外引入兜底逻辑

**验证**

- `pickRandomQuestion` 相关测试继续通过
- 新增/修改 store 侧测试，覆盖：
  - 答对题不会再次被抽到
  - 答错题仍可能再次被抽到
  - 全部答对后无法继续抽到该学科题目
- 运行 `pnpm --filter @ultraman/web run test`
- 运行 `pnpm --filter @ultraman/web run build`
