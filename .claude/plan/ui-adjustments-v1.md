# UI 调整计划 v1 · 素材 / 去倒计时 / 一屏显示

**Spec source**：用户诉求 (2026-04-19)
**Scope**：只改 UI 层 + 一个 feature flag 模块，不触及领域/数据层
**Execution target**：`/ecc:multi-execute`

---

## 一、Analysis Summary

### 用户诉求（三项）
1. **素材替换**：家长把奥特曼/怪兽/武器真图放进 `public/assets/`，UI 自动识别；文件缺失时优雅降级到现有色块+首字母
2. **倒计时暂时移除，口子留着**：隐藏 CountdownBar 并停止超时判定，但保留 `countdownSeconds()`、`startedAt/deadlineAt`、`CountdownBar` 组件、`quizTimeout()` 逻辑，未来改一个 flag 就恢复
3. **尽量一屏显示**：所有主要界面在 iPad 横屏（~1180×820）不滚动翻页

### Claude + Codex 一致点（高可信）
- **素材**：走"**ID 约定 + 运行时探测 + 多级回退**"路线。Vite `public/` 不能做构建期发现，必须运行时 `<img onError>` 回退
- **Timer flag**：用 **应用内 config 模块**（`src/config/features.ts`）而非 Vite 环境变量 —— 产品开关不是部署配置
- **一屏**：`min-h-screen` + 垂直堆叠 = 必然溢出。改用"**一屏外壳**"模式：`h-[100svh] overflow-hidden` + 内部 `grid/flex` 明确行高 + 可缩区域 `min-h-0`

### Codex 补充（Claude 需警惕的盲点）
- `tick()` 当前**只在 monopoly 阶段**触发 `quizTimeout`（见 gameStore.ts:380），boss 阶段答题本身就没有超时保护 —— flag 未来重启时要一并修这个漏洞
- 别把素材都套进"圆形头像"模板：英雄肖像可以圆裁，Boss 立绘和武器图很多不适合圆形，改用 `object-contain` + 中性底色
- ResultScreen / SettleScreen 也有同样的垂直堆叠问题，虽不在用户明说的列表里，但不改会产生一致性断层 —— 顺带改掉
- iPad 软键盘弹出时 viewport 高度骤降（answer input 题尤甚），压缩策略必须考虑
- 4K TV 投屏：compact mode 触发条件应看"玩家数 + viewport 高度"，不要只看宽度断点
- 板面上的小圆点（property owner 指示、player 指示）**不要换真图**，12-20px 太小读不清；继续保留色块+首字母

### Claude 的附加考虑
- 每个 assets 子目录放 `README.md` 解释命名约定
- `HeroAvatar` 组件暴露 `size` prop（sm/md/lg/xl）和 `fallback` slot；让调用方决定回退内容（板面用玩家首字母，设置/结算用英雄首字母）
- 扩展 `ImageResolver` 通用到 weapons/bosses，不止英雄
- 用 `100svh` 单位而不是 `100vh`，对 Safari 更稳

---

## 二、Technical Solution（三个改动合一交付）

### 改动一 · 素材替换（Asset Drop-in）

**核心思路**：基于 ID 的约定路径 + 运行时探测 + 优雅回退。

**路径约定**（新增空目录 + README）：
```
apps/web/public/assets/
├── heroes/
│   ├── README.md              # 解释命名：tiga.png / zero.png / decker.png / belial.png
│   ├── tiga.png  ← 家长放置
│   ├── zero.png
│   ├── decker.png
│   └── belial.png
├── monsters/
│   ├── README.md              # zetton.png / gomora.png / ...（共 18 只）
│   └── <bossId>.png
└── weapons/
    ├── README.md              # tiga-zepellion.png / zero-slash.png / ...（共 8 件）
    └── <weaponId>.png
```

**resolver 函数**（新建 `src/theme/assetResolver.ts`）：
```ts
export const resolveHeroImage = (heroId: HeroId, explicit?: string): string => {
  if (explicit) return explicit;
  return `/assets/heroes/${heroId}.png`;
};
export const resolveMonsterImage = (bossId: string, explicit?: string): string => {
  if (explicit) return explicit;
  return `/assets/monsters/${bossId}.png`;
};
export const resolveWeaponImage = (weaponId: string, explicit?: string): string => {
  if (explicit) return explicit;
  return `/assets/weapons/${weaponId}.png`;
};
```
注：**只约定 `.png`**（单一扩展名简化回退逻辑）。家长可用在线转换把 SVG/JPG 转成 PNG 放进来。

**新增组件 `src/ui/ImageWithFallback.tsx`**：
```tsx
export const ImageWithFallback = ({
  src,
  alt,
  fallback,      // ReactNode，图片加载失败时替换
  className,
}: Props) => {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
};
```

**新增组件 `src/theme/ultraman/HeroAvatar.tsx`**（大屏用）：
```tsx
type Size = 'sm' | 'md' | 'lg' | 'xl';
// sm=32, md=48, lg=72, xl=128
export const HeroAvatar = ({ heroId, size = 'md', fallback }: Props) => {
  const hero = getHero(heroId);
  const dim = SIZE_MAP[size];
  return (
    <div
      className={`rounded-xl overflow-hidden flex items-center justify-center`}
      style={{ width: dim, height: dim, backgroundColor: hero.color }}
    >
      <ImageWithFallback
        src={resolveHeroImage(heroId, hero.imageUrl)}
        alt={hero.name}
        className="w-full h-full object-contain"
        fallback={
          fallback ?? (
            <span style={{ color: hero.accent, fontSize: dim * 0.5, fontWeight: 900 }}>
              {hero.name[0]}
            </span>
          )
        }
      />
    </div>
  );
};
```

**扩展 HeroProfile**（`heroes.ts`）：
```ts
export type HeroProfile = {
  id: HeroId;
  name: string;
  color: string;
  accent: string;
  tagline: string;
  imageUrl?: string;  // 新增：显式覆盖
};
```

**消费者更新**（5-7 处，全都走 `HeroAvatar` 或 `ImageWithFallback`）：
| 文件 | 变更 |
|---|---|
| `HeroSelect.tsx` line 149-167 | 英雄选择按钮改用 `HeroAvatar size="lg"`，回退字母 |
| `PlayerPanel.tsx` line 22 | 玩家头像改 `HeroAvatar size="md" fallback={玩家名首字}` |
| `Board.tsx` line 121-136 | 板上玩家 token **保留**色块+首字母（太小读不清真图） |
| `Board.tsx` line 114 | 地产主的小色点 **保留** |
| `BossScene.tsx` line 37-39 | Boss 立绘改 `ImageWithFallback`，回退 🧟 emoji |
| `BossScene.tsx` line 72-77 | 贡献列表头像改 `HeroAvatar size="sm"` |
| `BossScene.tsx` line 92-97 | 攻击者头像改 `HeroAvatar size="md"` |
| `WeaponCabinet.tsx` line 27 + 40-45 | 英雄头像改 `HeroAvatar size="sm"`；武器图标走 `ImageWithFallback` + ⚡/🔒 回退 |
| `ResultScreen.tsx` line 36-40 | 排名玩家头像改 `HeroAvatar size="lg"` |
| `SettleScreen.tsx` line 35-41 | 结算玩家头像改 `HeroAvatar size="md"` |

### 改动二 · 倒计时移除（Feature Flag）

**新增配置** `src/config/features.ts`：
```ts
export const features = {
  quizTimer: false,  // 暂时关闭答题倒计时；未来重启改为 true
} as const;
```

**2 处 gate**：

**A. `QuizModal.tsx` line 55-62**（只保留倒计时渲染的 gate）：
```tsx
{features.quizTimer ? (
  <CountdownBar startedAt={quiz.startedAt} deadlineAt={quiz.deadlineAt} nowMs={nowMs} difficulty={quiz.question.difficulty} />
) : null}
```

**B. `gameStore.ts` line 380-392 tick()**（超时触发 gate）：
```ts
tick: (nowMs) => {
  const { game, activeQuiz } = get();
  if (!game) { set({ nowMs }); return; }

  if (features.quizTimer && activeQuiz && nowMs >= activeQuiz.deadlineAt) {
    set({ nowMs });
    void get().quizTimeout();
    return;
  }

  if (game.phase !== 'monopoly') { set({ nowMs }); return; }
  const elapsed = (nowMs - game.startedAt) / 1000;
  const budget = game.durationMin * 60;
  if (elapsed >= budget) {
    set({ nowMs });
    get().endGame('time-up');
    return;
  }
  set({ nowMs });
},
```

**Codex 发现的隐藏 bug 同步修复**：把倒计时判定挪到 `monopoly` 早退之前，这样将来 flag 开启时 boss 阶段的答题超时也能生效（现版 boss 阶段完全没有超时保护）。

**不动的**：
- `countdownSeconds()` 保持
- `startedAt/deadlineAt` 保持写入
- `CountdownBar` 组件保持
- `quizTimeout()` 逻辑保持
- `submitAnswer` / `quizTimeout` 里 boss-attack 分支保持

**效果**：孩子答题无超时压力；`features.quizTimer = true` 一行改动即可恢复。

### 改动三 · 一屏显示（One-Screen Shell）

**总策略**：所有主屏使用统一外壳模式：
```tsx
<div className="h-[100svh] overflow-hidden bg-slate-950 text-slate-50">
  <div className="h-full grid grid-rows-[auto_1fr_auto]"> {/* header / body / footer */}
    ...
    <div className="min-h-0 overflow-hidden"> {/* 限制 body 不撑破 */}
  </div>
</div>
```

**分屏具体改动**：

**a. HeroSelect（最高风险）**：
- 当前：header (~120px) + 时长 (~120px) + 玩家卡片（每张 ~180px × 1-5 行）+ CTA (~100px) → 5 玩家时 >1000px，溢出
- 改成 3 行布局：`grid-rows-[auto_1fr_auto]`
  - **Row 1（header + 时长）**：把标题和时长做成一行 - 左标题、右时长三按钮
  - **Row 2（玩家卡片）**：`grid-cols-2 md:grid-cols-3`；每卡高度固定 ~150px；内部用 **紧凑布局**：名字输入 / 孩子复选框 / 4 英雄头像（改用 `HeroAvatar size="md"` 更紧凑）一行排开
  - **Row 3（footer）**：+/- 控件 + 开始游戏 CTA 合成一行
- 4-5 玩家时卡片变 3 列，保持 2 行不突破

**b. BossScene（第二风险）**：
- 当前：纯垂直 4 节 → 5 玩家时超过屏高
- 改成 **左右分栏**：`grid-cols-[1fr_320px] grid-rows-[auto_1fr_auto]`
  - **Left column**：Boss 卡（含立绘 / HP 血条） + 攻击控制面板（武器选择 + 出招按钮）
  - **Right column**：战场贡献列表（5 玩家纵向排列，每行 compact）
  - **Bottom**：胜利/失败 + 放弃按钮

**c. SettleScreen**（用户没点名，但一并修）：
- 改 `grid-rows-[auto_1fr_auto]`，玩家战力列表在中间可收缩区，底部固定 CTA

**d. GameScreen**（中等风险）：
- 已经是 `lg:grid-cols-[1fr_320px]` 两栏，但 PlayerPanel 纵向排列 5 玩家会溢出
- 改 PlayerPanel 增加 `compact` 属性：`players.length >= 4` 时每张卡片高度收到 64px（行内显示 名字/金币/地产数），否则保持现样式

**e. ResultScreen**（低风险）：
- 改用 `grid-rows-[auto_1fr_auto]`，排名列表走 `overflow-y-auto` 内部滚动（若真超屏）；但 **优先**压缩行高到 64px

**f. MainMenu / ReviewMode**（低风险）：
- 套一屏外壳 `h-[100svh] overflow-hidden`；视觉不变

---

## 三、Implementation Steps

| # | 步骤 | 交付 | 执行者 |
|---|---|---|---|
| 1 | 新建 `src/config/features.ts` | `features.quizTimer = false` 常量 | Claude |
| 2 | 改 `QuizModal.tsx` gate CountdownBar 渲染 | 隐藏倒计时 UI | Claude |
| 3 | 改 `gameStore.ts` tick() gate timeout + 修 boss 阶段漏洞 | 倒计时不再触发 quizTimeout | Claude |
| 4 | 新建 `apps/web/public/assets/{heroes,monsters,weapons}/README.md` | 命名约定说明 | Claude |
| 5 | 扩展 `HeroProfile` 加 `imageUrl?` | heroes.ts 改一行 | Claude |
| 6 | 新建 `src/theme/assetResolver.ts` | 3 个 resolve 函数 | Claude |
| 7 | 新建 `src/ui/ImageWithFallback.tsx` | 通用 img + onError | Claude |
| 8 | 新建 `src/theme/ultraman/HeroAvatar.tsx` | 4 个 size 的英雄头像 | Claude |
| 9 | 单测：assetResolver + HeroAvatar 回退 | 4-6 条 Vitest | Claude |
| 10 | 改 HeroSelect：头像 + 紧凑布局 + 一屏外壳 | 最大改动 | Claude + Codex |
| 11 | 改 BossScene：头像 + 左右分栏 + 一屏外壳 | 第二大改动 | Claude + Codex |
| 12 | 改 SettleScreen：头像 + 一屏外壳 | 小改动 | Claude |
| 13 | 改 PlayerPanel：头像 + 紧凑模式 | 小改动 | Claude |
| 14 | 改 GameScreen：传 compact prop | 1 行改动 | Claude |
| 15 | 改 ResultScreen：头像 + 一屏外壳 + 压缩行 | 小改动 | Claude |
| 16 | 改 Board.tsx：地产主/玩家 token 不动；注释说明 | 0 改动，只加注释 | Claude |
| 17 | 改 WeaponCabinet：头像 + 武器图 | 小改动 | Claude |
| 18 | 改 MainMenu / ReviewMode：一屏外壳 | 小改动 | Claude |
| 19 | 运行 `pnpm -r run typecheck lint test` | 全绿 | Claude |
| 20 | E2E：Playwright viewport 1180×820 验证不滚动 | 1 个新测试 | Claude |
| 21 | Codex review 最终 diff | 审校报告 | Codex |
| 22 | commit | git | Claude |

---

## 四、Key Files

| File | Operation | Description |
|---|---|---|
| `apps/web/src/config/features.ts` | NEW | 功能开关集中处 |
| `apps/web/src/theme/assetResolver.ts` | NEW | ID → URL 约定 |
| `apps/web/src/ui/ImageWithFallback.tsx` | NEW | 通用图 + onError 回退 |
| `apps/web/src/theme/ultraman/HeroAvatar.tsx` | NEW | 4 size 英雄头像组件 |
| `apps/web/src/theme/ultraman/heroes.ts:3` | MODIFY | 加 `imageUrl?` 字段 |
| `apps/web/public/assets/heroes/README.md` | NEW | 命名约定 |
| `apps/web/public/assets/monsters/README.md` | NEW | 命名约定 |
| `apps/web/public/assets/weapons/README.md` | NEW | 命名约定 |
| `apps/web/src/features/quiz/QuizModal.tsx:55` | MODIFY | gate CountdownBar |
| `apps/web/src/stores/gameStore.ts:380` | MODIFY | tick gate + boss 阶段漏洞修 |
| `apps/web/src/features/setup/HeroSelect.tsx` | REWRITE | 一屏外壳 + 紧凑玩家卡 |
| `apps/web/src/features/boss/BossScene.tsx` | REWRITE | 左右分栏 + HeroAvatar |
| `apps/web/src/features/settle/SettleScreen.tsx` | MODIFY | 一屏外壳 |
| `apps/web/src/features/result/ResultScreen.tsx` | MODIFY | 一屏外壳 + 压缩 |
| `apps/web/src/features/players/PlayerPanel.tsx` | MODIFY | compact prop |
| `apps/web/src/features/game/GameScreen.tsx` | MODIFY | 传 compact |
| `apps/web/src/features/players/WeaponCabinet.tsx` | MODIFY | 头像 + 武器图 |
| `apps/web/src/features/menu/MainMenu.tsx` | MODIFY | 一屏外壳 |
| `apps/web/src/features/review/ReviewMode.tsx` | MODIFY | 一屏外壳 |
| `apps/web/src/features/board/Board.tsx` | MINIMAL | 加一行注释解释为何不换真图 |
| `apps/web/tests/e2e/fitsInViewport.spec.ts` | NEW | Playwright 检查每屏不滚动 |
| `apps/web/src/theme/__tests__/assetResolver.test.ts` | NEW | resolver 单测 |

---

## 五、Risks and Mitigation

| 风险 | 严重度 | Mitigation |
|---|---|---|
| 家长忘了放图 → broken image 图标 | HIGH | `ImageWithFallback` onError 立即切回退；不产生 broken icon |
| 图片尺寸不一/非方形 | MEDIUM | 全部用 `object-contain` + 背景色块兜底 |
| iPad 软键盘弹出挤压屏幕 | MEDIUM | input 题采用 sticky footer + 内部 overflow；100svh 自动考虑 |
| 4K 投屏字号偏小 | LOW | compact mode 只按 `players.length >= 4` 触发，不按屏宽 |
| 隐藏的 timer flag 未来启用时 boss 阶段无效 | MEDIUM | 本次就修 tick() 把 timeout 挪到 monopoly 早退前 |
| HeroAvatar 在 Board 12px 小圆点用不合适 | LOW | Board 继续保留色块+首字母，注释说明 |
| 改动面积大，引入回归 | MEDIUM | 保持领域层零改动；只改 UI + 1 个 flag；跑完整 CI |

---

## 六、Test Strategy

| Test Type | Scope | Verification |
|---|---|---|
| Unit (Vitest) | `assetResolver.ts` | 3 种 ID + 显式 URL 覆盖 |
| Unit (Vitest) | `ImageWithFallback` | onError 触发时渲染 fallback |
| Unit (Vitest) | `HeroAvatar` | 4 个 size 渲染 / 回退字母正确 |
| Unit (Vitest) | `gameStore.tick` | flag=false 不触发 quizTimeout / flag=true 触发（新增测试） |
| E2E (Playwright) | 1180×820 viewport | HeroSelect 5 玩家不滚动、BossScene 5 玩家不滚动、ResultScreen 不滚动 |
| E2E (Playwright) | 现有 smoke/fullLoop | 依然通过 |
| 视觉 | 不测试（家长肉眼验证） | 手动 |

**一屏断言方法**（E2E 伪代码）：
```ts
const body = await page.evaluate(() => ({
  scrollHeight: document.body.scrollHeight,
  clientHeight: document.body.clientHeight,
}));
expect(body.scrollHeight).toBeLessThanOrEqual(body.clientHeight);
```

---

## 七、Execution Model Routing

| 任务 | 执行者 | 模型 |
|---|---|---|
| 配置/resolver/组件（代码量 < 50 行） | Claude | Opus 4.7 直写 |
| HeroSelect 重写（~200 行） | Codex → Claude 审 | GPT-5.4 |
| BossScene 重写（~160 行） | Codex → Claude 审 | GPT-5.4 |
| 单测文件 | Claude | 直写 |
| E2E 新测试 | Claude | 直写 |
| 终审 | Codex | 复用 SESSION_ID |

---

## 八、Open Questions（影响实施前请 confirm）

| Q | Codex 建议 | Claude 建议 |
|---|---|---|
| Boss/武器图是否走相同 drop-in 约定？ | 是，统一 | 建议与英雄一致（更一致的维护体验） |
| 板面小玩家 token 是否换真图？ | 否，保持色块+首字母（12-20px 读不清真图） | 同意，注释说明即可 |
| 加专用"矮屏横屏"Tailwind 断点吗？ | 否，用 100svh + 按玩家数触发 compact | 同意，不加断点 |

若无异议，将以上三个答案（Y/N/N）作为默认执行配置。

---

## 九、SESSION_ID (for /ecc:multi-execute)

- CODEX_SESSION: `codex-1776555975-66166`

---

**预计工作量**：约 2-3 小时连续编码 + 30 分钟 QA。总 22 个 step，Codex 调度 ~3 次（HeroSelect / BossScene 重写 + 终审）。
