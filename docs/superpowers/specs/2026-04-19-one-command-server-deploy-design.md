# 一键推送服务器部署设计

## 目标

在仓库内补一套可复用的“一键部署到服务器”方案，使你后续在本地执行一次命令，就能把当前工作区同步到目标服务器，并完成重建、重启与基础验活。

## 约束

- 以当前这台服务器为默认目标：`47.245.125.9`
- 方案放在仓库 `deploy/` 目录下，后续可以继续扩成多台服务器
- 不把真实密码明文提交到 git
- 保留服务器现有 `.env` 和数据库数据，不覆盖 `apps/server/data`
- 兼容当前服务器环境：Alibaba Cloud Linux 3 / `dnf` / Node 20
- 允许依赖本地已有 `expect`、`ssh`、`rsync`

## 推荐方案

采用“仓库内脚本 + 本地忽略配置文件 + package.json 命令入口”的方式。

### 配置结构

- 提交一个模板文件，例如：`deploy/servers.example.json`
- 本地实际配置文件，例如：`deploy/servers.local.json`
- 在 `.gitignore` 中忽略 `deploy/servers.local.json`

实际配置项至少包括：

- `host`
- `user`
- `password`
- `remoteTmpDir`
- `installDir`

### 命令入口

在根 `package.json` 增加统一入口，例如：

- `pnpm deploy:server`

默认读取 `deploy/servers.local.json` 中的 `default` 目标。

如果后续需要多台机器，可扩成：

- `pnpm deploy:server --target prod-a`

## 执行流程

本地一键命令内部按下面顺序执行：

1. 本地预检查
2. 同步当前工作区到服务器临时目录
3. 远端更新正式目录
4. 清理远端增量构建缓存
5. 重建 `shared`、`web`、`server`
6. 补齐后端运行时依赖文件（如 `schema.sql`）
7. 重启 `ultraman-monopoly`
8. 本机与公网验活

### 1. 本地预检查

执行前先跑：

- `pnpm --filter @ultraman/shared run build`
- `pnpm --filter @ultraman/web run build`
- `pnpm --filter @ultraman/server run build`

任一步失败则中止，不推送。

### 2. 代码同步

用 `rsync` 将当前工作区推到远端临时目录，如：

- `/tmp/ultraman/`

排除：

- `node_modules`
- `.git`
- `dist`
- `apps/server/data`
- `*/tsconfig.tsbuildinfo`

### 3. 远端正式部署

把 `/tmp/ultraman/` 同步到：

- `/opt/ultraman-monopoly`

同步时继续保留：

- `apps/server/data`
- `apps/server/.env`

### 4. 远端构建缓存处理

在远端删除以下目录或文件后再构建：

- `packages/shared/dist`
- `apps/web/dist`
- `apps/server/dist`
- `packages/shared/tsconfig.tsbuildinfo`
- `apps/web/tsconfig.tsbuildinfo`
- `apps/server/tsconfig.tsbuildinfo`

目的是避免共享包与增量缓存不一致，导致远端 `@ultraman/shared` 解析失败。

### 5. 远端构建

按固定顺序：

1. `pnpm install --prod=false`
2. `pnpm --filter @ultraman/shared run build`
3. `pnpm --filter @ultraman/web run build`
4. `pnpm --filter @ultraman/server run build`

### 6. 运行时补充

远端构建结束后，需要把：

- `apps/server/src/db/schema.sql`

复制到：

- `apps/server/dist/db/schema.sql`

否则后端启动时会因为找不到 schema 文件而退出。

### 7. 服务处理

保留现有 `.env`，如不存在则生成。

然后：

- 更新 `systemd` service 文件
- `systemctl daemon-reload`
- `systemctl restart ultraman-monopoly`

不在本次脚本里重配 nginx 端口逻辑，默认沿用服务器当前已经跑通的配置。

原因：

- 这台机器已有端口冲突历史
- nginx 当前已经稳定服务首页与 `/api/healthz`
- 一键部署主要关注“更新当前应用内容”，而不是“重新初始化整台机器”

## 错误处理

脚本应在以下场景直接失败退出：

- 本地预检查失败
- 本地同步失败
- 远端构建失败
- 服务重启失败
- 健康检查失败

并输出明确步骤名，方便定位是：

- sync failed
- shared build failed
- web build failed
- server build failed
- restart failed
- health check failed

## 验证

脚本成功后至少输出：

- `systemctl status ultraman-monopoly` 的摘要
- `curl http://127.0.0.1:3001/healthz`
- `curl http://127.0.0.1/api/healthz`
- `curl http://47.245.125.9/api/healthz`

## 不做的事

本次不做：

- 把真实密码提交到仓库
- 改造成通用云平台安装器
- 自动切换服务器端 Node 大版本
- 自动重配 nginx 监听端口
- 自动安装全新机器基础环境

这些属于“首装脚本”职责，不属于“日常一键更新部署”职责。
