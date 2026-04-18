# 部署手册

目标：在一台内网云主机上跑起奥特曼亲子大富翁，供家里 iPad 访问并投屏到电视。

## 硬件与系统建议

- **最低**：1 vCPU / 1 GB RAM / 10 GB 硬盘
- **推荐**：2 vCPU / 2 GB / 20 GB
- **系统**：Ubuntu 22.04 LTS / 24.04 LTS（x86_64 或 arm64）
- **网络**：机器在你家 LAN 里，防火墙只暴露 80/8080 给内网

## 一键安装

```bash
# 1. 把仓库拷贝到机器
scp -r ./ user@192.168.x.y:/tmp/ultraman/

# 2. SSH 进去执行
ssh user@192.168.x.y
sudo bash /tmp/ultraman/deploy/install.sh /opt/ultraman-monopoly
```

`install.sh` 会自动：

- 安装 Node 20 + pnpm + nginx + sqlite3
- 拷贝代码到 `/opt/ultraman-monopoly`
- 构建前端和后端
- 生成随机 `JWT_SECRET` 和家庭口令（脚本最后会打印，请记录）
- 配置 systemd 服务 `ultraman-monopoly.service`
- 配置 nginx 反代（前端 8080，后端走 `/api` 路径）
- 安装每日 03:00 SQLite 自动备份

完成后浏览器打开 `http://<机器IP>:8080`。

## 常用运维命令

| 操作 | 命令 |
|---|---|
| 查看状态 | `sudo systemctl status ultraman-monopoly` |
| 重启服务 | `sudo systemctl restart ultraman-monopoly` |
| 查看日志 | `sudo journalctl -u ultraman-monopoly -f` |
| nginx 日志 | `sudo tail -f /var/log/nginx/ultraman-*.log` |
| 手动备份 | `sudo /usr/local/bin/ultraman-backup.sh` |
| 查看口令 | `sudo cat /opt/ultraman-monopoly/apps/server/.env` |
| 修改口令 | 编辑 `.env` 改 `FAMILY_PASSWORD` → 重启服务 |
| 查看错题 | `sqlite3 /opt/ultraman-monopoly/apps/server/data/family.db 'SELECT * FROM wrong_book LIMIT 20;'` |
| 恢复备份 | `gunzip -c /opt/.../backups/family-YYYYMMDD-HHMMSS.db.gz > /opt/.../apps/server/data/family.db` 然后重启服务 |

## 目录结构（部署后）

```
/opt/ultraman-monopoly/
├── apps/
│   ├── web/dist/              # nginx 提供的静态文件
│   └── server/
│       ├── dist/              # 编译后的后端
│       ├── data/
│       │   ├── family.db      # SQLite 数据库
│       │   └── backups/       # 每日备份 (7 天)
│       └── .env               # 环境变量（含口令）
├── deploy/
└── packages/shared/dist/
```

## 升级

1. 把新代码 rsync 到机器：`rsync -a --exclude node_modules --exclude apps/server/data ./ user@host:/tmp/ultraman/`
2. `sudo bash /tmp/ultraman/deploy/install.sh /opt/ultraman-monopoly`
3. 已有 `.env` 和 `data/` 会被保留，只覆盖代码

## 卸载

```bash
sudo systemctl stop ultraman-monopoly
sudo systemctl disable ultraman-monopoly
sudo rm /etc/systemd/system/ultraman-monopoly.service
sudo rm /etc/nginx/sites-enabled/ultraman-monopoly
sudo rm /etc/nginx/sites-available/ultraman-monopoly
sudo rm /etc/cron.d/ultraman-backup
sudo rm /usr/local/bin/ultraman-backup.sh
sudo nginx -t && sudo systemctl reload nginx
sudo rm -rf /opt/ultraman-monopoly   # 会删除数据库，先备份！
```

## 故障排查

- **首次登录报 401**：检查 `FAMILY_PASSWORD` 是否正确；5 次失败会锁 10 分钟
- **前端白屏**：检查 nginx 日志，确认 `apps/web/dist` 存在
- **API 502**：`systemctl status ultraman-monopoly`，看是否启动失败；检查 `.env` 的 `DATABASE_PATH` 是否可写
- **better-sqlite3 binding 缺失**：`cd /opt/ultraman-monopoly && sudo -u root pnpm rebuild better-sqlite3`
- **iPad 投屏字太小**：前端已按 rem 设计，未来可在设置页加"字号 ×1.2/×1.5"（v1.1）
