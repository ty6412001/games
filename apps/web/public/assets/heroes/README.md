# Heroes 素材目录

把奥特曼头像放在这里，UI 会自动读取。

## 命名约定

| 文件名 | 对应英雄 |
|---|---|
| `tiga.png` | 迪迦 |
| `zero.png` | 赛罗 |
| `decker.png` | 德凯 |
| `belial.png` | 贝利亚 |

## 要求

- 格式：PNG（透明底更佳）
- 推荐尺寸：256×256 或更高
- 宽高比：任意（组件用 `object-contain`）

## 缺失处理

文件不存在时，UI 自动回退到英雄色块 + 首字母（无需操作）。

## 本地测试

放入文件后刷新浏览器（无需重启 dev server）。生产环境需重新 `pnpm --filter @ultraman/web run build`。
