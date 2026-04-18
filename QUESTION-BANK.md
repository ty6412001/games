# 题库维护指南

游戏题库按 **周** 组织，位于 `apps/web/public/question-packs/`。MVP 打包了第 1 周 18 题，其余 2-18 周留给家长或 Codex 批量生成。

## 目录结构

```
apps/web/public/question-packs/
├── index.json           # 周索引
├── week-01.json
├── week-02.json
└── ...
```

## 索引文件 `index.json`

```json
{
  "packs": [
    { "week": 1, "title": "第1周 · ...", "path": "/question-packs/week-01.json" },
    { "week": 2, "title": "第2周 · ...", "path": "/question-packs/week-02.json" }
  ]
}
```

添加新周时同步在 `index.json` 追加一条。

## 周题包 `week-XX.json`

```json
{
  "week": 1,
  "title": "第1周 · 简要说明",
  "boss": {
    "id": "zetton",       // 对应 apps/web/src/theme/ultraman/monsters.ts 的 id
    "name": "杰顿",
    "hp": 3000
  },
  "questions": [...]      // 至少 1 题，推荐 55 题（数 20 / 语 20 / 英 15）
}
```

## 单题格式

共 4 种题型，覆盖 MVP 场景：

### 选择题 `choice`

```json
{
  "id": "m-w01-001",
  "subject": "math",       // math | chinese | english
  "difficulty": 1,         // 1 | 2 | 3
  "topic": "20以内加法",
  "type": "choice",
  "stem": "8 + 5 = ?",
  "options": ["12", "13", "14", "15"],
  "answer": "13",
  "reward": { "correct": 80, "wrong": -40 }   // 可选，缺省按难度推算
}
```

`answer` 必须出现在 `options` 数组中（Zod 校验会拦截）。

### 输入题 `input`

```json
{
  "id": "m-w01-004",
  "subject": "math",
  "difficulty": 2,
  "topic": "20以内减法",
  "type": "input",
  "stem": "18 - 9 = ?",
  "answer": "9"
}
```

玩家输入的字符串会 `.trim()` 后和 `answer` 比较。

### 看图选择 `image-choice`

```json
{
  "id": "c-w02-010",
  "subject": "chinese",
  "difficulty": 1,
  "topic": "拼音识图",
  "type": "image-choice",
  "stem": "听音选图",
  "stemImage": "/assets/quiz/bee.png",
  "options": ["b", "p", "m", "f"],
  "answer": "b"
}
```

### 排序题 `ordering`

```json
{
  "id": "c-w01-004",
  "subject": "chinese",
  "difficulty": 2,
  "topic": "拼音顺序",
  "type": "ordering",
  "stem": "把声母按 b p m f 排好",
  "items": ["p", "m", "b", "f"],
  "correctOrder": [2, 0, 1, 3],
  "answer": "2,0,1,3"
}
```

- `items`：可乱序呈现
- `correctOrder`：items 的正确下标顺序（`correctOrder.length === items.length`，且元素唯一）
- `answer`：与 `correctOrder.join(',')` 一致

## 命名约定

- 单题 id：`<学科首字母>-w<周号两位>-<序号三位>`，例如 `m-w01-001` / `c-w03-015` / `e-w07-008`
- 题包文件：`week-XX.json`（两位数字补零）

## 难度与倒计时

倒计时由代码根据难度自动计算（见 `domain/questionPicker.ts`）：

| 难度 | 选择题 | 输入/排序 |
|---|---|---|
| 1 (★) | 20 秒 | 30 秒 |
| 2 (★★) | 35 秒 | 50 秒 |
| 3 (★★★) | 50 秒 | 70 秒 |

## 校验

代码会在加载时走 Zod schema 校验。本地跑：

```bash
pnpm --filter @ultraman/shared run test
```

## 使用 Codex 批量生成剩余 17 周

建议工作流：

1. 先写好每周知识点大纲（苏教版一下教材目录）
2. 让 Codex 按一个周 55 题的规模批量生成 JSON
3. 生成后用浏览器开 "每日复习" 或直接人工抽查 5-10 题
4. 按命名规则放进 `public/question-packs/week-XX.json`，同步 `index.json`
5. `pnpm --filter @ultraman/web run build` → 重新部署

## 自制题（家长临时补）

第一版不做管理后台。推荐直接修改 JSON 文件然后 `pnpm --filter @ultraman/web run build`。

后端表 `custom_question` 已建好，v1.1 会加 "题库管理" 页面做 CRUD。
