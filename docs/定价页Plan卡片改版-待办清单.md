# 定价页 Plan 卡片改版（对标竞品布局 · 保持黑白 + 事实）· 待办清单（2026-11-09）

> 状态：**只读检查完成 + 版式示例稿已出（未执行任何代码改动）**。示例稿：`docs/pricing-cards-mock-v5-2026-11-09.png`（v1–v4 已删除）。最终：**B 案 + 图标带品牌名 + 文案“Upgrade to unlock all advanced models”**。
> 依据：用户提供的竞品定价页截图（Pro $20 / Ultimate $40 / Max $80，三卡 + 模型权益块 + 折扣 logo 条 + 带 ? 的权益列表）+ 4 张 tooltip 截图。
> 三条口径：① 价格不动 ② 我们没有"免费无限使用的模型"，该块不上 ③ 布局尽量一致，颜色改黑白主题。

---

## 0. 需求复述（先确认理解）

| # | 你的话 | 我的理解 |
|---|---|---|
| 1 | 定价页 plan 想改为竞品这种布局，价格不要动，符合我们项目事实 | **三张卡（Free / Pro / Ultra）+ 权益列表 + 问号 tooltip** 的版式；价格保持 $0 / $18·$12 / $25·$20.83 不变；所有数字与权益必须能在代码/产品里对得上 |
| 2 | 我们没有免费无限使用的模型，没有就不用上 | 竞品的 **"Unlimited Model Benefits" 模型权益块**（每档列出哪些模型 Unlimited）**不做**；其附带的 **-70%/-50%/-40% 折扣 logo 条**（我们没有折扣体系）**也不做** |
| 3 | 布局尽量一致，颜色改我们的黑白主题 | 卡片结构/信息层级照竞品；配色走黑白（不再用紫色 ring/badge） |

---

## 1. 现状检查

### 1.1 当前定价页结构（`app/components/marketing/pricing-section.tsx`，768 行）

| 区块 | 现状 | 备注 |
|---|---|---|
| 页面 | `/pricing`（`app/routes/($locale).pricing.tsx`），**浅色主题** | 营销页，非工具页深色 |
| 计划卡片 | 3 列 grid（`max-w-5xl`）：Free / Pro / Ultra | `FreePlanCard` + `SubscriptionCard` |
| 价格 | Pro $18/月（年付 $12/月，$144/年）；Ultra $25/月（年付 $20.83/月，$250/年）；Free $0 | 数据源 `app/config/pricing.ts`，Stripe price env 对应 4 个 planId |
| 权益列表 | 只有 ✓（无 ✗、无问号 tooltip） | Pro：credits / priorityQueue / commercialUse / concurrency；Ultra：+ earlyAccess；Free：只有 credits |
| 促销标记 | Ultra `popular: true` → 右上角 `Popular` 徽章 + `ring-primary`（**紫色**） | 需改黑白 |
| 月付/年付切换 | 有（`BillingToggle`），另含 Ultra 专属「One-Time Points」tab | 保留（竞品只有 Billed Monthly，我们信息更全） |
| 一次性积分包 | 5,000/$25、10,000/$50，仅 Ultra 可购 | 保留 |
| 对比表 | `compareTable`（128 工具 × 档位的矩阵） | 保留，需检查紫/绿配色 |
| FAQ | 13 条 | 保留 |
| JSON-LD | Product/Offer 结构化数据（价格、billingDuration） | **价格不动就无需改**，改布局别忘同步 |

### 1.2 竞品布局拆解 → 我们的映射

| 竞品区块 | 我们做不做 | 说明 |
|---|---|---|
| 3 列卡片（名称/价格/Billed Monthly/大 CTA） | ✅ 做 | Free / Pro / Ultra，价格不动 |
| 右上角 "Recommended" 角标 | ✅ 做（文案待定，现为 `Popular`） | 黑白角标 |
| **"Unlimited Model Benefits" 模型权益块** | ❌ **不做**（按你的第 2 条） | 我们没有 unlimited 模型；且 premium 门禁（P7）还没上线，写"某档可用某模型"目前不成立 |
| 模型 logo 条 + **-70%/-50%/-40% 折扣徽章** | ❌ **不做** | 我们没有按模型折扣体系（不建议编造） |
| 权益列表（✓/✗ + 问号 tooltip） | ✅ 做 | 文案必须是我们真实权益（见 §2 事实核查） |
| "Up to N fast images / N basic videos" 数字 | ✅ 做（带 tooltip） | 用我们的真实积分单价换算（见 §3） |
| "Billed Monthly" 行 | ✅ 做（跟随我们的月/年切换） | — |

### 1.3 事实核查（关键！"符合项目事实"）

代码/产品里能验证的与我们现有文案的对照：

| 权益/说法 | 现有文案（pricing/settings i18n） | 代码证据 | 结论 |
|---|---|---|---|
| 积分额度 | Free 10/天、Pro 2,000/月、Ultra 5,000/月 | `pricing.ts` + 每日重置逻辑 | ✅ 真实 |
| 并发数 | Pro 2 / Ultra 4 / Free 1 | `lib/subscription.ts` `CANVAS_CONCURRENCY` | ✅ 真实 |
| 商业授权 | "Commercial license for all generated content" | FAQ q2 同口径 | ✅ 可保留（法律承诺） |
| 年付优惠 | $144/年、$250/年，省 17%+ | `pricing.ts` yearlySaving | ✅ 真实 |
| 一次性积分包 | Ultra 专属 5,000/$25、10,000/$50 | `pricing.ts` + 购买 API 校验 | ✅ 真实 |
| **优先队列 / 最高优先队列** | Pro "Priority queue"、Ultra "Highest priority queue" | **代码里没有任何队列优先级实现**（`generation-queue.server.ts` 只有 `created_at` 排序；`priority` 仅出现在 sitemap） | ⚠️ **待确认**：要么实现，要么文案删掉 |
| **无水印 / Free 有水印** | Free "Watermark included"；Pro/Ultra "No watermarks" | **worker/前端都没有加水印逻辑**（grep 只在 prompt 文案里出现） | ⚠️ **待确认**：目前"Free 有水印"与实现不符 |
| **Early access** | Ultra "Early access to new features" | 无对应发布机制/证据 | ⚠️ 待确认 |
| **Full privacy（不用于训练）** | 隐私政策页无该承诺（grep 无 training 相关表述） | 需法务/业务确认 | ⚠️ 待确认 |
| **Batch processing** | 竞品有，我们没有 | 批量出图能力已下线（num_images） | ❌ 不做 |
| **All models（每档）** | Pro/Ultra "All models" | 目前所有档都能用全部模型（无门禁）；premium 门禁 P7 未上线 | ✅ 现在真实，但一旦上 P7 文案要改 |
| 128 个工具 / 54 个高级模型 / 14 个供应商 | — | 实测：128 工具、62 模型档（54 premium）、14 供应商 | ✅ 可作为通用卖点 |

---

## 2. 我们的真实数字口径（用于卡片里的 "Up to N …"）

按线上 catalog 实测（2026-11-09）：

| 口径 | 单价 | 说明 |
|---|---|---|
| **Fast image（最快最便宜）** | **1 积分/张** | FLUX Schnell 1K（仍为可选档，非 premium） |
| 典型图片（默认档） | 9 积分/张 | Seedream 4.0 2K（26+ 工具默认档，2026-11-09 起） |
| **Basic video（最便宜）** | **20 积分/条**（480P · 5s） | MiniMax H3 Lite：480P 4 积分/秒 × 5s；4s = 16 积分 |
| 高级视频 | 240–355 积分/条 | Kling 4.0 / Veo 3.1 等 5s 档 |

换算（可直接写进权益列表 + tooltip）：

| 档 | 积分 | 最多 fast images | 最多 basic videos（5s/480P） |
|---|--:|--:|--:|
| Free | 10/天 | ~10/天 | 0（不够 1 条） |
| Pro | 2,000/月 | ~2,000 | ~100 |
| Ultra | 5,000/月 | ~5,000 | ~250 |

> 竞品写 "2,000 credits → 2,000 images / 200 videos"（他们按 10 积分/视频）；我们视频更贵（20 积分/条），所以是 ~100 条 —— 这是"实事求是"的差异点，不要照抄。

---

## 3. 目标版式（黑白）

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Free             │ │ Pro        ★推荐  │ │ Ultra            │
│ $0               │ │ $18 /month       │ │ $25 /month       │
│ Billed monthly   │ │ Billed monthly   │ │ Billed monthly   │
│ [ Get started ]  │ │ [ Upgrade to Pro]│ │ [ Upgrade to Ultra]
│ ──────────────── │ │ ──────────────── │ │ ──────────────── │
│ ✓ 10 credits/day │ │ ✓ 2,000 credits  │ │ ✓ 5,000 credits  │
│ ✓ 1 concurrent   │ │ ✓ 2 concurrent   │ │ ✓ 4 concurrent   │
│ ✗ 商业授权        │ │ ✓ 商业授权        │ │ ✓ 商业授权        │
│ (待定) 优先队列    │ │ (待定) 优先队列    │ │ ✓ 一次性积分包     │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

- 每行权益尾部（?）：hover/focus 出 tooltip（现成 `components/ui/tooltip.tsx`）；竞品 4 个 tooltip 的等价内容我们已有真实口径（§2）。
- 颜色：**浅色页 + 白卡 + 黑字**；CTA 黑底白字（hover 反白）；推荐角标黑底白字；当前档用黑边框 + "Current plan"；去掉 `ring-primary` / `bg-primary` 紫色。
- 备选（更像竞品）：**黑卡白字**（整卡 `bg-foreground text-background`），页面仍是浅色；暗色主题自动反转。

---

## 4. 待办（草案，未授权）

### 批次 P1 · 事实定稿（无代码，阻塞 P2）
- [ ] 业务确认 §1.3 里 4 个 ⚠️：优先队列 / 水印 / early access / 隐私承诺 —— 逐条给"保留 / 删掉 / 先实现"
- [ ] 确认 "All models" 现在是否继续对外说（P7 门禁上线后要改）
- [ ] 确认数字口径（fast image = FLUX Schnell 1 积分；basic video = MiniMax H3 Lite 480P 5s = 20 积分）

### 批次 P2 · 卡片版式重做（`pricing-section.tsx`）
- [ ] `SubscriptionCard` 重排：名称/角标 → 价格块（月/年切换沿用）→ CTA → 权益列表（✓/✗ + tooltip）
- [ ] `FreePlanCard` 同版式对齐（10 credits/day、1 并发、商业授权 ✗）
- [ ] 新增 `PlanFeatureRow`（文案 + included + tooltip）组件，数据表驱动（避免三卡各写一遍）
- [ ] 黑白化：popular 角标/边框/CTA 去紫（`ring-primary`→`ring-foreground`；`bg-primary`→`bg-foreground text-background`）
- [ ] 保留：月/年切换、One-Time Points tab、对比表、FAQ、JSON-LD（价格不动）
- [ ] 响应式：3 列 → 移动端单列；卡片高度对齐

### 批次 P3 · 文案与 i18n
- [ ] 新增 key（预计 15–20 条）：权益行文案、4 个 tooltip、角标文案（Popular→"Recommended"?）、"Billed monthly/yearly"
- [ ] 32 语翻译（可先 en 源 + 其余回退；但定价页是转化页，建议补齐）
- [ ] ⚠️ 定价页文案属营销文案（CLAUDE.md 第 4 条：已审核文案禁止改动）→ 新增文案需走你的审核，不改已审核句子

### 批次 P4 · 守卫（可选但建议）
- [ ] `scripts/verify-pricing-facts.ts`：把卡片里的硬编码数字（2,000 fast images / 100 videos）与线上 catalog 单价对账（FLUX Schnell=1、H3 Lite 480P=4/s×5=20），模型调价时报警

---

## 5. 需要你确认（阻塞）

1. **事实确认（最重要）**：优先队列、水印（Free 有水印/付费去水印）、early access、隐私"不用于训练"——这 4 条哪些是真实可承诺的？没有的我就从卡片删掉（含 settings 页同款文案的处理）。
2. **配色方案**：浅色页 + 白卡黑 CTA（推荐，与全站一致）还是 黑卡白字（更像竞品截图）？
3. **角标文案**：沿用 `Popular` 还是改 `Recommended`（新增 32 语 key）？
4. **数字口径**：fast images 按 1 积分（FLUX Schnell）、basic videos 按 20 积分（MiniMax H3 Lite 480P 5s）认可吗？还是你想用"典型档"（Seedream 4.0 9 积分）口径？
5. **范围**：对比表 / FAQ / 一次性积分包 / 月年切换都保留吧？
6. **文案审核与翻译**：新增文案你来审还是我起草后你审？32 语我机翻补齐可以吗？
7. **批次与推送**：P2–P4 一起做还是先做 P2 看效果？另外 arui 本地还有 1 个未推送 commit（`df61614a4` 默认档改 Seedream 4.0），这次要不要一起推？

---

## 6. 风险清单

| 风险 | 影响 | 处置 |
|---|---|---|
| 写了不实的权益（优先队列/水印/隐私） | 消费者误导、退款/合规风险 | P1 逐条确认；没证据就删 |
| 数字写死会随模型调价过期 | 文案与真实积分不符 | P4 守卫脚本 + 注释标注口径来源 |
| 定价页是转化页 + 有 JSON-LD | 改坏影响 SEO/结算 | 价格不动；只改版式；结构化数据最后回归 |
| 32 语新文案漏翻 | 非英文站显示英文 | 先 en，再补翻译；i18n lint 会 warn |
| 紫色残留（对比表/角标/边框） | 半紫半黑 | P2 完成后 grep `bg-primary|ring-primary|text-primary` 自证 |
| 一次改太大 | 回归面大 | 先做 P2（卡片），P3/P4 分批 |


---

## 7. 用户反馈与定稿（2026-11-09 22:49）

### 7.1 决策
| 项 | 决定 |
|---|---|
| 优先队列 / 无水印 | ✅ **真实，保留**（Pro Priority、Ultra Highest priority；Free 有水印、付费无水印） |
| Early access / 隐私"不用于训练" | ❌ 未确认 → **本轮不上**（若真实，补一句我再加） |
| 配色 | ✅ 浅色页 + 白卡 + 黑按钮（推荐方案） |
| 角标/标签 | ✅ 亮绿（`#D9E021`）；**角标由我定 = Recommended**（Ultra 卡右上）；如需换 Popular / Best value / 不显示，一句话即可 |
| 数字口径 | ❌ 不点名具体模型（会让用户以为订阅只对应一个模型）→ 改用竞品写法：**最快图片模型 ≈1 积分/张；最经济视频模型 480P·4s ≈16 积分/条**；tooltip 里强调 "Every model is available on every plan" |
| 保留 | 月/年切换、一次性积分包、对比表、FAQ（都保留不动） |
| 文案 | Lead 起草（§7.3），用户审 |

### 7.2 真实数字（卡片展示值）
| 档 | 积分 | fast images | basic videos（480P·4s，16 积分/条） |
|---|--:|--:|--:|
| Free | 10/天 | 10/天 | 0 |
| Pro | 2,000/月 | 2,000 | 125 |
| Ultra | 5,000/月 | 5,000 | 312 |

### 7.3 英文文案草案（en 源；32 语后续补）

**Free**：tagline "Try every tool with daily credits."；CTA "Start creating"
1. `10 credits per day`（? 每日 24h 重置，不累积）
2. `Up to 10 fast images per day`（? 见 tooltip A）
3. `1 concurrent generation`（? 同时进行的生成任务数）
4. `Standard queue`（? 按提交顺序排队）
5. `Watermark on outputs`（? 免费版输出带小水印）
6. ✗ `Commercial license`（? 商业授权需 Pro 及以上）

**Pro**（$18/月，年付 $12/月）：tagline "For creators shipping every week."；CTA "Upgrade to Pro"
1. `2,000 credits per month`（? 每个计费周期刷新，订阅期内不过期）
2. `Up to 2,000 fast images`（? tooltip A）
3. `Up to 125 basic videos`（? tooltip B）
4. `2 concurrent generations`
5. `Priority queue`（? 优先于标准队列）
6. `No watermarks`
7. `Commercial license`

**Ultra**（$25/月，年付 $20.83/月，角标 Recommended）：tagline "Most credits, top queue, full quality."；CTA "Upgrade to Ultra"
1. `5,000 credits per month`
2. `Up to 5,000 fast images`
3. `Up to 312 basic videos`
4. `4 concurrent generations`
5. `Highest priority queue`（? 队列最前，高负载也先跑）
6. `No watermarks`
7. `Commercial license`
8. `Buy extra credits anytime`（? 一次性积分包，仅 Ultra 可购）

**Tooltip A（fast images）**
> Estimated with the fastest image model at 1K — about 1 credit per image. Actual cost varies by model, resolution and quantity. Every model is available on every plan.

**Tooltip B（basic videos）**
> Estimated with our most economical video model at 480P and 4 seconds — about 16 credits per video. Other models, resolutions and durations cost more. Every model is available on every plan.

### 7.4 待确认（仅剩 2 条）
1. "标签用亮绿色" 是否也包括**把模型面板的 PREMIUM 徽标改回亮绿**？（上一批已按你选的方案 A 改成黑白反转；要改回 = 恢复 2 行 token + 1 处 class）
2. Free 的 "Watermark on outputs" 是否真实（免费版确实加水印）？若免费也不加水印，这行要删。

### 7.5 实施范围（待授权）
- 只改 `app/components/marketing/pricing-section.tsx`（卡片版式 + 黑白 + 亮绿角标/标签）+ `app/config/pricing.ts`（如需内嵌 feature 表）+ i18n `pricing` 命名空间新增 key
- **不动**：价格、Stripe planId、JSON-LD 价格、对比表、FAQ、一次性积分包、月年切换逻辑


---

## 8. 用户反馈 · 示例稿 v2（2026-11-09 23:11）

| 反馈 | 处理 |
|---|---|
| Free 的「每日 10 张快速图片」删除 | ✅ 已删；Free 现为 5 行：10 credits/day · 1 concurrent · Standard queue · Watermark on outputs · ✗ Commercial license |
| 竞品卡上有模型图标，示例没有，影响转化 | ✅ 已补：**A 页面级 logo 条**（用户 23:28 选定） |
| 旧示例删除 | ✅ `pricing-cards-mock-2026-11-09.png` 已删，新稿 `pricing-cards-mock-v2-2026-11-09.png` |

### 8.1 模型图标检查结论
- 资产现成：`public/brand/*.svg` 共 20 个厂商 logo（seedream / google / openai / flux / kuaishou / minimax / bytedance / alibabacloud / xai / elevenlabs / inworld / qwen / stability-ai / recraft / bria / tencent / topaz / hyper3d / pruna-ai / resemble-ai）。
- 事实：62 个模型档 / 14+ 家模型厂商 / 128 个工具，**所有档都能用全部模型**（premium 门禁 P7 尚未上线）。
- **不能照抄竞品的"分档模型权益表"**（他们靠 Unlimited/折扣做差异）；我们只能做"全档同等可用"的表达：
  - **A（推荐）**：卡片上方一条 logo 带 + "62 models · 14 model labs · 128 tools · All available on every plan" —— 最省空间、不虚构差异；
  - **B**：每张卡内嵌同一组 logo 行（"Works with all 62 models"）—— 更醒目、但三卡重复、卡片变高。
- 将来 P7（Pro/Ultra 门禁）上线后，可升级为"高级模型：Pro/Ultra 可用"的分档表达。


---

## 9. 排序与复用约束（2026-11-09 23:28 用户澄清）

**用户原话**：门禁是打算做了这个（定价页）再做的，因为已经区分好高级模型了，free 用不了高级模型；free 用户点高级模型生成、哪怕积分够也会弹窗；**弹窗直接复用定价页的 plan**。

### 9.1 结论：本批必须"可复用化"，不能写死
| 要求 | 含义 |
|---|---|
| 顺序 | **先做定价页 Plan 卡片改版（本批）→ 再做门禁 + 弹窗（下一批）** |
| Free 用不了高级模型 | 门禁上线后：Free 选中 premium 档点生成 → 弹窗（不看积分是否够） |
| 弹窗复用定价页 plan | 本次改版必须把 **PlanCard / PlanCardList 抽成独立组件**，并把 checkout 逻辑抽成 hook（`/api/checkout`、`/api/subscription-change`、`/api/portal-upgrade`、`/api/credits-purchase` 都在 `pricing-section.tsx` 内），否则弹窗复用时会复制一份结算逻辑 → 必然漂移 |

### 9.2 建议的组件边界（本批 P2 范围）
- `components/billing/plan-card.tsx`：纯展示（plan 数据 + 权益行 + tooltip + 角标 + 黑白/亮绿样式 + CTA 插槽/回调），**不含数据请求**；
- `components/billing/plan-card-list.tsx`：三卡布局（3 列 → 移动端单列），支持 `variant="page" | "modal"`（modal 更紧凑，可只显示付费两卡）；
- `hooks/use-plan-checkout.ts`：把 checkout / 降级 / 年付升级 / 一次性积分包 / 结果弹窗的状态与请求抽出来；
- `pricing-section.tsx`：只做组合（标题、月年切换、One-Time Points tab、对比表、FAQ、错误提示）；
- 下一批的门禁弹窗直接 `<PlanCardList variant="modal" />` + 同一个 `usePlanCheckout`。

### 9.3 ⚠️ 连带修订：模型 logo 文案不要写"所有档都能用"
门禁上线后 Free 用不了高级模型，所以：
- 现在**不要**在 logo 条写 "All available on every plan"（会变成假话）；
- 先用中性表述：`62 models · 14 model labs · 128 tools`；
- 门禁上线后在同一位置加一句 `Advanced models included with Pro and Ultra`（本期先不写，留好位置）。

### 9.4 本批不做（等门禁批）
- Free 点高级模型 → 弹窗（需要 P7 门禁：BFF 403 `PREMIUM_PLAN_REQUIRED` + 客户端拦截 + 复用本批 PlanCardList）
- 客户端的模型档与用户档位判断

### 9.5 仍待确认
1. logo 摆法 **A（页面级条）/ B（卡内行）**？
2. "标签用亮绿色" 是否也包括把模型面板 PREMIUM 徽标改回亮绿？
3. Free 的 `Watermark on outputs` 是否真实（免费版确实加水印）？


---

## 10. 用户反馈 · 示例稿 v3（2026-11-09 23:40）

| # | 反馈 | 处理 |
|---|---|---|
| 1 | logo 摆法按推荐 | ✅ **A 页面级 logo 条**（16 个厂商 logo 一横排 + "62 models · 14 model labs · 128 tools"） |
| 2 | PREMIUM 徽标**不改回亮绿** | ✅ 模型面板 PREMIUM 徽标保持黑白翻转（上一批成果保留）；定价页只用亮绿角标 |
| 3 | Free 也没有水印 | ✅ **三张卡全部删掉水印行**（Free 的 "Watermark on outputs"、Pro/Ultra 的 "No watermarks"），改为 logo 条下的页面级事实说明 **"No watermarks on any plan"** |

### 10.1 v3 卡片最终文案
- **Free**（4 行）：10 credits per day · 1 concurrent generation · Standard queue · ✗ Commercial license
- **Pro**（6 行）：2,000 credits per month · Up to 2,000 fast images · Up to 125 basic videos · 2 concurrent generations · Priority queue · Commercial license
- **Ultra**（7 行）：5,000 credits per month · Up to 5,000 fast images · Up to 312 basic videos · 4 concurrent generations · Highest priority queue · Commercial license · Buy extra credits anytime
- 页面级：`62 models · 14 model labs · 128 tools` + `No watermarks on any plan`
- 角标：Ultra 右上亮绿 `Recommended`；CTA 黑底白字；价格不动

### 10.2 ⚠️ 检查发现的连带问题：全站「水印」文案与事实不符
既然"Free 也没有水印"，以下现有文案是**假话**，需要单独清理（不在定价页改动范围内）：

| 位置 | 现文案 | 问题 |
|---|---|---|
| `locales/en/settings.json` 套餐权益 | "Watermark included (free plan). Upgrade to remove." | 明确错误 |
| `locales/en/ai-image-generator.json` FAQ | "the only difference is a watermark on output files, which is removed when you upgrade to Pro" | 错误 |
| `locales/en/ai-video-generator.json` FAQ | 同上（升级去除水印） | 错误 |
| `locales/en/ai-3d-model-generator.json` FAQ | "upgrading simply raises your daily limit and removes watermarks" | 错误 |
| `locales/en/photo-to-animation.json`（2 处）、`image-to-video.json`（2 处）、`text-to-video.json` | "removes watermarks / upgrade to remove watermarks" | 错误 |
| 其余 ~15 个 en 文件 | "no watermark / watermark-free" 类表述 | **正确**，保留 |

- 规模：`locales/en/` 有 **7 个文件**含错误表述；全站 32 语里 `watermark` 出现在 **117 个文件**（多数是"无水印"正确表述）。
- 建议：作为**独立批次 P7'（文案纠偏）**处理：改 en 源 7 处 → 32 语同步（机翻 + 人工抽查），并同步 settings 页套餐权益表。


---

## 11. 用户反馈 · 示例稿 v4（2026-11-09 23:45）

**决定：logo 从 A（页面级横条）改为 B（每张卡内部）**，旧示例 v3 已删除。

### 11.1 v4 结构
- 每张卡在 **CTA 下方** 增加一块浅灰内嵌面板：标题 `Works with 62 models from 14 labs` + 一行 10 个厂商 logo + `+6` 展开胶囊（宽 580px 卡片一行放不下 16 个）。
- 三卡等高（Free 行数少 → 底部留白；Ultra 7 行最高）。
- 页面级说明移到卡片下方一行灰字：`No watermarks on any plan · Cancel anytime · Secure checkout by Stripe`。
- 其余同 v3：价格不动、Free 无水印行、亮绿 Recommended 角标、PREMIUM 徽标保持黑白、tooltip 文案按 §7.3。

### 11.2 B 案的代价（实现时注意）
1. 卡片高度增加约 120px，三卡重复同一组图标（因为所有档模型相同）；
2. 窄屏（<768px 单列）时 logo 行要能换行或横向滚动，实现时用 `flex-wrap` + 最多两行；
3. 文案**不要**写 "All available on every plan"（门禁上线后不成立），中性写 "Works with 62 models from 14 labs"；
4. 图标资产复用 `public/brand/*.svg`（16 个厂商），`+6` 胶囊可 hover 展开完整列表（或直接不做展开，纯装饰 + 链接到工具页）。

### 11.3 执行前剩余确认
- 无阻塞项；可直接进入实现（PlanCard / PlanCardList / usePlanCheckout 组件化 + i18n 文案）。


---

## 12. 用户反馈 · 示例稿 v5（2026-11-10 08:00）

| # | 反馈 | 处理 |
|---|---|---|
| 1 | 卡内文案改为「升级以解锁所有高级模型」 | ✅ 改为 `Upgrade to unlock all advanced models` |
| 2 | 布局同截图：图标 + **品牌名在图标下方** | ✅ 2 行 × 5 个（MiniMax / Nano / GPT / Seedream / Veo / Seedance / Kling / Grok / Wan / FLUX），图标 44px、名字 10px 居中 |
| 3 | 我们的图标怎么全是黑白的 | ⚠️ 检查结论见 §12.1 —— 资产本身的问题 |

### 12.1 图标颜色检查（为什么全黑白）
- `public/brand/*.svg` 共 20 个，逐个解析 fill：
  - **彩色（4 个 fill 有饱和度）**：`google.svg`、`seedream.svg`
  - **单色灰（18 个）**：其余全部使用同一个 `#9CA3AF`（alibabacloud / bytedance / elevenlabs / flux / kuaishou / minimax / openai / qwen / stability-ai / tencent / topaz / xai / bria / hyper3d / inworld / pruna-ai / recraft / resemble-ai）
- 这不是渲染问题，是**资产本身就是单色占位风格**（当年为统一深色面板做的）。
- 三个方案：
  1. **换官方彩色 logo 资产（推荐）**：需补 18 个 SVG（来源 = 各厂商官方品牌页/品牌规范），注意商标使用规范与授权；模型面板、定价页会一起变彩色；
  2. **折中：品牌色淡底 + 单色 logo**（示例稿底部已示意）——视觉更齐，但不是官方彩色；
  3. 保持现状（单色）——与竞品对比吃亏，但零成本。
- 影响范围：`model-branding.ts` 的 icon 路径 + `public/brand/*.svg`，改完模型选择面板和定价页同时生效（1 处资产、2 处消费）。

### 12.2 ⚠️ 文案与真实性的时间差（必须定顺序）
「Upgrade to unlock all advanced models」只有在**门禁上线后**才成立。当前 Free 用户也能用高级模型（门禁 P7 未做）。
两种上线顺序：
- **A（推荐）**：门禁 + 定价页同一批上线（先做门禁代码，再一起发）；
- **B**：定价页先上，但这句话先不写（保持中性文案），门禁上线后再补——否则是虚假承诺。
