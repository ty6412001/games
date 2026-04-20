# 赛罗贝利亚头像替换设计

## 目标

将前端当前仍使用占位素材的 `赛罗`、`贝利亚` 头像替换为仓库 `pic_src/` 中的真实图片，同时保持 `迪迦`、`德凯` 的现状不变。

## 方案

采用最小改动方案：

- 将 `pic_src/赛罗.jpg` 复制到 `apps/web/public/assets/heroes/zero.jpg`
- 将 `pic_src/贝利亚.jpeg` 复制到 `apps/web/public/assets/heroes/belial.jpeg`
- 在 `apps/web/src/theme/ultraman/heroes.ts` 中仅为 `zero`、`belial` 添加显式 `imageUrl`

## 原因

- `HeroAvatar` 已支持显式图片地址优先，现有回退逻辑无需改动
- 不修改资源解析规则，避免影响 `decker`、`tiga` 及其它角色素材
- 资源格式沿用原始文件，减少额外转换步骤

## 验证

- 新增测试，确认 `zero`、`belial` 的 `imageUrl` 指向预期资源
- 运行 web 侧相关 Vitest 用例，确认角色配置未回归
