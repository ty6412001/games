# UI 调整计划 v4 · 学科选择 + 满屏布局 + 奥特曼大图 + 题库扩充多样化

**迭代于**：`.claude/plan/ui-adjustments-v3.md`
**v4 新增**：头像放大易识别 · 题量扩充至 45+ · 题型多样（填空/图像/排序/选择）
**Execution target**：`/ecc:multi-execute`

---

## 0 · 改动概述（v4 汇总）

| 项 | 类型 |
|---|---|
| ① 答题前选择学科（语文/数学/英语） | store 状态机 + 新 UI |
| ② 一屏满屏（3 列 grid，左右不留空） | 布局重构 |
| ③ 奥特曼 SVG 资源重制 + **放大易识别** | SVG 艺术 + 尺寸系统调整 |
| ④ **题库扩充 + 题型多样化** | JSON 内容 + 小 SVG 资源 |

---

## 1 · v4 新增要点

### 1.1 图像放大易识别

**现状**：HeroAvatar 默认 sm=32 / md=48 / lg=72 / xl=128 px。在棋盘小圆点和左栏 spotlight 里偏小，辨识不佳。

**新方案**：
```ts
// theme/ultraman/HeroAvatar.tsx
const SIZE_PX: Record<HeroAvatarSize, number> = {
  sm: 48,    // 棋盘玩家 token、排行榜
  md: 80,    // 玩家卡片、怪兽对战头像
  lg: 144,   // 英雄选择大按钮
  xl: 224,   // CurrentPlayerSpotlight 主视觉
};
```

**SVG 本体放大**：
- viewBox 从 `0 0 128 128` → `0 0 256 256`（4× 像素细节余量）
- 绘制更完整的身体：**头 + 躯干 + 手臂 + 腿**（当前只画头）
- Signature 元素明显粗壮化：V 冠 / Sluggers / 獠牙 / 盔甲线条
- 胸口计时器 **大而亮**，为游戏风格主视觉锚点
- 色彩对比增强：银灰主色 + 英雄专属亮色（迪迦紫 / 赛罗红蓝 / 德凯绿 / 贝利亚金）

**HeroSelect 卡片内**：从 `size="sm"` 改 `size="md"`（每英雄按钮 80×80），头像顶住按钮主视觉。

**Board 棋盘玩家 token**：保持小圆点（20px 方形），真图太小看不清，继续用色块+首字母 —— 仅**侧栏和 Boss 战**用大图。

### 1.2 题库扩充 + 题型多样化

**现状**：week-01.json 仅 18 题，全部 `choice` + 1 `input` + 1 `ordering`。类型单一。

**目标**：week-01.json 扩至 **50 题**（数学 20 + 语文 18 + 英语 12），类型分布：

| 类型 | 占比 | 数量 | 用法 |
|---|---|---|---|
| `choice` | 40% | 20 | 选择题（传统） |
| `input` | 30% | 15 | 填空（数学算式 / 单字 / 英语单词） |
| `image-choice` | 20% | 10 | 看图选（数苹果 / 识拼音 / 认形状 / 英语实物对应） |
| `ordering` | 10% | 5 | 排序（拼音 / 数字大小 / 英语字母） |

**详细题型示例**：

**数学**（20 题，主要新增）：
- 20 以内加减法选择（5 题，choice）
- 填空（5 题，input）：`9 + ? = 15` / `12 - ? = 7` / `3 + 4 + 5 = ?`
- 看图数数（4 题，image-choice）：🍎🍎🍎🍎🍎🍎🍎 数苹果 / 数星星 / 数方块
- 认图形（3 题，image-choice）：○△□ 选三角形 / 认识圆形
- 数字大小排序（2 题，ordering）：`[5, 2, 8, 3]` 从小到大
- 钟表认读（1 题，image-choice）：SVG 时钟指向 3:30

**语文**（18 题）：
- 声母选择（4 题，choice）
- 韵母填空（3 题，input）：`b_` 填入"a" 读 bā
- 看图拼音（3 题，image-choice）：🐝 蜜蜂 / 🐴 马 / 🌻 向日葵
- 识字选择（3 题，choice）
- 拼音排序（2 题，ordering）：b p m f 顺序
- 笔顺（2 题，image-choice）：看"十"字笔顺图选正确步骤
- 组词（1 题，input）：`"妈"` 组一个词语

**英语**（12 题）：
- Vocabulary choice（4 题）
- Fill-in-blank（3 题，input）：`My n___ is Tom. → name`
- Image matching（3 题，image-choice）：🍎 选 apple / 🐶 选 dog
- Letter ordering（2 题，ordering）：`a-b-c-d` 正确顺序

### 1.3 新增 quiz 图片资源

**位置**：`apps/web/public/assets/quiz/`

需要 **12 个小 SVG**（viewBox 统一 `0 0 120 120`，透明底）：
- `apples-7.svg`（7 个苹果）
- `apples-5.svg`
- `stars-4.svg`
- `circle-triangle-square.svg`（3 种形状并排）
- `clock-3-30.svg`（简易钟表指向 3:30）
- `bee.svg`（蜜蜂侧视）
- `horse.svg`（马剪影）
- `sunflower.svg`（向日葵）
- `ten-strokes.svg`（"十"字笔顺分解）
- `apple-illustration.svg`（苹果，用于英语 apple 匹配）
- `dog-illustration.svg`
- `bus-illustration.svg`（用于 bus/car 英语题）

每个 40-80 行 SVG，组件用 `<img src="/assets/quiz/xx.svg" />` 引用，已支持。

### 1.4 题库扩展后的 edge case

- **学科配额**：SubjectSelector 读 `pack.questions.filter(q => q.subject === subj).length` 显示数量，现在数学 20 / 语文 18 / 英语 12，都够抽
- **Zod schema**：4 类题型已在 v2 schema 中定义，无需修改
- **倒计时仍关闭**（features.quizTimer = false），新增 input/ordering 题型不会因慢输入被扣分

---

## 2 · 改动整合（v3 基础上叠加 v4）

### A 组 · 答题前学科选择（沿用 v3）

不变。参见 v3 § 2.1。

### B 组 · 一屏满屏布局（沿用 v3，内含 xl 头像）

不变，但 **CurrentPlayerSpotlight** 现使用 `HeroAvatar size="xl"`（新尺寸 224px），在左栏视觉占比大幅提升。

### C 组 · 奥特曼 SVG 重制（v4 加强版）

- viewBox `0 0 256 256` + 完整身体
- HeroAvatar SIZE_PX 扩大（48/80/144/224）
- 每英雄 150-220 行 SVG（原 80-140 太简化）
- 怪兽 SVG 同样 viewBox `0 0 256 256`，全身绘制

### D 组 · 题库扩充（v4 新增）

| # | 步骤 | 执行者 |
|---|---|---|
| D1 | 设计 week-01 题库骨架：50 题 id 规划 + 类型分布 + 知识点覆盖 | Claude |
| D2 | 生成 12 个小 quiz SVG 图（apples / shapes / animals / clock） | Codex 批量 × 2 |
| D3 | Codex 生成 50 题 JSON（苏教版一下第 1 周知识点）| Codex |
| D4 | Claude 抽检 + Zod 校验 + 数学题答案自验 | Claude |
| D5 | 替换 `week-01.json` | Claude |
| D6 | 新增单测：`pack.questions.length >= 50` / 各学科最小配额 / image-choice 题 stemImage 字段存在 | Claude |
| D7 | E2E：答题流程跑过 input / image-choice / ordering 三种新题型 | Claude |

---

## 3 · 总 Implementation Steps（v4 版）

**执行顺序**：A → B → C → D，每组完成跑 CI 再进下一组。

### A 组 · 学科选择（9 步）
v3 A1-A9，不变。

### B 组 · 满屏布局（7 步）
v3 B1-B7，不变。

### C 组 · 奥特曼 SVG 资源（放大版，v4 调整）

| # | 步骤 | 执行者 |
|---|---|---|
| C0 | 更新 `HeroAvatar.tsx` SIZE_PX 为 48/80/144/224 | Claude |
| C1 | 产出 4 个英雄 SVG（viewBox 256×256 + 完整身体 + 粗线 signature） | Codex × 4 调用 |
| C2 | 产出 5 个怪兽 archetype 模板（龙/虫/飞/犄角/人型） | Codex × 2 |
| C3 | 批量生成 18 个怪兽 SVG | Codex × 3（每次 6 只） |
| C4 | 本地渲染校验：sm=48 / md=80 / lg=144 / xl=224 都清晰 | Claude 手工验证 |
| C5 | 若某尺寸不清，返工该 SVG | Claude |
| C6 | 更新 README 说明 | Claude |

### D 组 · 题库扩充（v4 新增 7 步）

| # | 步骤 | 执行者 |
|---|---|---|
| D1 | Claude 设计 50 题 id 分布表（m-w01-001..020 / c-w01-001..018 / e-w01-001..012） | Claude |
| D2 | Codex 生成 12 个 quiz SVG（apples-7 / shapes / clock / bee / 等） | Codex × 2 |
| D3 | Codex 分 3 批生成：数学 20 题 / 语文 18 题 / 英语 12 题（按 Zod schema） | Codex × 3 |
| D4 | Claude Zod 校验 + 数学答案自验（eval 或手算抽检） | Claude |
| D5 | 替换 `week-01.json` + 更新 `index.json`（title 反映新题量） | Claude |
| D6 | 单测：`pack.questions.length >= 50` / subject 配额 / image-choice 题有 stemImage | Claude |
| D7 | E2E：跑过 input / image-choice / ordering 三种题型 | Claude |

### 总任务量估算

- **Claude 关键节点**：~15 次（状态机 / 布局 / 校对 / 测试）
- **Codex 调度**：~20 次（2 UI + 4 英雄 + 5 archetype + 3 怪兽批 + 2 quiz 图 + 3 题库批 + 1 终审）
- **总耗时**：6-8 小时编码 + 3-4 小时 SVG 产出 + 1 小时 QA

---

## 4 · Key Files（v4）

v3 所有 + v4 新增：

| File | Operation | 说明 |
|---|---|---|
| `apps/web/src/theme/ultraman/HeroAvatar.tsx` | MODIFY | SIZE_PX 扩大到 48/80/144/224 |
| `apps/web/public/assets/heroes/tiga.svg` | REWRITE | 256×256 全身奥特曼 |
| `apps/web/public/assets/heroes/zero.svg` | REWRITE | 同上 |
| `apps/web/public/assets/heroes/decker.svg` | REWRITE | 同上 |
| `apps/web/public/assets/heroes/belial.svg` | REWRITE | 同上 |
| `apps/web/public/assets/monsters/*.svg` | NEW × 18 | 256×256 全身 |
| `apps/web/public/assets/quiz/apples-7.svg` | NEW | 数数图 |
| `apps/web/public/assets/quiz/apples-5.svg` | NEW | |
| `apps/web/public/assets/quiz/stars-4.svg` | NEW | |
| `apps/web/public/assets/quiz/shapes.svg` | NEW | 圆/三角/方 |
| `apps/web/public/assets/quiz/clock-3-30.svg` | NEW | 钟表认读 |
| `apps/web/public/assets/quiz/bee.svg` | NEW | 识拼音 |
| `apps/web/public/assets/quiz/horse.svg` | NEW | |
| `apps/web/public/assets/quiz/sunflower.svg` | NEW | |
| `apps/web/public/assets/quiz/ten-strokes.svg` | NEW | 笔顺 |
| `apps/web/public/assets/quiz/apple.svg` | NEW | 英语 apple |
| `apps/web/public/assets/quiz/dog.svg` | NEW | |
| `apps/web/public/assets/quiz/bus.svg` | NEW | |
| `apps/web/public/question-packs/week-01.json` | REWRITE | 50 题 × 4 种类型 |
| `apps/web/src/domain/__tests__/questionPicker.test.ts` | MODIFY | 加 subject-scoped + 题量断言 |

---

## 5 · Risks and Mitigation（v4 更新）

| 风险 | 严重 | 缓解 |
|---|---|---|
| askedQuestionIds 结构迁移破坏测试 | HIGH | 同步改测 |
| Subject reshuffle 跨学科污染 | HIGH | `pickQuestionForSubject` 只清目标学科 |
| 大 SVG 在 sm (48px) 仍不清 | MEDIUM | 每 SVG 产出后 4 档尺寸目测；signature 元素用 `stroke-width >= 4` 粗线 |
| 18 只怪兽 SVG 工作量 | MEDIUM | archetype 复用 + Codex 批量 |
| 题库扩到 50 题后图片链接缺失 | MEDIUM | D4 Zod 校验 + 抽检 stemImage 链接存在；失败降级为 choice 题不含图 |
| 数学 input 题答案格式歧义（"6" vs "6.0"） | LOW | isAnswerCorrect 已 trim，明确只允许整数字面量 |
| 英语 input 大小写不敏感 | LOW | isAnswerCorrect 改为 `.toLowerCase().trim()` 比较（专项修复） |

---

## 6 · Test Strategy（v4 更新）

| Type | Scope |
|---|---|
| Unit | 所有 v3 内容 |
| Unit | `week-01.json` 50 题 + 4 类型覆盖 |
| Unit | image-choice 题 stemImage 字段非空 |
| Unit | `isAnswerCorrect` 大小写不敏感（新加） |
| Unit | 数学算式题 `eval(stem) === answer` 自验脚本 |
| E2E | 跑过 input / image-choice / ordering 三种题 |
| Visual | 4 英雄 SVG + 18 怪兽 SVG + 12 quiz SVG 小尺寸可辨 |

---

## 7 · Execution Model Routing（v4）

| 任务 | 执行者 |
|---|---|
| 状态机 / store 变更 | Claude 直写 |
| SubjectSelector / CurrentPlayerSpotlight / Leaderboard | Codex → Claude 审 |
| 英雄 SVG × 4（大图，含全身） | Codex × 4 调用 |
| 怪兽 SVG × 18（archetype + 批量） | Codex × 3-5 调用 |
| Quiz 图 SVG × 12 | Codex × 2 批量 |
| 题库 JSON × 50 | Codex × 3 批量（按学科分批）|
| 测试 | Claude 直写 |
| 终审 | Codex resume session |

---

## 8 · 默认答案（无异议即采用）

| Q | 默认 |
|---|---|
| HeroAvatar 新 SIZE_PX | 48 / 80 / 144 / 224 |
| SVG viewBox | `0 0 256 256` |
| 每英雄 SVG 行数 | 150-220 |
| 题量 | 50（M20 / C18 / E12） |
| image-choice 占比 | ~20%（10 题） |
| Quiz 图 viewBox | `0 0 120 120` |
| 英语答案大小写 | 不敏感 |

---

## 9 · SESSION_ID

- CODEX_SESSION: `codex-1776555975-66166`

---

**总预计**：8-10 小时连续执行（4 组合计 28+ 步），Codex 调度 ~20 次。最大投入在 C/D 两组（艺术 + 内容）。
