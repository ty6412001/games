# 奥特曼亲子大富翁 · multi-execute 实施计划

**Spec**：`docs/superpowers/specs/2026-04-18-ultraman-monopoly-design.md`
**执行方式**：`/ecc:multi-execute`（Codex GPT-5.4 主生成 + Claude Opus 审校/设计）
**总里程碑**：M0 → M6，共 7 阶段
**并行度**：同阶段内尽可能并行；阶段间严格串行
**预计**：Codex 调度 ~50 次 + Claude 审校/设计 ~20 次

---

## 执行者分工原则

| 执行者 | 负责 |
|---|---|
| **Claude Opus 4.7** | 架构决策、接口/类型设计、测试用例设计（TDD RED）、Codex 产出审查（安全/边界/命名）、冲突合并、集成、单元/E2E 验证判断 |
| **Codex GPT-5.4** | 实现代码（TDD GREEN）、样板代码、组件渲染、CSS/Tailwind、CRUD 路由、题目批量生成、部署脚本 |
| **Codex-mini (gpt-4.1-mini)** | < 50 行的简单脚本、配置文件、单文件重构 |

**派发规则**：> 30 行实现代码 → Codex；接口与测试用例 → Claude 设计后 Codex 实现；< 30 行微调 → Claude 直写。

---

## 任务命名规则

- `M<阶段>.<序号>` 如 `M1.3`
- 同阶段内相同字母后缀（`M1.3a/b/c`）表示可**并行**
- 无字母后缀表示**串行依赖上一任务**

---

## M0 · 地基（1-2 天，强串行）

所有下游任务依赖 M0 完成。

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M0.1 | **Claude** | 决策并编写 `pnpm-workspace.yaml`、根 `package.json`、`tsconfig.base.json` | Spec §3.3-3.4 | 根目录脚手架，3 个 workspace：`apps/web`、`apps/server`、`packages/shared` | `pnpm install` 无错误 |
| M0.2a | **Codex** | 生成 `apps/web` Vite+React+TS+Tailwind+Zustand 骨架 | Spec §3.3，M0.1 的 tsconfig | 可 `pnpm --filter web dev` 启动空白页 | 浏览器打开 localhost 显示 "Hello" |
| M0.2b | **Codex** | 生成 `apps/server` Express+better-sqlite3+TS 骨架 + healthz | Spec §9.3 | 可 `pnpm --filter server dev` 返回 `GET /healthz → 200 OK` | curl 返回 200 |
| M0.2c | **Codex** | 生成 `packages/shared` TS 类型包骨架 | Spec §9.1 | 导出空的 `index.ts`，`pnpm -r build` 通过 | `pnpm -r typecheck` 通过 |
| M0.3 | **Claude** | 设计并写入 `packages/shared/src/schemas.ts`：Zod schemas（Player/GameState/Question/WrongBookEntry/Weapon/BossBattleState） | Spec §9.1 + §5.1 | 完整 Zod schema + 对应 TS 类型 | 单测：合法数据通过，非法数据拒绝 |
| M0.4 | **Codex** | 生成 CI 配置：`.github/workflows/ci.yml` + 根脚本 `lint` `typecheck` `test` `build` `test:e2e` | Spec §11.5 | workflow 文件 + 根 package.json scripts | 本地 `pnpm run ci` 通过 |
| M0.5 | **Claude** | 审查 M0.2-M0.4 产出：包结构、命名、依赖版本、安全（无硬编码密钥） | M0.1-M0.4 输出 | review 记录 + 必要修正 PR | 所有检查项绿 |

**并行组**：M0.2a / M0.2b / M0.2c 可 3 路并行；M0.3 / M0.4 串行于 M0.2* 之后。

---

## M1 · 棋盘可走（3-4 天）

领域层先行（Claude 设计测试 → Codex 实现），UI 并行。

### 领域层（TDD：Claude 写测试 → Codex 实现）

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M1.1 | **Claude** | 写 `apps/web/src/domain/__tests__/turnEngine.test.ts`（骰子、走格、落地事件分发） | Spec §4.2 §4.4 | Vitest 测试用例 ≥ 15 条 | 测试文件完成，全部红灯 |
| M1.2 | **Codex** | 实现 `apps/web/src/domain/turnEngine.ts` 满足 M1.1 测试 | M1.1 测试文件 | `turnEngine.ts` | M1.1 测试全绿 |
| M1.3 | **Claude** | 写 `economy.test.ts`（买地、租金、破产判定、街区倍数） | Spec §4.3 §10 | 测试 ≥ 20 条 | 全部红灯 |
| M1.4 | **Codex** | 实现 `economy.ts` | M1.3 | `economy.ts` | M1.3 测试全绿 |
| M1.5 | **Claude** | 写 `boardRules.test.ts`（28 格布局生成、街区聚合） | Spec §4.2 §4.3 | 测试 ≥ 10 条 | 全部红灯 |
| M1.6 | **Codex** | 实现 `boardRules.ts`（`getTiles()`, `isDistrictFull()`） | M1.5 | `boardRules.ts` | 测试全绿 |

**并行组**：(M1.1→M1.2) / (M1.3→M1.4) / (M1.5→M1.6) 三对可 3 路并行。

### UI 层 & Store

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M1.7 | **Codex** | `stores/gameStore.ts`（Zustand：状态 + actions 调领域函数） | M1.2/M1.4/M1.6 | gameStore + 单测 | 单测 ≥ 10 条通过 |
| M1.8 | **Codex** | `features/board/Board.tsx` 渲染 28 格棋盘（CSS Grid 方口字型布局） | Spec §4.2 | Board 组件 + Storybook 或 Playwright 快照 | 横屏 iPad 尺寸渲染正常 |
| M1.9 | **Codex** | `features/players/PlayerPanel.tsx`（头像占位 + 金币 + 位置 + 当前回合高亮） | Spec §2 §4.5 | PlayerPanel 组件 | 静态快照测试通过 |
| M1.10 | **Codex** | `features/players/HeroSelect.tsx`（2-5 人选择 + 4 英雄占位 + 5 人允许重名色号） | Spec §7.1 | HeroSelect 组件 | 单测：5 人选角时允许重复英雄（带 #1/#2 标识） |
| M1.11 | **Codex** | `features/board/Dice.tsx`（掷骰动画 + 孩子重甩按钮） | Spec §4.4 §4.5 | Dice 组件 | 动画 1 秒内完成，生成 1-6 |
| M1.12 | **Claude** | 审查 M1.7-M1.11：UI 组件是否严格消费 store、无直接 mutate、iPad Safari CSS 兼容 | M1.7-M1.11 | review + 修正 | 无 critical 问题 |
| M1.13 | **Claude** | 写 Playwright E2E：`tests/e2e/m1-walkable.spec.ts`（选 3 人开局 → 骰子 → 走格 → 领工资） | 全部 M1 | 1 个 E2E 文件 | E2E 绿灯，跑时间 < 30s |

**并行组**：M1.8 / M1.9 / M1.10 / M1.11 可 4 路并行（都在 M1.7 之后）。

---

## M2 · 答题接入（3-4 天）

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M2.1 | **Claude** | 写 `questionPicker.test.ts`（按周/学科/难度抽题 + 错题本优先 + 去重） | Spec §5 §6 | 测试 ≥ 15 条 | 全部红灯 |
| M2.2 | **Codex** | 实现 `questionPicker.ts` | M2.1 | picker 模块 | 测试全绿 |
| M2.3a | **Codex** | `data/packs/questionPackLoader.ts`（fetch + Zod 校验 + IndexedDB 缓存） | Spec §5.1 §9.2 | loader | 单测：非法 JSON 被拒 |
| M2.3b | **Codex** | `data/repo/wrongBookRepo.ts`（Dexie CRUD + 去重更新 wrongCount） | Spec §6 §9.2 | repo | 单测 ≥ 10 条通过 |
| M2.4 | **Codex** | `features/quiz/QuizModal.tsx` 4 种题型（choice/input/image-choice/ordering） | Spec §5.2 §5.4 | 4 个子组件 + 父组件 | 视觉快照测试通过 |
| M2.5 | **Codex** | `features/quiz/CountdownBar.tsx`（按难度 3 档颜色 + 最后 5s 闪烁） | Spec §5.3 | 倒计时组件 | 单测：难度 1 = 20s，到点触发 onTimeout |
| M2.6 | **Codex** | `stores/quizStore.ts`（当前题、倒计时、答题状态机、求助卡） | Spec §5.4 | quizStore + 单测 | 状态机测试覆盖正确/错误/超时/求助 4 分支 |
| M2.7 | **Codex** | 占位题包：`apps/web/public/question-packs/week-01.json`（手写 10 题，3 学科） | Spec §5.1 | JSON 文件 | 通过 Zod 校验 |
| M2.8 | **Codex** | 集成：学习格 / 买地格 / 机会卡格 落地时触发 QuizModal；答对扣加金币；答错写错题本 | M1 + M2.1-M2.7 | 集成代码 | 手动点击流程无报错 |
| M2.9 | **Claude** | 审查 M2.2-M2.8：倒计时与求助卡的暂停恢复逻辑、错题本重复写入时的 count++ 正确性、题包校验失败的降级 | M2.* | review + 修正 | 所有边界分支覆盖 |
| M2.10 | **Claude** | E2E：答对/答错/超时/求助 4 路径跑通 | 全部 M2 | `m2-quiz.spec.ts` | E2E 全绿 |

**并行组**：M2.1→M2.2 / M2.3a / M2.3b / M2.4 / M2.5 / M2.6 可在 M1 完成后 **6 路并行**；M2.7 可同时进行；M2.8 是整合点需串行。

---

## M3 · 奥特曼主题皮（2-3 天）

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M3.1 | **Claude** | 设计 `src/theme/ultraman/theme.config.ts` 接口（`getHeroAvatars / getMonsterForQuestion / renderBattleEffect`） | Spec §3.1 §7.2 | 接口定义 + 类型导出 | 类型通过 `tsc --noEmit` |
| M3.2a | **Codex** | `theme/ultraman/heroes/` 4 英雄占位 SVG + 配置（名字、色调） | Spec §7.1 | 4 SVG + `heroes.ts` | 4 个可引入 React |
| M3.2b | **Codex** | `theme/ultraman/monsters/` 18 周怪兽占位 SVG + 名字配置（杰顿、哥莫拉、雷德王…） | Spec §5.7 §8.3 | 18 SVG + `monsters.ts` | 每个带 id / name / hp |
| M3.2c | **Codex** | `theme/ultraman/weapons/` 8 件武器占位 SVG + 元数据（英雄、名字、稀有度） | Spec §7.3 | 8 SVG + `weapons.ts` | schema 合法 |
| M3.3 | **Codex** | `features/battle/BattleScene.tsx`：答题前怪兽登场、答对光线特效（CSS transform+opacity）、怪兽爆炸动画 | Spec §5.4 §7.2 | 组件 + CSS 动画 | iPad Safari 60fps |
| M3.4 | **Codex** | `features/players/WeaponCabinet.tsx`：武器收藏册（已解锁高亮 / 未解锁灰色剪影） | Spec §7.3 §7.4 | 组件 | 视觉快照通过 |
| M3.5 | **Codex** | `hooks/useSoundEffect.ts`（击中/胜利/失败 3 个占位音效，HTMLAudioElement） | Spec §12.1-M3 | hook + 3 个占位 MP3 | 播放无报错 |
| M3.6 | **Codex** | `public/assets/` 目录占位图 + `README.md` 写明"家长自行替换奥特曼真图"约定 | Spec §7.5 | 目录 + README | 文件名与 `heroes.ts/monsters.ts/weapons.ts` 对齐 |
| M3.7 | **Claude** | 审查：主题层对核心领域层零侵入、接口可插拔、占位图命名规则清晰 | M3.1-M3.6 | review | 领域层无 import theme/* |

**并行组**：M3.2a / M3.2b / M3.2c / M3.3 / M3.4 / M3.5 / M3.6 可在 M3.1 完成后 **7 路并行**。

---

## M4 · 战力结算 + Boss 战（3-4 天）

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M4.1 | **Claude** | 写 `bossBattle.test.ts`：战力公式、Boss HP 计算、回合出招伤害、胜利/失败判定 | Spec §8.1 §8.2 | 测试 ≥ 20 条 | 全部红灯 |
| M4.2 | **Codex** | 实现 `domain/bossBattle.ts` | M4.1 | 模块 | 测试全绿 |
| M4.3 | **Codex** | 实现 `domain/combatPower.ts`（金币/100 + 武器×500 + 复习率×2000 + 连击×100） | Spec §8.1 | 模块 + 单测 | 用例通过 |
| M4.4a | **Codex** | `features/settle/SettleScreen.tsx`：显示每人金币 → 战力转换动画 + 勋章 | Spec §8 | 组件 | 视觉快照 |
| M4.4b | **Codex** | `features/boss/BossBattleScene.tsx`：Boss 立绘 + 血条 + 回合制出招 UI | Spec §8.2 | 组件 | iPad 横屏布局正常 |
| M4.4c | **Codex** | `data/bossSchedule.ts`：18 周 Boss 排表静态数据（id/name/image/hp） | Spec §8.3 | TS 模块 | 18 条记录 schema 合法 |
| M4.5 | **Codex** | Boss 胜利/失败动画（CSS Keyframes）+ 周目徽章 + 错题本自动掌握 hook | Spec §8.2 | 动画 + 逻辑 | 胜利后错题对应题 isMastered=true |
| M4.6 | **Codex** | `stores/bossStore.ts`：Boss 战状态机（waiting / attacking / answering / settling） | Spec §8.2 | store + 单测 | 状态迁移测试通过 |
| M4.7 | **Codex** | 接主流程：大富翁结束 → 自动进 SettleScreen → 自动进 BossBattleScene | 全部 M4 | 路由整合 | 一键跑完 3 阶段 |
| M4.8 | **Claude** | 审查：战力公式正确性、Boss 战中错题记录路径、情绪保护文案（"Boss 逃走了"） | M4.* | review | 文案与 spec §10 一致 |
| M4.9 | **Claude** | E2E：`m4-full-game.spec.ts` 完整一局 20min 模式 → 结算 → Boss 胜利 | 全部 M4 | E2E | 全绿 |

**并行组**：M4.2 / M4.3 / M4.4a / M4.4b / M4.4c / M4.5 / M4.6 在 M4.1 完成后 **7 路并行**。

---

## M5 · 云同步 + 错题本复习（2-3 天）

### 后端

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M5.1 | **Claude** | 设计 `apps/server/src/db/schema.sql`（5 张表 + 索引） | Spec §9.4 | SQL 文件 | 在干净 DB 上执行无错 |
| M5.2 | **Codex** | `apps/server/src/db/client.ts`（better-sqlite3 初始化 + migration runner + integrity check） | M5.1 | DB 客户端 | 启动自动建表；重启无报错 |
| M5.3 | **Claude** | 设计家庭口令鉴权方案：bcrypt + JWT + 5 次失败锁定 10 分钟（设计文档） | Spec §9.5 §10 | auth 设计 md | 审查通过 |
| M5.4 | **Codex** | `routes/auth.ts` 实现 M5.3 方案 | M5.3 | 路由 + 中间件 | 压测：5 次错误锁 10 分钟 |
| M5.5a | **Codex** | `routes/wrongBook.ts` GET/POST/PATCH/DELETE | Spec §9.5 | 路由 | API 集成测试通过 |
| M5.5b | **Codex** | `routes/weapons.ts` GET/POST | Spec §9.5 | 路由 | 同上 |
| M5.5c | **Codex** | `routes/bossLog.ts` GET/POST | Spec §9.5 | 路由 | 同上 |
| M5.5d | **Codex** | `routes/customQuestion.ts` 全 CRUD | Spec §9.5 | 路由 | 同上 |
| M5.6 | **Claude** | 安全审查：SQL 注入（参数化查询）、JWT secret env、rate limit、CORS | M5.5* | 安全 review | 无高危 |

### 前端

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M5.7 | **Codex** | `data/cloud/apiClient.ts`（fetch 包装 + 2s 超时 + 重试队列 + JWT 头） | Spec §9.6 | 客户端 | 模拟 503 降级成功 |
| M5.8 | **Codex** | `data/cloud/syncEngine.ts`（启动拉全量 + last-writer-wins 合并 + 增量推送） | Spec §9.6 | 同步引擎 + 单测 | 冲突用例通过 |
| M5.9 | **Codex** | `features/review/ReviewMode.tsx`（错题本复习 UI：按错次推题、连对 2 次标掌握、¥300 奖励） | Spec §6.3 | 组件 + 路由 | E2E：连对 2 次 isMastered |
| M5.10 | **Codex** | 首次使用弹窗：家庭口令登录（无账号即创建） | Spec §9.5 | 登录 UI | 手动测试通过 |
| M5.11 | **Claude** | E2E：`m5-sync.spec.ts`（断网答错 → 重连 → 云端一致） | 全部 M5 | E2E | 全绿 |

**并行组**：M5.5a-d 可 4 路并行；M5.7 / M5.8 可与后端并行；M5.9 / M5.10 可在 M5.8 后并行。

---

## M6 · 题库生成 + 部署（2-3 天）

### 题库

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M6.1 | **Codex** | 生成 `docs/QUESTION-BANK.md`：苏教版一下 18 周知识点清单（数学/语文/英语分表） | Spec §5.7 | 知识点清单 md | 用户抽检通过 |
| M6.2 | **Claude** | 审查 M6.1 清单，与苏教版教材目录对齐；必要处人工调整 | M6.1 | 修正后清单 | 与教材匹配 |
| M6.3a-r | **Codex × 18** | 按周生题：每次输入一周知识点 + schema 生成 55 题 JSON（数 20 / 语 20 / 英 15） | M6.2 | `week-01.json` … `week-18.json` | 每包 Zod 校验通过 |
| M6.4 | **Codex** | `scripts/validateQuestionPacks.ts`：批量校验（schema / 答案在选项 / 数学题 eval 自洽 / 重复 stem） | Spec §11.4 | 校验脚本 | 跑全部 18 包无红点 |
| M6.5 | **Claude** | 抽检 M6.3 每周随机 5 题人工校对；问题题 → 标记让 Codex 重生 | M6.3 | 抽检记录 | 错误率 < 5% |
| M6.6 | **Codex** | `features/review/QuestionAudit.tsx`：家长校对页（快速过题、标替换、标改动） | Spec §5.6 | 校对组件 | 可列出 990 题分页浏览 |

### 部署

| ID | 执行者 | 任务 | 输入 | 交付物 | 验收 |
|---|---|---|---|---|---|
| M6.7 | **Codex** | `deploy/install.sh`（节点/pnpm 安装 + 构建 + nginx + systemd 安装 + DB 初始化 + 默认口令） | Spec §12.2 | shell 脚本 | 空白 Ubuntu 22.04 云主机一键装完 |
| M6.8 | **Codex** | `deploy/nginx.conf`（反代前端静态 + `/api` → 后端 + gzip + SPA fallback） | Spec §12.2 | 配置文件 | 配置校验通过 |
| M6.9 | **Codex** | `deploy/ultraman-monopoly.service`（systemd 启动后端 + env 注入 + 自动重启） | Spec §12.2 | service 文件 | systemctl status 正常 |
| M6.10 | **Codex** | `deploy/backup.sh` + cron（每日 03:00 `.db` 打包保留 7 天） | Spec §12.2 | 脚本 + cron 注释 | 手动运行生成备份 |
| M6.11 | **Codex** | `docs/DEPLOY.md`：云主机部署手册（步骤、域名配置、口令修改、备份恢复） | M6.7-M6.10 | md 文档 | 步骤可跟做 |
| M6.12 | **Codex** | `docs/README.md`：玩家指南（如何选英雄、答题、Boss 战、错题本复习） | Spec 全文 | md 文档 | 面向家长无歧义 |
| M6.13 | **Claude** | 安全/运维终审：脚本权限、秘钥注入、备份可恢复、防火墙建议 | M6.7-M6.12 | 终审报告 | 可发布 v1.0 |

**并行组**：M6.3a-r（18 周题包）可批量并行，一次开 3-4 路 Codex 避免超 API 配额；M6.7-M6.10（部署文件）可 4 路并行；M6.11 / M6.12 可并行。

---

## 关键并行批次（Codex 同时任务数上限建议 ≤ 4）

| 批次 | 任务 | 同时路数 | 预计耗时 |
|---|---|---|---|
| B1 | M0.2a / M0.2b / M0.2c | 3 | 15 min |
| B2 | M1.1+2 / M1.3+4 / M1.5+6（领域层 3 组） | 3 | 45 min |
| B3 | M1.8 / M1.9 / M1.10 / M1.11（UI 4 件） | 4 | 40 min |
| B4 | M2.3a / M2.3b / M2.4 / M2.5 / M2.6 | 4 | 60 min |
| B5 | M3.2a / M3.2b / M3.2c / M3.3 / M3.4 / M3.5 / M3.6 | 4（分 2 轮） | 60 min |
| B6 | M4.2 / M4.3 / M4.4a / M4.4b / M4.4c / M4.5 / M4.6 | 4（分 2 轮） | 75 min |
| B7 | M5.5a / M5.5b / M5.5c / M5.5d | 4 | 30 min |
| B8 | M6.3a-r 题包生成 | 4（分 5 轮） | 90 min |
| B9 | M6.7 / M6.8 / M6.9 / M6.10 部署文件 | 4 | 30 min |

**总 Codex 调度**：约 **55 次** 并行/串行组合

---

## Claude 关键节点（不可并行，需人工把关）

| 节点 | 任务 | 预计 |
|---|---|---|
| K1 | M0.3 Zod schema 设计 | 20 min |
| K2 | M0.5 M0 总审 | 15 min |
| K3 | M1.1 / M1.3 / M1.5 测试设计（TDD RED） | 60 min |
| K4 | M1.12 UI 审查 + M1.13 E2E | 40 min |
| K5 | M2.1 题目抽选测试设计 + M2.9 审查 + M2.10 E2E | 60 min |
| K6 | M3.1 主题接口设计 + M3.7 审查 | 30 min |
| K7 | M4.1 Boss 测试设计 + M4.8 审查 + M4.9 E2E | 60 min |
| K8 | M5.1 Schema + M5.3 Auth 设计 + M5.6 安全审 + M5.11 E2E | 90 min |
| K9 | M6.2 大纲审 + M6.5 抽检 + M6.13 终审 | 60 min |

**总 Claude 时长**：约 **7-8 小时** 有效思考时间

---

## 风险与回退

| 风险 | 监控 | 回退 |
|---|---|---|
| Codex 产出偏离 spec | Claude 每批次审查 | 重派一次；二次失败 Claude 直写 |
| 题包质量差 | M6.4 校验 + M6.5 抽检 | 仅保留通过的题；人工补 |
| M5 同步冲突 | E2E 覆盖 | last-writer-wins + 冲突日志可查 |
| iPad Safari 兼容 | 每阶段 M*.* 审查 | 降级动画复杂度 |
| 部署脚本失败 | M6.7 在空白 VM 试跑 | 分步执行，每步打印状态 |

---

## 启动指令

当你准备好逐阶段执行时：
```
/ecc:multi-execute .claude/plan/ultraman-monopoly.md --phase M0
/ecc:multi-execute .claude/plan/ultraman-monopoly.md --phase M1
...
```
或一次性：
```
/ecc:multi-execute .claude/plan/ultraman-monopoly.md
```

各阶段之间默认设检查点（commit + push + 手动验证），防止连锁错误。
