# 奥特曼亲子大富翁

一款小学一年级下册（苏教版）数学 / 语文 / 英语学习大富翁，内网私用，2-5 人围着 iPad 轮流玩，投屏电视。

## 核心玩法

1. **准备**：选时长（20/30/45 分钟）、添加 2-5 位玩家、各自选奥特曼英雄（迪迦 / 赛罗 / 德凯 / 贝利亚）
2. **大富翁期**：轮流掷骰走棋，28 格棋盘一圈领 ¥200 工资
3. **答题驱动（孩子专属）**：
   - 📚 学习格：答一题，对 +¥80 / 错 -¥40，错题自动记录
   - 🏙️ 地产格：想买地必须先答对
   - ⚔️ 怪兽格：答题打怪得金币
   - 🎁 宝库格：领 ¥300 奖励
4. **连击奖励**：连对 3 题解锁英雄武器（每英雄 2 件）
5. **求助卡**：大人帮孩子答题，每人 2 张
6. **结算 → Boss 战**：时间到或有人破产 → 进入战力结算 → 全家合力打本周 Boss（18 周 18 只）

## 学科范围

18 周课程按苏教版一年级下册：数学（20 以内 / 100 以内 / 人民币 / 钟表）、语文（拼音 / 识字 / 看图说话）、英语（问候 / 数字 / 颜色 / 动物等）。

## 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind + Zustand + Dexie（IndexedDB）
- **后端**：Node.js + Express + better-sqlite3
- **部署**：systemd + nginx 内网一键部署

## 本机开发

```bash
pnpm install
pnpm rebuild better-sqlite3 esbuild
pnpm -r run build

# 分别启动
pnpm --filter @ultraman/web run dev       # http://localhost:5173
pnpm --filter @ultraman/server run dev    # http://localhost:3001
```

## 部署到内网云主机

```bash
# 1. 把整个仓库拷贝到目标机器
scp -r . user@host:/tmp/ultraman/

# 2. 登录机器执行
ssh user@host
sudo bash /tmp/ultraman/deploy/install.sh /opt/ultraman-monopoly
```

浏览器打开 `http://<机器IP>:8080`，iPad 投屏到电视即可玩。

详细部署见 [DEPLOY.md](./DEPLOY.md)，题库维护见 [QUESTION-BANK.md](./QUESTION-BANK.md)。

## 家长常见操作

- **修改口令**：编辑 `/opt/ultraman-monopoly/apps/server/.env` 中 `FAMILY_PASSWORD`，然后 `sudo systemctl restart ultraman-monopoly`
- **查看错题**：浏览器打开 → "每日复习"，或 SSH 到服务器 `sqlite3 /opt/ultraman-monopoly/apps/server/data/family.db 'SELECT * FROM wrong_book ORDER BY lastWrongAt DESC LIMIT 20;'`
- **备份数据**：自动每天 03:00 备份到 `/opt/ultraman-monopoly/apps/server/data/backups/`，保留 7 天
- **添加自制题**：见 [QUESTION-BANK.md](./QUESTION-BANK.md)

## 素材替换（奥特曼真图）

MVP 仅包含占位符。家长可把奥特曼头像 / 怪兽图放入：
- `apps/web/public/assets/heroes/<hero-id>.png` — 迪迦/赛罗/德凯/贝利亚头像
- `apps/web/public/assets/monsters/<boss-id>.png` — 18 周 Boss 立绘
- 重新构建：`pnpm --filter @ultraman/web run build`

仅作家用、不上公网，不涉及版权风险。

## 许可

内部私用，无公开分发计划。
