# 聚合页首屏 + CTA 黑白化 + flux-schnell 默认档盘点 · 待办清单（2026-11-09）

> 状态：**已全部实现、已推送、已上线**（arui `99e52af82`，2026-11-09 21:10）；详见 §6 决策 + §7 实施记录。
> 关联：上一批（视频积分 / 签名工具默认档 / 徽标黑白）已上线 arui `fe0e17372`。
> 协作：ab-team（frontend = `/Users/nico/Desktop/arui`）；本轮仍是纯前端，backend 不参与。
> 过程纪律：`docs/踩坑集锦.md` #1（未授权不派活）、#7（展示层改动要可验证）。

---

## 0. 需求复述（先确认理解一致）

| # | 你的原话 | 我的理解 |
|---|---|---|
| 1 | 还有哪些工具页默认显示的是 flux-schnell | **只盘点、不改**：列出当前仍以 flux-schnell 为默认档的工具页 |
| 2 | ai-image-generator 和 ai-video-generator 这两个聚合页，首屏改为跟 home 首屏布局、多模态输入框 | 这两个分类聚合页的 Hero 从「全屏背景图 + 白字 H1 + 紫色按钮」改成 **home 首屏那一套**：H1 + 副标题 + UnifiedPromptBar 多模态输入框 |
| 3 | 聚合页这个位置，颜色和按钮改为黑白、跟随主题（截图：紫色圆角块 "Start Creating Videos with AI" + 白色胶囊按钮） | 聚合页的 CTA 收尾块从 **紫底白字 + 白底紫字按钮** 换成 **主题黑白**（浅色=黑底白字、暗色=白底黑字），按钮同步反转 |

> 注：截图那块是每个聚合页底部的 **CTA Section**（`bg-primary` 圆角卡片），不是首屏；首屏是另一处紫色按钮（见 §1.3）。

---

## 1. 检查结果

### 1.1 默认档还是 flux-schnell 的工具：26 个（共 128）—— **2026-11-09 22:00 已全部改为 Seedream 4.0**（arui `df61614a4`，本地已提交、**未推送**）

**共同特征**：都是 17 档全池、默认档 `flux-schnell`（1 积分、**非 premium**）；上一批只把 3 个签名工具从 flux-schnell 换成了 Seedream 4.0，其余当时未授权，保持不动。

| 类别 | 数量 | 工具 |
|---|--:|---|
| 头像 / 人设 | 6 | ai-vtuber-maker、ai-face-generator、ai-pixel-avatar-maker、ai-body-generator、ai-anime-character-generator、illustration-generator |
| 手绘 / 动漫 | 5 | ai-doodle-generator、ai-manga-generator、ai-anime-art-generator、ai-anime-image-generator、ai-anime-picture-generator |
| 设计 / 图标 | 4 | ai-logo-maker、ai-icon-generator、ai-vector-generator、ai-coloring-book-generator |
| 图表 | 9 | ai-org-chart-maker、ai-er-diagram-generator、ai-data-flow-diagram-maker、ai-uml-diagram-generator、ai-spider-chart-maker、ai-architecture-diagram-generator、ai-flow-chart-maker、ai-hierarchy-chart-maker、ai-mind-map-generator |
| 其它 | 2 | ai-album-cover-generator、ai-wallpaper-generator |

> **执行结果（2026-11-09 22:00）**：26 个工具的 `defaultModelId` 全部 `flux-schnell → seedream-4`（26 行，仅 `app/config/canvas-tools.ts`）。
> - 默认积分 **1 → 9**（Seedream 4.0 固定 9），默认分辨率 1K → 2K，全部 premium（面板带 PREMIUM 徽标）
> - 校验：101 个 seedream-4 默认档全部能在线上 catalog 命中（0 问题）；`typecheck` / `build` / `verify:premium` 全绿
> - 提交：`df61614a4`（**未 push**，等后续一起推）
> - 口径说明：这 26 个工具页的 16 个 premium 档里，默认积分 <10 的只有 6 个（gpt-image 系列 4 / flux-3-image 7 / flux-2-pro 9 / seedream-4 9）；其中 flux-2-pro 存在「面板显示最低价 7、默认参数实际 9」的偏差，Seedream 4.0 无此问题，故选定它。

**若要换 premium，可选项（线上 catalog 实测）**
- 全工具最低价 premium：`gpt-image-1-5`（4 积分）— 26 个工具全部可用
- 同厂商（FLUX）最低价 premium：`flux-2-pro`（7 积分）
- 注意：本轮需求 1 只是盘点，**不在这批改**；要改请单独确认（26 行 `canvas-tools.ts`）。

### 1.2 两个聚合页首屏现状 vs home

| 维度 | ai-image-generator / ai-video-generator（现状） | home 首屏（目标参考） |
|---|---|---|
| 背景 | 全屏 `hero-bg.avif/webp` + 黑色渐变遮罩 | 无背景图，纯主题底色 |
| 文案 | H1 `hero.title`（白字）+ `hero.subtitle`（white/70） | H1 `hero.title` + `hero.description`（foreground / muted） |
| 交互 | 只有一个紫色按钮，点击滚动到 `#tool-cards` | **UnifiedPromptBar**（工具下拉 + 多模态输入 + 生成） |
| 高度 | `min-h-[90vh]` | `min-h-[90vh]` |
| 滚动指示 | 无 | ChevronDown → `#ai-tools` |
| 提交逻辑 | **不存在**（页面没有输入框） | `hero-section.tsx:66-180` 里 ~120 行：开新 tab → `POST /api/canvas-projects` → `savePendingTask` → 跳 `/ai-canvas/:id` |

**关键点**：提交链路（建项目 + 存首任务 + 新 tab 跳转 + 多模态参数透传）**只存在于 `hero-section.tsx`**。两个聚合页要加输入框，必须先把这段抽成可复用组件/hook，**不能在两个页面各抄一份**（`hero-section.tsx:110-170` 的注释已经记录过同类「4 份拷贝漂移」的教训）。

### 1.3 聚合页紫色盘点（截图那块 + 同页其它紫）

| 位置 | 文件:行（image / video） | 现状 | 建议 |
|---|---|---|---|
| **CTA 卡片容器** | `ai-image-generator._index.tsx:267` / `ai-video-generator._index.tsx:258` | `bg-primary`（紫 #635BFF） | `bg-foreground`（浅色=黑卡、暗色=白卡） |
| CTA 标题 / 副标题 | `:269` / `:272`（video `:260` / `:263`） | `text-white` / `text-white/80` | `text-background` / `text-background/80` |
| CTA 按钮 | `:278`（video `:269`） | `bg-white text-primary`（白底紫字胶囊） | `bg-background text-foreground`（黑白反转） |
| Hero 紫色按钮 | `:178`（video `:169`） | `bg-primary text-white` | 需求 2 会把它换成输入框 → 按钮消失；若保留则改黑白 |
| 工具卡标题 hover | `:233`（video `:224`） | `group-hover:text-primary` | 可选：改 `group-hover:text-foreground` |
| ErrorBoundary 按钮 | video `:305` / `:321` | `bg-primary text-white` | 可选：统一黑白 |
| 其它分类区块 hover | `app/components/OtherCategoriesSection.tsx:89` | `group-hover:text-primary` | 可选 |

**范围提醒**（已修正计数）：同款紫色 CTA 还存在于**另外 14 个聚合页**（3d-model / anime / avatar / background / character / design / diagram / music / passport-photo / photo / poster / signature / thumbnail-maker / voice），**共 16 个聚合页**。两种做法：
- **只改这 2 页**（最小授权），其余保持一致不动；
- **抽公共 `CategoryCtaSection` 组件，一次改 15 页**（diff 大但一劳永逸，且不会再漂移）。

---

## 2. 技术方案（供你选）

### 2.1 首屏复用（需求 2）
- **方案 A（推荐）**：把 `hero-section.tsx` 的"提交逻辑 + PromptBar 布局"抽成 `HeroPromptSection`（H1 / 副标题 / 默认工具 / 滚动目标可传参），home + 2 个聚合页共用 → 无拷贝、行为一致。
- 方案 B：两个聚合页各 inline 一份 → 3 份提交逻辑，后续必然漂移（不推荐）。

### 2.2 需要你定的细节
1. 聚合页 H1 下保留**各自原有的 `hero.subtitle`** 吗？→ 建议保留（SEO 文案不动，只换布局与交互）。
2. 输入框**默认工具**：image 页 = `ai-text-to-image`；video 页 = `ai-text-to-video`？
3. 工具下拉**范围**：全量 128 工具（与 home 一致）还是只本分类？→ 建议全量；只本分类要改 `UnifiedPromptBar` 支持过滤，成本更高。
4. 背景大图**去掉**吗？→ 建议去掉（home 无图）；`hero-bg` 资产保留不删。
5. 是否加**滚动指示器**（滚到 `#tool-cards`）？
6. SEO / 结构化数据 / 文案：**一律不动**（只改首屏布局与交互）→ 0 i18n 改动。

### 2.3 CTA 黑白化（需求 3）
- 4 个 class 替换（卡片 / 标题 / 副标题 / 按钮），暗色主题下自动反转，不需要新 token。
- 范围：仅 2 页 / 15 页统一（抽组件）。
- hover 紫色（工具卡、OtherCategories）是否一起改成黑白 → 待定。

---

## 3. 待办（草案，未授权）

### 批次 A · 盘点（本清单，已完成）
- [x] 26 个 flux-schnell 默认档工具清单
- [x] 两页首屏 / CTA 紫色位置逐行定位
- [x] 16 个聚合页同款 CTA 范围确认（此前口误 15，已修正）

### 批次 B · 抽组件 + 两页首屏替换（需求 2）
- [ ] 抽 `HeroPromptSection`（home 的 H1 + 副标题 + PromptBar + 提交逻辑参数化）
- [ ] home 改为使用该组件（回归）
- [ ] ai-image-generator / ai-video-generator 首屏接入（默认工具各自设置）
- [ ] 去掉两页 hero 背景图与紫色按钮；H1/副标题改主题色
- [ ] 验收：三页首屏一致；未登录点生成 → 登录弹窗；登录后 → 新 tab 开画布并带参；工具切换正常

### 批次 C · CTA 黑白化（需求 3）
- [ ] 按选定范围（2 页 or 15 页）改 CTA 卡片 / 标题 / 副标题 / 按钮
- [ ] 明暗四态目测（浅色黑卡白字、暗色白卡黑字；按钮反转）
- [ ] 验收：无残留紫色；移动端不溢出

### 批次 D（可选）· 页面其它紫色收尾
- [ ] 工具卡 hover、OtherCategories hover、ErrorBoundary 按钮 → 黑白

---

## 4. 风险清单

| 风险 | 影响 | 处置 |
|---|---|---|
| 抽组件动到 home 首屏 | 首页是流量入口，回归面大 | 批次 B 先跑 home 回归（桌面+移动、登录/未登录、各模态工具） |
| 首屏从大图变纯色 | 视觉变化明显，可能影响转化 | 建议先只改这 2 页看数据，再决定其它聚合页 |
| 提交逻辑搬迁 | 新 tab / popup 拦截 / 参数透传易漏 | 以 hero-section 现状为准逐行搬迁，保留 `pendingTask` 契约 |
| 15 页统一 CTA | 大 diff、跨页回归 | 单独一批，抽组件后逐页替换 |
| SEO | 只改布局与颜色，不动文案/结构化数据 | 不改 H1 文本、不动 JsonLd |

---

## 5. 用户决策记录（2026-11-09 20:45 已确认）

| # | 问题 | 决定 |
|---|---|---|
| 1 | 去掉背景大图 | ✅ 按建议，去掉（改 home 纯色 + 输入框；资产未删） |
| 2 | 聚合页默认工具 | ✅ image = `ai-text-to-image`、video = `ai-text-to-video` |
| 3 | 工具下拉范围 | ✅ **本分类**（image 109 个 / video 11 个，按 `resolveOutputType` 过滤；未改 UnifiedPromptBar 内部） |
| 4 | CTA 黑白化范围 | ✅ **16 个聚合页统一**（抽 `CategoryCtaSection` 组件） |
| 5 | hover 紫 | ✅ 一起改黑白（tool card hover + OtherCategoriesSection） |
| 6 | 批次 | ✅ 一起做，完成后提交推送 |

---

## 6. 实施记录（2026-11-09 21:10）

**arui commit**：`99e52af82 feat(category): 聚合页首屏改多模态输入框(本分类) + 16 页 CTA/按钮/hover 黑白化`（20 files, +468/−772，已 push，Deploy 流水线已触发）

**新增组件**
- `app/components/marketing/hero-prompt-section.tsx`：从 `hero-section.tsx` 原样抽出「H1 + 副标题 + UnifiedPromptBar + 提交链路 + 登录/积分拦截 + canvas 预取 + 可选滚动指示」；props `title/subtitle/tools/defaultToolSlug/scrollTargetId?/scrollLabel?`
- `app/components/marketing/category-cta-section.tsx`：黑白反色 CTA（`rounded-2xl bg-foreground text-background` + `bg-background text-foreground` 按钮，暗色自动反转）

**改动**
- `hero-section.tsx` 214 → 29 行薄壳（导出名不变）
- image / video 两个聚合页：首屏换 `HeroPromptSection`（删 hero-bg 图片 + 双层渐变 + 紫按钮）；工具下拉按本分类过滤（109 / 11）
- 16 个聚合页：CTA → `CategoryCtaSection`；tool card hover → `group-hover:text-foreground`；14 页 hero 紫按钮 → 黑白；4 页 ErrorBoundary 按钮 → 黑白
- 额外收尾（Lead 复核时补）：anime / signature 两页 hero 的淡紫渐变 `from-primary/5` → `from-foreground/5`（否则仍是紫色调）

**验收**
```
pnpm typecheck        exit 0
pnpm verify:premium   62/54/8 PASS
npx eslint (20 文件)  0 errors（35 warnings 均为改动前既有）
pnpm build            ✓ 57.56s（16 页 × 32 locale 预渲染）
grep                  16 页 + OtherCategoriesSection 的 bg-primary|text-primary = 0
home 首屏             build 产物与改动前逐字一致（薄壳抽取行为等价）
```

**残余 / 建议目测**
1. 未跑 dev，四态视觉建议线上各抽 1 页看（CTA 黑白、hover、深色模式、移动端）。
2. `hero-bg` 资产仍保留（仅删引用）；image/video 两页不再有背景图。
3. 其余 14 个聚合页仍是图片 hero（只把按钮/CTA 改黑白），如后续要统一成 home 首屏需另立项。
