# 一年级下册题库扩充设计

**目标**

将当前题库从仅有 `week-01` 扩充到 `week-10`，面向苏教版一年级下册的低年级练习场景，保持现有前端与共享 schema 不变。

**范围**

- 新增 `apps/web/public/question-packs/week-02.json` 到 `week-10.json`
- 更新 `apps/web/public/question-packs/index.json`
- 每周固定 `55` 题
- 学科配比固定为 `数学 20 / 语文 20 / 英语 15`
- 继续使用现有四种题型：`choice`、`input`、`image-choice`、`ordering`
- 继续沿用现有 Boss 周映射与 `week` 编号，不改业务代码

**知识点编排**

- `week-02`：20 以内退位减法 / `z c s` 与常用识字 / school things
- `week-03`：100 以内数的认识 / `zh ch sh r` 与词语理解 / family
- `week-04`：整十数与数位 / 偏旁与反义词 / colors
- `week-05`：100 以内不进位加法 / 量词与句式 / animals
- `week-06`：100 以内不退位减法 / 同音字与阅读理解 / food
- `week-07`：100 以内进位加法 / 词语搭配与句子排序 / body parts
- `week-08`：100 以内退位减法 / 标点与看图说话 / daily actions
- `week-09`：人民币与简单应用 / 近义反义与短文判断 / weather and clothes
- `week-10`：综合复习 / 字词句综合 / review

**难度控制**

- 难度 `1` 约占 `60%`
- 难度 `2` 约占 `30%`
- 难度 `3` 约占 `10%`
- 英语输入题仅使用单词或固定短语，避免自由表达
- 语文输入题尽量控制为单字、词语、数字或固定答案，减少判题歧义

**数据约束**

- 题目 id 延续 `<学科首字母>-w<周号两位>-<序号三位>`
- `choice` 和 `image-choice` 的 `answer` 必须出现在 `options`
- `ordering.answer` 必须等于 `correctOrder.join(',')`
- 每周标题包含周次、三科主知识点与题量说明

**验证方式**

- 用 `QuestionPackSchema` 和 `QuestionPackIndexSchema` 校验全部题包
- 抽查每周的题量、题型覆盖、Boss 信息与文件路径
- 不新增资源文件，不修改现有判题和倒计时逻辑
