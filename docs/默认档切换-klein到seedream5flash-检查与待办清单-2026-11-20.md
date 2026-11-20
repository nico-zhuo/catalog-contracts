# 默认档切换（FLUX 3 Klein → Seedream 5.0 Flash）· 检查结论与待办清单（2026-11-20）

> 需求（用户）：把默认档从 **FLUX 3 Klein**（`flux-3-image-klein`）切换为 **Seedream 5.0 Flash**（`seedream-5-0-flash`）。**先检查、列待办、分配任务，本轮不执行。**
> 附带问题（用户）：`/id-photo-maker` 工具页的 seedream 模型用的是 Replicate 吗？→ 见 §四（答案：**是 Replicate**）。
> 团队：ab-team（frontend = arui、backend = image-workers；契约仓 catalog-contracts 只读共享）。侦察轮后端零写入、前端零写入，task-11/task-12 已 completed。

## 一、范围（精确 95/128 工具）

`app/config/canvas-tools.ts` 中 `defaultModelId = arui-<tool>-flux-3-image-klein` 的工具共 **95 个**（`defaultModelId` 总行 129 含接口声明 1 行 → 实际 128 工具/128 条）：

| 族 | 数量 | 工具 |
|---|---|---|
| ① 旗舰 T2I | 1 | ai-text-to-image |
| ② 通用图片生成 | 40 | ai-drawing / album-cover / anime-art / anime-character / anime-image / anime-picture / body / caricature / cartoon-character / cartoon-strip / character-creator / color-palette / coloring-book / doodle / face / fursona / gaming-thumbnail / icon / logo / manga / monster / ocs-creator / pattern / photography / pixel-art / pixel-avatar / portrait / selfie / sketch / smile / sprite / text-to-poster / vector / vtuber / waifu / wallpaper / youtube-banner / art-ai / illustration / product-image |
| ③ 图表 | 10 | architecture / circuit / data-flow / er / flow-chart / hierarchy / mind-map / org-chart / spider / uml |
| ④ 签名 | 10 | electronic / email / gmail / handwriting / handwritten / html / outlook / professional-email / signature-cursive / signature-png |
| ⑤ 上传型 I2I（OR_12） | 34 | 2x2-picturer / photo-to-poster / photo-to-comic / minecraft-avatar / gaming-avatar / youtube-thumbnail / youtube-shorts-thumbnail / pfp-maker / youtube-avatar / image-to-image-converter / photo-to-cartoon / movie-poster / painting / face-cutout / image-colorizer / photo-color-correction / photo-retouching / photo-filter / photo-to-sketch / storyboard / anime-avatar-maker / avatars-3d / avatars-picture / chibi-avatar-maker / fantasy-avatar-maker / cartoon-yourself / photo-editor / cartoon-avatar-maker / cute-avatar-maker / blur-background / product-background / photo-to-anime / discord-avatar / photo-to-animation |
| **合计** | **95** | |

**不在范围内（33 个）**：3D×3、音频×5、视频×15、图像特殊/legacy×10（photo-enhancer / passport-photo-maker / **id-photo-maker** / professional-headshot / passport-size-photo / sankey / venn / background-remover / linkedin-banner / transparent-background）——它们的默认档不是 klein。

**默认档唯一来源 = `canvas-tools.ts`**（已穷举）：消费方全部读 `currentTool.defaultModelId` 自动跟随——`model-selection`（default 锚点 + `defaultModelNameKey`）、`unified-prompt-bar`（初始档/失效回退）、`hero-prompt-section`（首页/图片聚合页 hero 成本胶囊）、130 个工具 route 的成本显示；`api.catalog` 的 `defaultTierId` 无消费方、`config/tools.ts` 的 `models[]` 已全空 → 无第二处默认源。

## 二、可切换性（已验证，零阻塞）

| 项 | 结论 |
|---|---|
| BFF 映射 | **95/95** 都存在 `arui-<tool>-seedream-5-0-flash`（93 个池派生 + t2i/handwritten 2 个显式），缺失 0；prod BFF 实测 95 个工具均返回该档且 active |
| default 门禁 | `verify:model-selection` 仅断言「defaultModelId ∈ 映射表」→ 95 条切换后 PASS（注意：该门禁**不校验可见性/弃用**，本批已人工 + API 验证可见） |
| 后端 | **零改动**：catalog schema 无 default* 字段；`/generate` 按 `body.model` 查 REGISTRY 无默认回退；backend 100 个 `*-seedream-5-0-flash` handler 全覆盖，且与对应 klein handler 的 `accepted_params` 键集 **95/95 完全一致**（无 422/断链） |
| 异步/品牌/文案/premium | `seedream-5-0-flash` 已在 IMAGE_ASYNC、branding canonical、32 语 i18n（`aruiSeedream50Flash`）、premium 体系内 → 全部零新增 |
| 契约仓 | 零 schema 变更、零 submodule 改动 |

## 三、可见变化（95 个工具 **同一 diff**，逐工具 95/95 实测）

| 维度 | FLUX 3 Klein（现默认） | Seedream 5.0 Flash（新默认） |
|---|---|---|
| 计价 | perUnit resolution `{1K:3, 1.5K:4, 2K:5, 4K:11}` | **fixed 6** |
| 默认成本 | **3**（1K） | **6**（1K）→ **默认价 ×2** |
| 比例 | 15 值（含 7:5 / 5:7） | **17 值**（+9:19.5 / 19.5:9 / 9:20 / 20:9，−7:5 / 5:7） |
| resolution | 1K / 1.5K / 2K / **4K** | **仅 1K / 2K**（1.5K、4K 在该档消失；klein 仍在面板可手选，4K=11 积分） |
| maxDimension | 4096 | **2048** |
| maxReferenceImages | 10 | **14** |
| catalog params 名 | prompt / aspect_ratio / resolution / image_urls（+各工具业务参数） | **逐字相同（95/95 diff = 0）**，仅 enum 选项集变化 |
| 默认值 | 1:1 / 1K | 1:1 / 1K（初始 UI 状态不变） |
| PREMIUM / 文字强度 | premium / 62 medium | premium / 76 medium（**TEXT_STRENGTH 已有该档，零改动**） |

**连带影响（全部自动跟随，零代码）**：
1. **对比表**：43 个工具（34 上传型 + 8 OR_12 C 批工具 + handwritten）klein 原本同时是 budget 档 → 切换后出现独立 default 锚点（**2 锚点 → 3 锚点，页面多展示一档**）；其余 52 个工具（51 OR_15 + t2i，budget = flux-schnell-rp 1 积分）只做 default 槽替换。
2. **JSON-LD / SEO**：95 页 `facts.default` 文案由「FLUX 3 Klein is selected by default」→「Seedream 5.0 Flash is selected by default」；`facts.from` / `facts.output`（全档最大 4096，klein 仍在）/ `facts.refs` 不变。
3. **Hero 成本胶囊**：首页 hero + `/ai-image-generator` 聚合页 hero（默认工具 = t2i）3→6；视频 hero 不受影响。
4. **零连带**：/models hub（无 default 概念，from 价与排序不变）、定价页（「from about 1 credit」仍真，最低档是 flux-schnell-rp 1 积分）、工具卡/SEO「N 档」、aspect-resolution-archive（两档都有 resolution 参数，本就不在归档白名单）、mapping/snapshot/KV/branding/premium/async。

## 四、`id-photo-maker` 的 seedream 是 Replicate 吗？——**是**

- id-photo-maker 共 **12 档 = 1 个 OpenRouter + 11 个 Replicate**：
  - **OR（唯一）**：`ai-id-photo-maker-flux-3-image-or`（`createOpenRouterImageHandler`，上上游 `black-forest-labs/flux-3-image`，11-15 flux 换源批迁入）
  - **Replicate（11）**：seedream-4 / 4.5 / 5-lite / 5-pro + nano-banana / -2 / -2-1 / -2-lite / -pro + gpt-image-2 / gpt-image-2.5-sunburst（均 `createReplicateImageHandler` + 固定 version hash）
- 4 个 seedream 档逐档证据：

| tier | upstream_model（Replicate） | version hash（固定） | 计价 | resolution | maxDim |
|---|---|---|---|---|---|
| seedream-4（**默认档**） | `bytedance/seedream-4` | `cf7d4319…0aa7e9` | fixed 9 | 1K/2K/4K（size 2K） | 4096 |
| seedream-4-5 | `bytedance/seedream-4.5` | `9fe3b828…86761a` | fixed 12 | 2K/4K（size 2K） | 4096 |
| seedream-5-lite | `bytedance/seedream-5-lite` | `eeb2857d…22ec71` | fixed 11 | 2K/3K（size 2K, png） | 3072 |
| seedream-5-pro | `bytedance/seedream-5-pro` | `91daad99…7b2c79` | perUnit resolution {1K:14, 2K:28} | 1K/2K（size 1K, png） | 3024 |

- 该工具**没有 seedream-5-0-flash 档**（id-photo 家族 5 工具均无），默认档是 seedream-4 → **本次默认档切换完全不触达 id-photo 家族**。
- 家族未随换源批迁 OR 的依据：catalog-contracts `docs/OpenRouter图像18档-三维度核查-待办清单-2026-11-15.md` §十七 **P-2 拍板「处理类 6 工具排除（另立任务）」**（图→图强 I2I 档无 OR 等价替代）；家族 5 工具共 66 档 = 61 Replicate + 5 个 flux-3-image-or，全部 active。潜在影响：仍走 Replicate 账单/可用性（11-18 政策已确认 Replicate 通路可用，非阻塞）；若未来统一 OR 需先解决强 I2I 等价档（另立任务，不在本批）。

## 五、改动面（执行时，纯前端单文件为主）

| # | 文件 | 改动 |
|---|---|---|
| 1 | `app/config/canvas-tools.ts` | **95 行** `defaultModelId` 值 `...-flux-3-image-klein` → `...-seedream-5-0-flash` + 同行注释改写（7 种历史注释模式，均写「切 klein(3 积分低价引流先例)」，改为 2026-11-20 新口径）；t2i 块注释补一条切换说明（行块 293–773 / 802–1097 / 1147–1246 / 1303 / 1332 / 1360–1427 / 1636–1756） |
| 2 | `app/components/prompt-bar/unified-prompt-bar.tsx` | 仅 1 条注释语义更新（约 677 行「本工具显式默认档（产品拍板的『首屏最便宜』）」→ 旧叙事失效），无代码改动 |
| 3（可选） | `scripts/verify-model-selection.ts` | 可选新增轻量断言：default 档必须出现在该工具可见档表且非 deprecated（防未来默认档写进已删/未产品化档；当前只有「在映射内」门禁） |
| — | 其余 **零改动** | mapping / generation-queue / model-branding / model-selection / model-premium / aspect-resolution-archive / locales / hero / palette / routes / snapshot / tests / docs 全不动 |

## 六、决策点（执行前需拍板）

| # | 项 | 建议 |
|---|---|---|
| **D-1** | **范围：全量 95 vs 4K 敏感族保留 klein** | 需求原话是「把默认档切换」，默认按**全量 95** 执行；但默认档会失去 4K/1.5K（klein 仍可手选 4K=11 积分）。若产品希望 wallpaper / movie-poster / painting / product-image / logo / illustration / poster 等 4K 敏感族保留 klein，则分两波（本批其余 ~85 + 保留族不动）——**需你确认** |
| **D-2** | **默认价 3→6（×2）** | 免费套餐 10 积分/天：默认档出图从 3 张变 1 张；95 页首屏成本、hero 胶囊、JSON-LD 文案同步变化。**需确认这是有意的定位/提价调整**（定价页「from 1」仍真、不矛盾） |
| D-3 | 是否顺带加「default 档可见且非 deprecated」断言 | 建议加（1 条，纯前端 verify；防未来默认档指向已删档） |
| D-4 | id-photo 家族 seedream = Replicate 现状 | 本批不动；未来若统一 OR 需另立任务（P-2 已拍板排除，无 OR 等价强 I2I 档） |
| D-5 | 执行方式 | 建议**单 commit**（95 行机械替换 + 程序化 grep 校验 95/95 + 注释），不分族多 commit；无 backend 时序依赖（所有档已上线） |

## 七、任务分配（本轮不执行；放行后按此派发）

| 任务 | 负责 | 内容 | 依赖 |
|---|---|---|---|
| **T1**（task-13） | frontend（arui） | §五 1–3 项：canvas-tools 95 行 + 注释 + unified-prompt-bar 注释（+可选断言）；单 commit；门禁全绿 | D-1/D-2/D-3 拍板 |
| **T2**（Lead） | Lead | 时序放行（无 backend 先行）+ CI 全绿 + 抽查 2–3 页可见变化 + 文档终态回填 | T1 |
| **T3**（可选后续） | — | id-photo 家族迁 OR 评估（P-2 另立任务）/ 默认档策略注记 | D-4 |

## 八、门禁与期望数字（执行后）

- **全部数字不变**：mapping 1650 / snapshot 1650（1650/1650 孤儿 0）/ branding 可见 1650 / premium visible 84（nonPremium 9）/ catalog-mapping 1695-1650-hard fail 0 / soft warns 45 / brand-color 20 / lint-i18n / audit:stale-copy。
- `verify:model-selection`：default 门禁 PASS；95 个工具 default 锚点与对比表内容变化 → 需 CI 刷新快照后跑（本地 committed snapshot stale 会崩，沿用 C 批「公开 BFF 重建 1650 模拟快照」法本地预验）。
- `tsc` 0 / `build` 绿 / Deploy 无 backend 依赖；无新 i18n key、无新映射、无契约变更。

## 九、风险

1. **默认价 ×2（3→6）**：免费 10 积分/天从 3 张默认变 1 张 —— 最大产品影响，需 D-2 确认。
2. **默认档失去 4K / 1.5K**：4K 敏感族（wallpaper / poster / logo / product-image 等）建议 D-1 决定是否保留 klein。
3. **比例集变化**：默认档新增 4 个超宽比例、移除 7:5 / 5:7（其它档仍在，仅默认档选项变）。
4. **95 页对比表 / JSON-LD 可见变化**：43 页由 2 锚点变 3 锚点、52 页 default 槽替换 → CI 后抽查 2–3 页。
5. 旧叙事「默认档 = 首屏最便宜」失效（klein 更便宜但不再是默认）——注释已在改动面内，营销无逐档价文案。
6. 执行风险低（单文件 + 1 注释），无后端/KV/契约依赖。

---
*创建：Lead 2026-11-20 11:3x；本轮只检查与分配，未执行任何改动。*

---

## 十、执行终态（2026-11-20 11:47，**已上线**）

| 项 | 结果 |
|---|---|
| 拍板 | D-1 **全切 95**、D-2 **默认价 3→6 为有意调整**、D-3 **不加断言**（用户 2026-11-20 11:42） |
| 代码 | arui commit **`c149c2ff7`**（2 文件 / +100 −96：canvas-tools 95 行值+注释、t2i 块注释、unified-prompt-bar 回退注释） |
| CI / Deploy | [run #44670116426](https://github.com/nico-zhuo/arui/actions/runs/44670116426) **success 8m52s**；Deploy Version `5a48bd2f-7f42-4699-8124-88f99da92941` |
| 数字（全不变） | snapshot 1650（image 1512/audio 28/3d 6/video 149，607KB，孤儿 0）、model-snapshot 1650/1650、model-selection PASS（rank 39，125 页唯一；t2i picks = flux-schnell-rp(1) / seedream-5-0-flash(6) / nano-banana-pro-rp(45)；gmail 由 2 锚点变 3 锚点）、branding 1650、catalog-mapping total 1695/mapping 1650/hard fail 0/soft warn 45 |
| 本地预验 | 95/95 切换 + 0 klein 默认 + 0 断链；公开 BFF 重建 1650 模拟快照后 verify:model-snapshot / model-selection / build 全绿（快照已还原未提交） |
| 线上抽查（headless，未实测生成） | t2i / album-cover / email-signature 三页默认模型均为 **Seedream 5.0 Flash**；档位行 `6 · 2K · 15-60s`（默认成本 3→6、分辨率徽标 2K）；`FLUX 3 Klein 3 · 4K` 仍可手选 |
| 遗留 | 无；verify:premium 的 WARN 为存量（visible 84 vs 基线 62） |

*终态：95 个工具页默认档已切换上线，默认价 3→6 为拍板结果。*
