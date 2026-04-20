# 脑筋急转弯独立题库设计

**目标**

将现有项目中的 `brain` 题从周题库中彻底解耦，改为一份与 `week` 无关的独立题库，并将脑筋急转弯总量扩展为 `100` 题，继续通过现有随机出题系统在游戏中抽取。

**问题背景**

当前项目里的 `brain` 题原本曾挂在 `week-01.json` 中，这会带来两个问题：

- 与“教材进度包”混在一起，污染周题库语义
- 后续扩容脑筋急转弯时，不得不反复改动 `week-01`

用户要求脑筋急转弯题库与 `week` 无关，但仍沿用现在的游戏答题入口，不做独立玩法。

**范围**

- 新增独立脑筋急转弯题库文件
- 调整题库加载逻辑，让 `subject: "brain"` 从独立题库抽题
- 新增脑筋急转弯题库专项测试
- 保持 `week-01` 为当前教材进度包，不再包含任何 `brain` 题

**非目标**

- 不新增独立入口或新玩法
- 不改 `SubjectSchema`、`SubjectSelector`、`QuizModal` 的 `brain` 学科存在性
- 不把脑筋急转弯拆成多个子题库
- 不调整数学、语文、英语题库结构

**方案选择**

采用“独立 brain pack + 现有随机系统特例加载”的方案。

不采用继续挂在 `week-01` 的方案，因为那会继续把独立题库和教材题库耦合在一起，违背“与 week 无关”的要求。

**数据结构**

- 在 `apps/web/public/question-packs/` 下新增独立文件：
  - 建议命名：`brain-pack.json`
- 该文件语义上不带 `week` 依赖，但结构上继续复用现有 `QuestionPackSchema`
- 该文件只包含 `subject: "brain"` 的题目
- 总题量固定为 `100`

说明：

- 由于当前共享 schema 要求 `week` 取值在 `1-18`，独立 `brain-pack.json` 里的 `week` 字段使用一个合法占位值即可
- 该占位值不参与正常周次选择，也不表示它属于某一周

**题型与内容约束**

- 仅允许两种题型：
  - `choice`
  - `input`
- 所有题目 `subject` 固定为 `brain`
- 题目主题至少覆盖以下类别：
  - `谐音`
  - `字词`
  - `逻辑`
  - `数字`
  - `生活反差`
  - `观察/常识陷阱`

质量规则：

- 题干必须唯一
- `choice.answer` 必须存在于 `options`
- `choice.options` 不允许重复
- `input` 题只允许唯一答案
- 不使用开放式主观题

**加载与出题逻辑**

- `math / chinese / english` 继续从当前 `week` 对应题包抽题
- `brain` 改为从新的 `brain-pack.json` 抽题
- `brain` 不再依赖当前周次
- 继续复用现有随机出题和“答对不再出现、答错可重复”的本局逻辑

**文件影响**

预计修改或新增以下文件：

- 新增：`apps/web/public/question-packs/brain-pack.json`
- 修改：`apps/web/src/data/packs/questionPackLoader.ts` 或当前实际题库加载文件
- 修改：`apps/web/src/stores/gameStore.ts` 中涉及题库装载的部分（如需要）
- 修改：`apps/web/src/domain/__tests__/questionPicker.test.ts`
- 新增：`apps/web/src/data/__tests__/brainPack.test.ts`

说明：

- 具体加载入口以当前代码实际实现为准，但目标是不再要求 `brain` 出现在任意 `week-xx.json` 中

**验证**

- `brain-pack.json` 可通过现有题目 schema 校验
- `brain-pack` 专项测试验证：
  - 恰好 `100` 题
  - 全部为 `brain`
  - 仅 `choice/input`
  - 题干唯一
  - `choice` 题答案与选项合法
- `week-01.json` 继续保持 `95` 题，且不含 `brain`
- 运行：
  - `pnpm --filter @ultraman/web run test`
  - `pnpm --filter @ultraman/web run build`
