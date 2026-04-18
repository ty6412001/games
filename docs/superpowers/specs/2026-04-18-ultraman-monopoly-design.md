# 奥特曼亲子大富翁 · 学习游戏设计规范

**日期**：2026-04-18
**作者**：Claude 与用户共同澄清
**状态**：待用户复审 → 进入 writing-plans

---

## 1. 目标与背景

### 1.1 产品目标
为家庭设计一款**奥特曼主题的大富翁桌面游戏**，让孩子在与家人娱乐的同时，快速掌握小学一年级下册（苏教版）数学、语文、英语的核心知识点。

### 1.2 核心价值
- **亲子陪伴**：2-5 人同屏轮流玩，围绕一台 iPad（可投屏电视）
- **快速学习**：答题获得金币，答错触发错题本记录与后续复习
- **情绪安全**：破产/失败采用温和话术与动画，避免击溃小孩心理
- **收藏驱动**：武器收藏、Boss 挑战进度、知识勋章等强化学习动机
- **合作结局**：游戏终局为全家合力挑战 Boss，从零和竞争转为协作学习

### 1.3 不做什么（YAGNI）
- 不做公网发布、不做多租户（仅内网，仅自家使用）
- 不做联机对战（本地 2-5 人同屏）
- 不做 AI 单人模式（至少 2 人）
- 不做 TTS 语音（MVP 阶段由家长代读）
- 不做大人题库（仅孩子答题，大人辅助）

---

## 2. 核心规格汇总

| 维度 | 决定 |
|---|---|
| 运行平台 | Web（React PWA）；iPad Safari 优先，横屏，投屏电视 |
| 部署 | 内网云主机，对外不可见；家庭口令鉴权 |
| 玩家数 | 2-5 人本地同屏，常态 3 人（爸爸妈妈+孩子） |
| 学科 | 一年级下册（苏教版）：数学 + 语文 + 英语 |
| 答题规则 | 孩子主答；大人可用"求助卡"辅助 |
| 题目触发 | 混合制：学习格 + 买地答题 + 机会格/怪兽格 |
| 题库 | 预置按周分包（18 周），错题本持久化，家长可补题 |
| 结束条件 | 可选时长（20/30/45 分钟）或任一玩家破产即结束 |
| 终局 | 金币换战力 → 全家合力打本周 Boss |
| 孩子档案 | 单孩子档案；数据模型预留多档案扩展 |
| 语音 | 无（MVP） |
| 主题 | 4 位奥特曼英雄：德凯 / 贝利亚 / 赛罗 / 迪迦；怪兽立绘 |

---

## 3. 总体架构

### 3.1 分层
```
┌─────────────────────────────────────────┐
│  UI 层（React 组件 + Tailwind）          │
│  - 棋盘视图 / 玩家面板 / 答题弹窗 /      │
│    Boss 战 / 错题本复习 / 设置           │
├─────────────────────────────────────────┤
│  主题层（theme/ultraman）                │
│  - 英雄头像 / 怪兽立绘 / 招式特效 / 武器  │
├─────────────────────────────────────────┤
│  状态层（Zustand stores）                │
│  - gameStore / quizStore / profileStore  │
│  - bossStore / wrongBookStore            │
├─────────────────────────────────────────┤
│  领域层（纯 TS，无 React 依赖）           │
│  - turnEngine / boardRules / economy     │
│  - questionPicker / bossBattle           │
├─────────────────────────────────────────┤
│  数据层                                  │
│  - questionPackLoader（静态 fetch）       │
│  - profileRepo（IndexedDB via Dexie）    │
│  - cloudSync（REST 客户端 + 重试队列）    │
└─────────────────────────────────────────┘
```

### 3.2 核心原则
- **领域层纯函数**：业务逻辑不依赖 React，可独立单测（便于 Codex 按测试生成实现）
- **状态层薄**：store 只持有状态 + 调用领域函数，不写业务分支
- **UI 层只读**：组件只消费 store，通过 store action 改状态
- **主题可插拔**：主题层通过接口暴露，未来换 IP 不改核心
- **离线优先**：游戏主流程不依赖网络；错题本走本地写 + 后台同步

### 3.3 技术栈
- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + Zustand + Dexie
- **后端**：Node.js + Express + TypeScript + better-sqlite3
- **测试**：Vitest（单测/集成）+ Playwright（E2E）
- **校验**：Zod（运行时 schema）
- **构建**：Vite + pnpm workspaces（前后端单仓）
- **部署**：systemd + nginx（内网云主机）

### 3.4 目录结构
```
games/
├── apps/
│   ├── web/                          # 前端应用
│   │   ├── src/
│   │   │   ├── app/                  # 路由与入口
│   │   │   ├── domain/               # turnEngine, boardRules, economy, questionPicker, bossBattle
│   │   │   ├── stores/               # Zustand stores
│   │   │   ├── features/
│   │   │   │   ├── board/            # 棋盘 + 格子
│   │   │   │   ├── quiz/             # 答题弹窗 + 倒计时
│   │   │   │   ├── battle/           # 怪兽战斗场景
│   │   │   │   ├── boss/             # Boss 终局
│   │   │   │   ├── players/          # 玩家面板
│   │   │   │   ├── review/           # 错题本复习
│   │   │   │   └── settings/         # 对局设置
│   │   │   ├── data/
│   │   │   │   ├── repo/             # IndexedDB 仓储
│   │   │   │   ├── cloud/            # API 客户端
│   │   │   │   └── packs/            # 题包 loader
│   │   │   ├── theme/
│   │   │   │   └── ultraman/         # heroes, monsters, effects, weapons, theme.config.ts
│   │   │   ├── types/                # 共享 TS 类型
│   │   │   └── ui/                   # 通用原子组件
│   │   ├── public/
│   │   │   ├── question-packs/       # 18 周题包 JSON
│   │   │   └── assets/               # 图片、音效
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── e2e/
│   │   └── package.json
│   └── server/                       # 后端
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/               # wrongBook, weapons, bossLog, auth
│       │   ├── db/                   # schema.sql, client.ts
│       │   └── sync/
│       ├── data/
│       │   └── family.db             # SQLite
│       └── package.json
├── packages/
│   └── shared/                       # 前后端共享类型 & Zod schema
├── deploy/
│   ├── install.sh                    # 云主机一键部署
│   ├── nginx.conf
│   ├── ultraman-monopoly.service     # systemd
│   └── backup.sh                     # 每日 SQLite 备份
├── docs/
│   ├── superpowers/specs/            # 本文件
│   ├── README.md
│   ├── DEPLOY.md
│   └── QUESTION-BANK.md
├── package.json                      # pnpm workspace 根
└── pnpm-workspace.yaml
```

---

## 4. 游戏玩法

### 4.1 三阶段流程
```
[阶段 1：大富翁期]           [阶段 2：战力结算]           [阶段 3：Boss 战]
 选择时长 20/30/45 min   →   金币 → 战力值          →   全家合力打本周 Boss
 或任一玩家破产立即结束       武器 → 附加战力            Boss 倒 = 全员胜利
 每人答题赚钱 / 买地收租       错题本复习 = 战力加成       奖励周目通关
 收集武器（仅装饰）           结算面板展示每人战力
```

### 4.2 棋盘结构
- **28 格**（一圈 7 × 4 边），四角为大格
- 格子类型分布：

| 格子类型 | 数量 | 触发机制 |
|---|---|---|
| 🏠 起点 | 1 | 每绕一圈领 ¥200 工资 |
| 📚 学习格 | 8 | 必答一题，对 +¥80 / 错 -¥40 |
| 🏙️ 地产格 | 12 | 买地需答对一题；别人踩到交租 |
| 🎲 机会格 | 3 | 抽卡：好事/坏事 |
| ⚔️ 怪兽格 | 2 | 小战斗：答题打怪兽，赢得金币+武器碎片 |
| 🎁 奖励宝库 | 1 | 每日登录奖励 / 错题复习奖励领取 |
| 🧟 Boss 前哨 | 1 | 预览本周 Boss 战力需求 |

### 4.3 地产街区
12 块地分 3 街区，每街区 4 块，集齐一街区租金翻倍：
- **怪兽之森**：巴尔坦、哥莫拉、雷德王、杰顿
- **宇宙空间站**：金星、火星、M78、泰坦
- **光之国**：胜利之塔、光之塔、长老殿、和平广场

### 4.4 回合流程
```
玩家回合开始
  ↓
掷骰子（1-6，动画 1 秒；孩子有 1 次重甩机会）
  ↓
走格子（每格 0.3 秒动画）
  ↓
触发落地事件
  ├─ 学习格 → 答题弹窗（本回合必答）
  ├─ 地产格：
  │   ├─ 无主 → 问"买不买" → 答题 → 买/放弃
  │   ├─ 别人的 → 扣租金
  │   └─ 自己的 → 跳过
  ├─ 机会格 → 抽卡 → 执行效果
  ├─ 怪兽格 → 小战斗：答题 + 英雄出招动画
  ├─ 奖励宝库 → 领奖励
  └─ Boss 前哨 → 展示本周 Boss 信息
  ↓
结算（金币变动、武器入库、错题本更新）
  ↓
判定游戏结束
  ├─ 未结束 → 下一位玩家
  └─ 结束 → 进入战力结算 → Boss 战
```

### 4.5 孩子友好设计
- 骰子"震荡再甩"按钮，防误点；出点后给孩子 1 次重甩机会
- 答题倒计时超时不强制扣分，弹"要不要求助爸妈？"
- 连错 3 题自动赠送 1 张求助卡
- 破产不显示"破产"字样，显示"XX 的变身能量耗尽，先回 M78 补充"
- 所有按钮最小 64×64 px，大字体优先
- 扣钱用缓动动画，不瞬间跳数字

---

## 5. 答题系统

### 5.1 题包格式
每周一份 JSON：
```json
{
  "week": 1,
  "title": "第1周 · 数字 0-20 / 拼音 b p m f / My name",
  "boss": {
    "id": "zetton",
    "name": "杰顿",
    "hp": 3000,
    "image": "/assets/monsters/zetton.png"
  },
  "questions": [
    {
      "id": "m-w01-001",
      "subject": "math",
      "difficulty": 1,
      "topic": "20以内加法",
      "type": "choice",
      "stem": "8 + 5 = ?",
      "options": ["12", "13", "14", "15"],
      "answer": "13",
      "reward": { "correct": 80, "wrong": -40 }
    }
  ]
}
```

### 5.2 题目类型（MVP 支持 4 种）
| 类型 | 用途 | UI |
|---|---|---|
| `choice` | 多选一（3-4 项） | 大按钮列表 |
| `input` | 数字/单字作答 | 大键盘输入 |
| `image-choice` | 看图选答 | 图 + 选项按钮 |
| `ordering` | 排序题 | 拖拽重排 |

未来可扩展：`fill-blank`、`listening`、`handwriting`

### 5.3 按难度倒计时
| 难度 | 选择题 | 输入/排序 | 视觉 |
|---|---|---|---|
| ★ 简单 | 20 秒 | 30 秒 | 绿色进度条 |
| ★★ 中等 | 35 秒 | 50 秒 | 黄色进度条 |
| ★★★ 难题 | 50 秒 | 70 秒 | 红色进度条 |

- 最后 5 秒进度条闪烁 + 轻提示音
- 超时视作答错，计入错题本，扣币减半（50%）
- 求助卡暂停倒计时，求助完毕后继续

### 5.4 答题弹窗流程
```
怪兽登场动画 (0.8s)
  ↓
题目展示（学科 icon + 难度星级 + 题干 + 选项 + 倒计时条）
  ↓
孩子点答案 OR 大人打求助卡 OR 超时
  ├─ 正确 → 英雄光线特效 (1.2s) → 怪兽爆炸 → 金币飞入钱包 → 回棋盘
  ├─ 错误 → 怪兽反击 → 高亮正确答案（学习效果）→ 扣币动画 → 错题本记录
  ├─ 求助 → 提示（非直接答案）→ 再答一次 → 不奖励也不记错题本
  └─ 超时 → 判错 + 错题本 + 扣币 50%
  ↓
结算
```

### 5.5 题库体量（MVP）
| 学科 | 每周 | 18 周总量 |
|---|---|---|
| 数学 | 20 | 360 |
| 语文 | 20 | 360 |
| 英语 | 15 | 270 |
| **合计** | 55/周 | **~990 题** |

### 5.6 题库生成流程
1. 让 Codex 按**苏教版一年级下册**教学大纲先输出**每周知识点清单**（16-18 周）
2. 按清单分批生题（每次 1 周 55 题，约 18 次调用）
3. 每包生成后自动通过 Zod schema 校验 + 答案自洽性检查
4. 数学算式题：脚本执行验证 `answer` 等于 `eval(stem)`
5. 家长通过"题目校对模式"在浏览器里过一遍，可一键替换/打标
6. 后续补题走家长后台，存云端 `custom_question` 表

### 5.7 苏教版教学大纲草案
| 周 | 数学主题 | 语文主题 | 英语主题 |
|---|---|---|---|
| 1 | 认识 0-20 | 声母 b p m f | Hello / My name |
| 2 | 20 以内加法 | 声母 d t n l | Numbers 1-5 |
| 3 | 20 以内减法 | 声母 g k h | Colors |
| 4 | 认识人民币 | 声母 j q x | Family |
| 5 | 加减混合 | 声母 zh ch sh r | Animals |
| 6 | 认识图形 | 声母 z c s y w | Food |
| 7 | 找规律 | 单韵母复习 | Weather |
| 8 | 20 以内加减法应用 | 复韵母 ai ei ui | Body parts |
| 9 | 100 以内数认识 | 复韵母 ao ou iu | School things |
| 10 | 100 以内加减法（整十） | 前鼻韵母 | Toys |
| 11 | 认识钟表 | 后鼻韵母 | Clothes |
| 12 | 元角分换算 | 识字组词 A | Daily actions |
| 13 | 长度单位（厘米） | 识字组词 B | In the park |
| 14 | 统计与可能性 | 看图说话 | Feelings |
| 15 | 100 以内加法（进位） | 课文朗读 A | Have/Has |
| 16 | 100 以内减法（退位） | 课文朗读 B | Can/Can't |
| 17 | 应用题综合 | 背诵积累 | Likes/Dislikes |
| 18 | 总复习 | 总复习 | 总复习 |

（实际内容以苏教版教材为准，Codex 生成前以教材目录对齐）

---

## 6. 错题本

### 6.1 数据结构
```ts
type WrongBookEntry = {
  id: string;
  childId: string;
  questionId: string;
  subject: 'math' | 'chinese' | 'english';
  week: number;
  stem: string;
  wrongAnswer: string;
  correctAnswer: string;
  firstWrongAt: number;
  lastWrongAt: number;
  wrongCount: number;
  isMastered: boolean;
  masteredAt?: number;
};
```

### 6.2 记录时机
- 主游戏中答错 → 立即写本地 IndexedDB → 后台推云
- 超时判错 → 同上
- 求助后答对 → 不记录（避免惩罚求助行为）
- Boss 战中答错 → 同样记录（强化学习核心）

### 6.3 复习模式
独立入口（主菜单 → "每日复习"），流程：
- 按错次多寡倒序推题
- 每题选项减到 3 个，降低难度
- **连对 2 次 → 标记"已掌握"**（孩子成就感）
- 复习完成奖励：¥300 金币 + 1 枚知识勋章（Boss 战可兑战力）

### 6.4 掌握与复活
- **已掌握**：复习中连对 2 次 → `isMastered = true`，不再推送
- **复活**：主游戏中再答错该题 → `isMastered = false`，`wrongCount++`

---

## 7. 奥特曼主题与武器

### 7.1 英雄
4 位可选：**迪迦 / 赛罗 / 德凯 / 贝利亚**

玩家数 > 4 时（5 人满员），允许两名玩家选同一位英雄；游戏内通过"色号编号"区分（如 `迪迦 #1` / `迪迦 #2`），头像带角标数字。

### 7.2 主题整合
- **答题即战斗**：每题为一场小战斗，怪兽登场 → 答对出招 → 胜利；答错被反击
- **求助卡 = 合体技**：大人英雄飞来助攻，视觉上两个奥特曼合体
- **破产 = 能量耗尽**：色彩计时器变红退场
- **买地插旗**：买下地产后插英雄旗帜

### 7.3 武器系统（MVP 简化版）
- **4 英雄 × 2 武器 = 8 件**
- **仅收藏和装饰作用，不影响大富翁阶段出牌/掷骰**
- 每件武器有炫酷亮相动画

| 英雄 | 普通武器 | 稀有武器 |
|---|---|---|
| 迪迦 | 哉佩利敖光线 | 光之刃 |
| 赛罗 | 赛罗光线 | 赛罗斩 |
| 德凯 | 德凯光线 | D 矢量 |
| 贝利亚 | 贝利亚光线 | 德斯西乌姆光线 |

### 7.4 武器获得途径
- 连答 3 题全对 → 1 件普通武器
- 学习格答对难题 → 对应难度武器
- 周目 Boss 通关 → 1 件稀有武器
- 错题本当日复习全对 → 1 枚知识勋章

### 7.5 素材策略
- **代码层面 100% 合规**：仓库内只有占位图 + 文件名约定
- **私人素材替换**：家长在部署后手动把网图放到 `public/assets/heroes/`、`public/assets/monsters/` 对应文件名
- 内网私用不传播，不构成公开发布

---

## 8. 战力值 + Boss 战（合作终局）

### 8.1 战力值换算公式
```
战力值 = 金币 / 100
       + 武器数 × 500
       + 当日错题复习正确率 × 2000
       + 最高连击数 × 100
```
（数字可调，体现"金币 + 收藏 + 学习 + 连击"四要素）

### 8.2 Boss 战机制
- **自动进入**（结算阶段一结束即进入 Boss 战，不可跳过）
- **每周固定 Boss**（18 周 18 只怪兽，按排表；有仪式感）
- **Boss 血条** = 全员战力加总的理论期望值 × 0.7（大多能赢，偶尔挑战失败）
- **回合制出招**：
  - 每人轮流选"装备武器 + 答一道复习题"
  - 答对 → 武器全额伤害 + 英雄光线特效
  - 答错 → 伤害减半 + 英雄挨打动画
  - 孩子答题（大人不答题；回到"孩子主答"核心原则）
- **Boss 战中答错 → 计入错题本**（与主游戏一致）
- **胜利**：全家欢呼 + 周目徽章 + 错题本对应题目自动标"已掌握"
- **失败**：显示"Boss 逃走了，下周再战！"（保护情绪）
- **个人荣誉**：战力最高者 = 本局"最强光之战士"

### 8.3 Boss 排表（示例，可调）
| 周 | Boss | 主题难点 |
|---|---|---|
| 1 | 杰顿 | 20 以内基础加法 |
| 2 | 哥莫拉 | 减法与声母 |
| 3 | 雷德王 | 人民币 |
| ... | ... | ... |
| 18 | 黑暗扎基 | 总复习综合 |

（具体排表由用户与孩子商量定，代码层面为数据驱动）

---

## 9. 数据模型与存储

### 9.1 核心类型（节选）
```ts
type HeroId = 'tiga' | 'zero' | 'decker' | 'belial';

type Player = {
  id: string;
  name: string;
  heroId: HeroId;
  isChild: boolean;
  money: number;
  position: number;      // 0..27
  weapons: WeaponId[];
  ownedTiles: number[];
  equippedWeapon?: WeaponId;
  combatPower: number;   // 仅结算阶段计算
  streak: number;
};

type GameState = {
  id: string;
  startedAt: number;
  durationMin: 20 | 30 | 45;
  week: number;
  players: Player[];
  currentTurn: number;
  phase: 'monopoly' | 'settle' | 'boss' | 'ended';
  tiles: Tile[];
  bossBattle?: BossBattleState;
};
```

### 9.2 本地存储（IndexedDB / Dexie）
```
DB: ultraman-monopoly
├── activeGame          当前对局快照（刷新后恢复）
├── wrongBookCache      错题本本地镜像
├── weaponCollection    武器收藏镜像
├── questionPackCache   已下载的周题包
└── settings            音量、倒计时偏好等
```

### 9.3 云端（Node + Express + SQLite）
```
apps/server/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── wrongBook.ts
│   │   ├── weapons.ts
│   │   ├── bossLog.ts
│   │   ├── customQuestion.ts
│   │   └── auth.ts
│   ├── db/
│   │   ├── schema.sql
│   │   └── client.ts       # better-sqlite3
│   └── sync/
│       └── merge.ts
├── data/
│   └── family.db
└── package.json
```

### 9.4 数据表
```sql
CREATE TABLE child (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  createdAt INTEGER
);

CREATE TABLE wrong_book (
  id TEXT PRIMARY KEY,
  childId TEXT NOT NULL,
  questionId TEXT NOT NULL,
  subject TEXT NOT NULL,
  week INTEGER,
  stem TEXT,
  wrongAnswer TEXT,
  correctAnswer TEXT,
  firstWrongAt INTEGER,
  lastWrongAt INTEGER,
  wrongCount INTEGER DEFAULT 1,
  isMastered INTEGER DEFAULT 0,
  masteredAt INTEGER,
  UNIQUE(childId, questionId)
);

CREATE TABLE weapon_collection (
  childId TEXT NOT NULL,
  weaponId TEXT NOT NULL,
  heroId TEXT NOT NULL,
  unlockedAt INTEGER,
  PRIMARY KEY (childId, weaponId)
);

CREATE TABLE boss_log (
  id TEXT PRIMARY KEY,
  childId TEXT NOT NULL,
  week INTEGER,
  bossId TEXT,
  defeated INTEGER,
  totalCombatPower INTEGER,
  topContributor TEXT,
  playedAt INTEGER
);

CREATE TABLE custom_question (
  id TEXT PRIMARY KEY,
  week INTEGER,
  subject TEXT,
  stem TEXT,
  options TEXT,
  answer TEXT,
  createdBy TEXT,
  createdAt INTEGER
);
```

### 9.5 API 路由
```
# 错题本
GET    /api/wrong-book?childId=xxx&subject=math&mastered=false
POST   /api/wrong-book
PATCH  /api/wrong-book/:id/master
DELETE /api/wrong-book/:id

# 武器
GET    /api/weapons?childId=xxx
POST   /api/weapons

# Boss 日志
GET    /api/boss-log?childId=xxx
POST   /api/boss-log

# 补题
GET    /api/custom-question?week=1
POST   /api/custom-question
PATCH  /api/custom-question/:id
DELETE /api/custom-question/:id

# 鉴权
POST   /api/auth/login           # 家庭口令 → JWT（30 天有效）
```

### 9.6 同步策略
- **写入**：乐观写 IndexedDB → 后台 fetch 推云；失败入重试队列
- **读取**：启动时 `GET /api/wrong-book` 拉全量合并；后续按 `lastSyncAt` 增量 `?since=...`
- **冲突**：错题本按 `lastWrongAt` 最新为准；`isMastered` 只前进不回退

---

## 10. 错误处理与边界

| 场景 | 处理 |
|---|---|
| iPad 断网 | 游戏主流程走 IndexedDB，完全可玩；错题进队列，联网后同步 |
| 云后端宕机 | 前端 API 请求 2 秒超时，降级本地；UI 顶栏提示"同步中…" |
| SQLite 损坏 | 启动 `PRAGMA integrity_check`；损坏切最近备份（保留 7 天） |
| 题包 JSON 非法 | Zod 校验失败跳过该题 + 控制台警告 |
| 刷新丢进度 | 状态变更自动存 `activeGame`；重进弹"继续上局吗？" |
| 多 iPad 冲突 | Last-writer-wins + 冲突日志（家庭场景罕见） |
| 家庭口令爆破 | 5 次失败锁 10 分钟 |
| 孩子连错 5 题 | 弹"要不要休息一下？" + 推荐复习模式 |
| 掷骰边界 | 强制 `1 ≤ n ≤ 6`，单测断言 |
| 钱刚好 0 | 仅 `money ≤ 0 且无地产可抵押` 算破产；有地产先强制卖 |
| 全员同时破产 | 按当前现金从低到高排名 |

### 10.1 情绪保护设计
- 连错 3 题自动送 1 张求助卡
- 破产话术柔化（"能量耗尽，回 M78 补充"）
- Boss 战失败显示"Boss 逃走了，下周再战"
- 扣钱用缓动动画（不瞬跳）

---

## 11. 测试策略

### 11.1 单元测试（Vitest）—— 领域层纯函数
- `turnEngine`：掷骰、走格、落地分发
- `economy`：买地、交租、破产判定
- `questionPicker`：按周/学科/难度抽题 + 错题本优先
- `boardRules`：街区齐集判定、租金倍数
- `bossBattle`：战力计算、Boss HP 结算
- `schemas`：题包 Zod 校验
- 覆盖率 ≥ 80%

### 11.2 集成测试（Vitest + msw）—— store + API mock
- 答错题 → 错题本更新 → 同步云 mock
- 云 503 时本地可用且入重试队列
- 刷新恢复对局状态一致

### 11.3 E2E（Playwright）—— 关键用户流程
- 新局：选时长 → 选英雄 → 走一圈 → 答对/答错 → 买地 → 机会卡
- 完整局：20 分钟局 → 强制时间到 → 战力结算 → Boss 战 → 胜利
- 错题本：答错 → 复习模式 → 连对 2 次 → 标记已掌握
- 离线重连：离线答题 → 上线自动同步

### 11.4 题库质量测试（Vitest + 脚本）
- 每道题 Zod 合法
- `answer` 必在 `options` 内（选择题）
- 数学算式题：脚本 `eval(stem) === answer`
- 重复题检测（同 stem 出现两次）

### 11.5 脚本
```
npm run dev               # 前端 dev server
npm run dev:server        # 后端 dev
npm test                  # vitest
npm run test:e2e          # playwright
npm run typecheck
npm run lint
npm run build             # 前端 + 后端 + 题库校验
npm run pack:questions    # 让 Codex 生题 + 校验 + 写入 public/
```

---

## 12. 里程碑与交付

### 12.1 MVP 分阶段（每阶段都可玩）

**M0 · 地基（1-2 天）**
- pnpm workspace 脚手架：Vite + React + TS + Tailwind + Zustand + Express + SQLite
- 类型、Zod schema、基础 store
- CI（lint / typecheck / test）跑通

**M1 · 棋盘可走（3-4 天）**
- 28 格棋盘、掷骰、走棋动画
- 玩家面板（占位头像 + 金币 + 位置）
- 选 2-5 人 + 选 4 英雄
- 每圈领工资、基础地产买卖（不含答题）
- 单测：turnEngine / economy

**M2 · 答题接入（3-4 天）**
- 题包加载（占位 10 题）
- 答题弹窗（4 题型）+ 倒计时
- 学习格 / 买地答题 / 机会卡接入
- 错题本本地写入

**M3 · 奥特曼主题皮（2-3 天）**
- 4 英雄头像 + 怪兽立绘接入
- 答题战斗动画（光线/爆炸）
- 武器收藏 8 件 + 装饰展示
- 音效（击中 / 胜利 / 失败）

**M4 · 战力结算 + Boss 战（3-4 天）**
- 战力值计算 + 结算界面
- Boss 战合作回合制
- 18 周 Boss 数据
- 胜利/失败动画

**M5 · 云同步 + 错题本复习（2-3 天）**
- Express API 全量实现 + 家庭口令鉴权
- 错题本双向同步
- 独立复习模式入口
- 武器收藏 / Boss 日志持久化

**M6 · 题库生成 + 部署脚本（2-3 天）**
- Codex 按苏教版一年级下册大纲生 18 周题包
- 家长题目校对工具页
- 云主机一键部署脚本（`install.sh` + systemd + nginx）
- README / DEPLOY / QUESTION-BANK 文档
- 发布 v1.0

**总计约 15-22 天**（单人全职）

### 12.2 交付物清单
```
games/
├── apps/web                      # 前端应用
├── apps/server                   # 后端应用
├── packages/shared               # 共享类型与 schema
├── apps/web/public/question-packs  # 18 周题包
├── apps/web/public/assets        # 奥特曼/怪兽/武器 占位图 + 文件名约定
├── deploy/
│   ├── install.sh                # 云主机一键部署
│   ├── nginx.conf
│   ├── ultraman-monopoly.service
│   └── backup.sh                 # SQLite 每日备份
└── docs/
    ├── README.md                 # 玩家指南
    ├── DEPLOY.md                 # 部署手册
    └── QUESTION-BANK.md          # 题包格式与补题指南
```

### 12.3 风险与缓解
| 风险 | 缓解 |
|---|---|
| Codex 生题质量参差 | Zod schema + 数学自验 + 家长校对一遍 |
| iPad Safari CSS 动画卡顿 | 仅用 transform/opacity；避免 filter/box-shadow 大量动画 |
| 投屏电视字号偏小 | 全局 rem 基准可调，设置"字号 ×1.2/×1.5" |
| 奥特曼图加载慢 | 图预加载 + WebP 压缩 + Service Worker 缓存 |
| SQLite 备份丢失 | 每日 cron 打包保留 7 天；未来同步到对象存储 |

---

## 13. 后续版本路线（非本次 MVP）

- v1.1 家长题库后台：Web 界面直接 CRUD 补题，替代编辑 JSON
- v1.2 TTS 语音：拼音/英语发音题朗读题干
- v1.3 多孩子档案：家里来堂表兄妹或二胎时切档案
- v1.4 其他 IP 主题包：变形金刚、奥特曼剧场版扩展等
- v1.5 家长数据看板：孩子学习进度周报、错题热力图、Boss 通关率

---

## 14. 附录

### 14.1 关键决策记录
- **选 React 而非 Svelte/Vue**：Codex 对 React 训练数据最多，生成质量最稳
- **SQLite 而非 Postgres**：家庭场景数据量小，单文件易备份
- **合作 Boss 而非纯竞争结局**：亲子场景重在陪伴与学习，避免小孩情绪受挫
- **奥特曼图走私用替换**：代码仓库 100% 合规，私人部署自行放图
- **错题本云端而非本地**：未来多设备复习便利；家长可用电脑管理

### 14.2 术语表
- **学习格**：踩到必答题的格子
- **求助卡**：大人帮孩子答题的一次性道具
- **战力值**：游戏终局阶段金币+武器+错题复习折算的综合数值
- **知识勋章**：错题复习日奖励，Boss 战可兑战力
- **周目 Boss**：每周对应的一只终局怪兽
