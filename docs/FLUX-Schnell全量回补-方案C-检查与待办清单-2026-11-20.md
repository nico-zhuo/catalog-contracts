# FLUX.1 [schnell] 全量回补（方案 C）· 检查结论与待办清单（2026-11-20）

> 依据（唯一真源）：Replicate 模型页 <https://replicate.com/black-forest-labs/flux-schnell>（API 实拉：version `c846a699…cfe51e` 未变、$3/1000 图 = $0.003/张、10 入参）
> 用户指令：**按方案 C、先检查、列待办清单、先不执行；默认档不切换这个模型。**
> 团队：ab-team（backend = image-workers、frontend = arui；契约仓 catalog-contracts 只读共享）。契约共享口径：11-18 终版 **OR/Replicate 并存、OR 为主**（Replicate 回补不违规，详见 A 方案文档附录 C）。

## 〇、术语澄清（重要：本方案是「新建」不是「恢复」）

> 用户 2026-11-20 追问确认：**模型/档位一旦删除只能新建，不存在「恢复旧记录」**。本文沿用「回补/恢复」只是口语指代，实际动作定义如下：

1. **全部 61 个都是全新 modelId**：`<toolSlug>-flux-schnell-rp`，全新 catalog entry、全新 KV key、`handlerVersion: "v1"`（从 v1 起算）。**旧 id `<toolSlug>-flux-schnell` 永久烧毁、永不复活**（架构 §13.3 modelId 一旦发布永不变更；删除即烧毁，改名走 §8.4 新建）。
2. **旧 handler 源码只作代码模板**：用 `git show <删除commit>^:…` 取回旧文件，仅用于抄上游契约/工具级注入/参数骨架；机械变换后写入**新目录**，不触碰任何旧记录、不改旧 KV、不 resurrect 旧 id。
3. **数据层无「恢复」**：registry/KV 只新增 61 条新 key；旧 key 已在 11-17 换源批删除且不回填；旧 id 的 legacy remap 继续指向 klein（本批不动，见 D-C13）。
4. **对用户可见的「恢复」只有一件事**：这 61 个工具页重新出现「FLUX.1 [schnell] 这个模型」可选，并且沿用历史业务参数/积分口径；**档位身份是新的**，历史画布/旧订单仍指向旧 remap 目标，不会自动切到 `-rp`（如需，另立决策）。
5. 因此下文的「恢复/回补」= **以历史契约为模板新建 61 个新档**；任务板措辞同步改为「新建」。

## 一、方案 C 定义（本次范围）

**C = 全量回补历史 63 个工具页中已被删除的 61 个**，统一新尾段 **`flux-schnell-rp`**：

| 家族 | 工具页 | 历史积分 | 说明 |
|---|---|---|---|
| ① 旗舰 T2I | 1 | fixed 1 | `ai-text-to-image`（现 24 档 → 25） |
| ② 签名类 | 10 | fixed 3 | 历史 11-11 引流批；现 5×OR_12 + 5×OR_15 |
| ③ 图表类 | 10 | fixed 3 | 9 个纯 T2I 图表 + circuit（现 9×OR_15 + 1×OR_12） |
| ④ 通用图片生成 | 40 | fixed 1 | 现 38×OR_15 + 2×13 档（gaming-thumbnail / youtube-banner） |
| **合计** | **61** | — | 现役 2 个（sankey/venn）保留旧尾段 `flux-schnell`，**不动** |

- **默认档：全部不切换**（`canvas-tools.ts` 的 10 个签名默认档 + t2i 默认档保持 klein，用户已明确）。
- 旧 modelId 全部已烧毁（`23c733a` / `8faa4c2` / `688a328` / `70f667c` 删除）→ 一律新 modelId `<tool>-flux-schnell-rp`，不复用旧 id。
- 计价按历史口径分族：通用 40 + t2i 1 = **fixed 1**；签名 10 + 图表 10 = **fixed 3**（待拍板确认，见 D-C1）。

## 二、检查结论（全只读，2026-11-20）

### 2.1 恢复源完整（无需重新调研/迁移）

61 个旧 handler 全部可从 git 取回（删除 commit 的父版本），upstream/version/参数/工具级 prompt 注入/积分全套现成：

| 删除批次 | commit | 数量 | 取回位置 |
|---|---|---|---|
| T2-B2（t2i 14 档） | `23c733a` | 1 | `23c733a^` |
| 换源批 A | `8faa4c2` | 51 | `8faa4c2^` |
| 换源批 B | `688a328` | 8 | `688a328^` |
| 换源批 C | `70f667c` | 1 | `70f667c^` |

- 现役同上游参照档：sankey / venn（`handlerVersion v2`），confirm upstream slug/hash/比例/`megapixels:"1"`/`cancelAfter:"2m"`/`maxDimension 1024` 与历史一致。
- Replicate 页面/API 事实未变：version hash 未变、$3/1000 输出图、输入 schema 10 参数（prompt / aspect_ratio 11 值 / megapixels / num_outputs / go_fast / num_inference_steps / disable_safety_checker / output_format / output_quality / seed）。

### 2.1bis backend 机械化恢复干跑结论（backend 只读侦察，2026-11-20）

- **61/61 共同不变量**：upstream slug + version hash 全同（61 档同一 hash，无需分档归一）、`cancelAfter "2m"`、`maxDimension 1024`、`supportsQueue true`、`supportsReferenceImage false`、`creditCost` 全 fixed（0 个 perUnit / surcharges）、`param_mapping` 恒为 `{prompt, aspect_ratio}`、`params` 恒含 `resolution` 单选项 1K（display-only）、61/61 均带 `deprecated:true` + 2 条 alternatives（恢复时摘掉）。
- **五件机械变换内存干跑 61/61 全过**：`model_id` → `<tool>-flux-schnell-rp`、`tierId` → `flux-schnell-rp`、删 `deprecated: true`、删单行 `deprecated_alternatives`、`handlerVersion` v2/v3 → `"v1"`；文件头注释 17 种变体可整块替换，60/61 的「标废注释块」可正则清理。
- **家族细节**：图表 10 = PREFIX + STYLE_TOKENS(4 风格)，比例 3 值×9（1:1/16:9/4:3）+ mind-map 4 值，默认 16:9×8 / circuit 1:1 / mind-map 4:3，hv v3×9 + v2×1；签名 10 = 两派注入（style+colorScheme / brushStyle+inkColor），比例 11×8 + signature-png 2 + html 无，hv v2×6 + v3×4；通用 40 = 注入三派（PREFIX / token-only / inline）+ 3 档无注入，比例全 11，hv v2×30 + v3×10。
- **`resolution` 规范化名单（13）**：通用 10（gaming-thumbnail / youtube-banner / album-cover / logo-maker / monster / pixel-art / pixel-avatar / sprite / text-to-poster / vtuber）+ 签名 3（email / outlook / cursive）。
- **待人工拍板的语义点**：11 个通用工具的 prompt 前缀引用「参考图/照片」，而 flux-schnell 档是纯 T2I（历史逐字如此）→ 逐字恢复（保真）vs 改写 T2I 版（sankey/venn 有 #47 偏离先例）。
- **双尾段共存**：sankey/venn 保留 `flux-schnell`（旧 id/tierId），其余 61 档用 `flux-schnell-rp` → 前端 i18n/premium/hub 需同时映射两个尾段（后端无冲突，不建议给 sankey/venn 改名）。

### 2.2 现网基线（生产 KV 实查 1451 档）

- 61 个目标工具当前档数分布：**52 个 OR_15（15 档）/ 6 个 OR_12（12 档）/ 2 个 13 档**，t2i 24 档。
- `flux-schnell` 现役仅 2 条（sankey/venn，fixed 3）。
- image-workers HEAD `bd15418`、arui HEAD `58d312db7`，均 clean；本地门禁与 A 方案文档 §1.2 相同（含 arui 本地快照 stale 存量债）。

### 2.3 61 个工具页契约矩阵（历史版本，逐条实拉自 git）

#### ① 旗舰 T2I（1）

| 工具 slug | 现档数 | 历史 accepted_params | 比例数 | 积分 | 工具级注入 |
|---|---|---|---|---|---|
| ai-text-to-image | 24 档 | prompt,aspect_ratio | 11 | 1 | 否 |

#### ② 签名类（10，历史 fixed 3）

| 工具 slug | 现档数 | 历史 accepted_params | 比例数 | 积分 | 工具级注入 |
|---|---|---|---|---|---|
| ai-electronic-signature-maker | 12（OR_12） | prompt,aspect_ratio | 11 | 3 | 是 |
| ai-email-signature-generator | 15（OR_15） | prompt,style,colorScheme,aspect_ratio,resolution | 11 | 3 | 是 |
| ai-gmail-signature-generator | 12（OR_12） | prompt,style,colorScheme,aspect_ratio | 11 | 3 | 是 |
| ai-handwriting-generator | 12（OR_12） | prompt,aspect_ratio | 11 | 3 | 是 |
| ai-handwritten-signature-generator | 15（OR_15） | prompt,brushStyle,inkColor,aspect_ratio | 11 | 3 | 是 |
| ai-html-signature-generator | 12（OR_12） | prompt,style,colorScheme | **无**（defaults 锁 16:9） | 3 | 是 |
| ai-outlook-signature-generator | 15（OR_15） | prompt,style,colorScheme,aspect_ratio,resolution | 11 | 3 | 是 |
| ai-professional-email-signature-generator | 12（OR_12） | prompt,style,colorScheme,aspect_ratio | 11 | 3 | 是 |
| ai-signature-generator-cursive | 15（OR_15） | prompt,brushStyle,inkColor,aspect_ratio,resolution | 11 | 3 | 是 |
| ai-signature-png-maker | 15（OR_15） | prompt,aspect_ratio,brushStyle,inkColor | 2 | 3 | 是 |

#### ③ 图表类（10，历史 fixed 3）

| 工具 slug | 现档数 | 历史 accepted_params | 比例数 | 积分 | 工具级注入 |
|---|---|---|---|---|---|
| ai-architecture-diagram-generator | 15（OR_15） | prompt,aspect_ratio,style | 3 | 3 | 是 |
| ai-circuit-diagram-generator | 12（OR_12） | prompt,aspect_ratio,style | 3 | 3 | 是 |
| ai-data-flow-diagram-maker | 15（OR_15） | prompt,aspect_ratio,style | 3 | 3 | 是 |
| ai-er-diagram-generator | 15（OR_15） | prompt,aspect_ratio,style | 3 | 3 | 是 |
| ai-flow-chart-maker | 15（OR_15） | prompt,aspect_ratio,style | 3 | 3 | 是 |
| ai-hierarchy-chart-maker | 15（OR_15） | prompt,aspect_ratio,style | 3 | 3 | 是 |
| ai-mind-map-generator | 15（OR_15） | prompt,aspect_ratio,style | 4 | 3 | 是 |
| ai-org-chart-maker | 15（OR_15） | prompt,aspect_ratio,style | 3 | 3 | 是 |
| ai-spider-chart-maker | 15（OR_15） | prompt,aspect_ratio,style | 3 | 3 | 是 |
| ai-uml-diagram-generator | 15（OR_15） | prompt,aspect_ratio,style | 3 | 3 | 是 |

#### ④ 通用图片生成（40，历史 fixed 1）

| 工具 slug | 现档数 | 历史 accepted_params | 比例数 | 积分 | 工具级注入 |
|---|---|---|---|---|---|
| ai-ai-drawing-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-album-cover-generator | 15（OR_15） | prompt,genre,album_title,artist_name,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-anime-art-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-anime-character-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-anime-image-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-anime-picture-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-body-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-caricature-maker | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-cartoon-character-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-cartoon-strip-generator | 15（OR_15） | prompt,style,panels,aspect_ratio | 11 | 1 | 是 |
| ai-character-creator | 15（OR_15） | prompt,aspect_ratio | 11 | 1 | 否 |
| ai-color-palette-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-coloring-book-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-doodle-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-face-generator | 15（OR_15） | prompt,gender,age_range,style,aspect_ratio | 11 | 1 | 是 |
| ai-fursona-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-gaming-thumbnail-maker | 13 档 | prompt,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-icon-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-logo-maker | 15（OR_15） | prompt,industry,style,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-manga-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-monster-generator | 15（OR_15） | prompt,style,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-ocs-creator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-pattern-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-photography-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-pixel-art-generator | 15（OR_15） | prompt,style,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-pixel-avatar-maker | 15（OR_15） | prompt,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-portrait-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-selfie-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-sketch-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-smile-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-sprite-generator | 15（OR_15） | prompt,style,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-text-to-poster | 15（OR_15） | prompt,style,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-vector-generator | 15（OR_15） | prompt,art_style,aspect_ratio | 11 | 1 | 是 |
| ai-vtuber-maker | 15（OR_15） | prompt,aspect_ratio,resolution | 11 | 1 | 是 |
| ai-waifu-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-wallpaper-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| ai-youtube-banner | 13 档 | prompt,style,channel_name,aspect_ratio,resolution | 11 | 1 | 是 |
| art-ai-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| illustration-generator | 15（OR_15） | prompt,style,aspect_ratio | 11 | 1 | 是 |
| product-image-generator | 15（OR_15） | prompt,aspect_ratio | 11 | 1 | 否 |

### 2.4 旧契约规范化点（按现行 Param Exposure Principle）

1. **`resolution` 泄漏进 accepted_params 共 13 个**（album-cover / email-signature / gaming-thumbnail / logo-maker / monster / outlook / pixel-art / pixel-avatar / cursive / sprite / text-to-poster / vtuber / youtube-banner）→ 新 handler 一律改成 **display-only（单选项 1K，不进 accepted_params）**。
2. **工具级参数是业务参数，保留**（style / colorScheme / brushStyle / inkColor / industry / genre / panels / gender / age_range / art_style / album_title / artist_name / channel_name）。**枚举漂移核验（全量 61 个 × 125 个 enum 参数逐值对比现役 klein 档）**：工具级枚举 **0 漂移**（style/colorScheme/brushStyle/inkColor/industry/panels/gender/age_range/art_style 全部逐字一致）→ 旧 handler 的 prompt 注入 token 表仍然覆盖现行取值，恢复后不会出现「选到无 token 的新值」的 #47 类问题。唯一差异是 `aspect_ratio`：flux-schnell 上游只有 11 值，现役 OR 档 15 值（多 `1:2 / 2:1 / 5:7 / 7:5`）→ 属模型能力差异，按历史 11 值恢复即可（各档比例集合本就允许不同）。
3. **隐藏参数**（`megapixels` / `num_outputs` / `go_fast` / `num_inference_steps` / `disable_safety_checker` / `output_format` / `output_quality` / `seed`）一律进 defaults，不进 params/accepted_params（历史 handler 已是此口径）。
4. `html-signature-generator` **无比例参数**（历史如此），保持。
5. 新 handler 一律 `handlerVersion: "v1"`（新 modelId 从 v1 起），去掉 `deprecated` / `deprecated_alternatives`。
6. **imports 面全量核验**：61 个旧 handler 的 import 完全一致（仅 `../../shared/replicate-image-handler` + `vendor/catalog-contracts/schema`）→ 无「引用了已删除共享工具」的恢复风险。
7. **上传门禁核验**：`unified-prompt-bar.tsx` 的 `needsImage` 在 HEAD 已对 circuit / html-signature / sankey / venn 做**档位感知**（`currentTier.supportsReferenceImage === true` 才拦）；签名 10 页为「上传可选」口径 → 新档 sRI=false 时纯文本提交不会被误拦，**前端零额外改动**。

### 2.5 契约仓 / 共享层：零变更

- catalog-contracts：只用现有 text/enum/file 类型 + `creditCost.fixed` → **零 schema 变更**，不动 `schema.ts` / `schema.zod.ts` / CHANGELOG / submodule 指针。
- image-workers：61 个独立单文件 handler，`_registry.ts` 自动重生成；`src/index.ts` / `replicate.ts` / `shared/*` / `scripts/*` 零改动。
- 若实现中确需动共享文件 → 先报 Lead 授权（CLAUDE.md 新规）。

### 2.6 前端影响面（C 版，frontend 只读侦察实测）

> 关键修正：60 个「池工具」里 **59 个走池表自动派生**，**`ai-handwritten-signature-generator` 不在池表**（换源批 B 的非池工具，15 档显式 mapping/i18n）→ 需**显式**触点。mapping 合计 +59（自动）+2（t2i / handwritten 显式）= **+61 → 1650**。

| # | 文件 | 改动 |
|---|---|---|
| 1 | `app/routes/api.ai.submit.bff/model-id-mapping.ts` | t2i 显式 +1、handwritten 显式 +1；其余 59 个池工具由 `buildReplicateTierModelMappings` 自动派生（mapping 1589→**1650**） |
| 2 | `app/lib/generation-queue.server.ts` | `IMAGE_ASYNC_MODEL_IDS` **+2**（t2i + handwritten；两者 `isReplicateTierModelId` 实测均 false，漏加 = 3min 僵尸误杀）；其余 59 池工具自动 11min |
| 3 | `app/config/replicate-tier-tools.ts` | 新增 **`FLUX_SCHNELL_RP_TOOLS`（59 slug，按通用 40 / 图表 10 / 签名 9 分组注释）**，在 builder 末尾（所有 override 之后）append；**i18n 走独立 `APPENDED_TAIL_I18N_KEYS = { "flux-schnell-rp": "aruiFluxSchnell" }`** 并加入 `buildReplicateTierI18nMap` 兜底链。⚠️ 不得塞进 `REPLICATE_TIER_I18N_KEYS`（实测污染爆炸半径 = **4 个 legacy 工具**：photo-enhancer / professional-headshot / passport-photo-maker / passport-size-photo → 4 条不存在 mapping → verify:catalog-mapping HARD FAIL） |
| 4 | `app/config/model-branding.ts` | +1 canonical（`arui-ai-text-to-image-flux-schnell-rp`，字段照抄旧 flux-schnell）→ 自动 fanout 59 池工具 + t2i 自身；**handwritten 另需**把 `flux-schnell-rp` 加进 `SIGNATURE_OR_TAILS`（非池显式扇出） |
| 5 | `app/config/model-premium.ts` | `NON_PREMIUM_TIER_IDS` +1（按尾段索引，一处覆盖 61 档；沿旧 flux-schnell 非高级） |
| 6 | `app/config/model-selection.ts` | TEXT_STRENGTH 三表 +1（`flux-schnell-rp` / 32 分 / weak，按尾段索引一处覆盖） |
| 7 | `app/config/canvas-tools.ts` | `MODEL_I18N_KEY_MAP` **t2i +1、handwritten +1**（复用 `aruiFluxSchnell`）；**默认档零改动**（用户明确） |
| 8 | `scripts/verify-model-selection.ts` | rank 断言 38→**39** |
| 9 | locales / snapshot | **零新增 locale**；`app/data/model-snapshot.json` 执行轮 `pnpm snapshot:models` 刷新，不手改 |

**自动派生程序化实测**：mapping 1650 ✓；`buildReplicateTierModelMappings` 自动 +59；`buildReplicateTierI18nMap` 自动 +59（缺 APPENDED 映射会构建期 throw）；`isReplicateTierModelId` 对 59 为 true、对 t2i/handwritten 为 false（故显式 +2）；branding canonical 自动 59；TEXT_STRENGTH / premium 尾段级 1 条覆盖 61；池工具数 102 / 尾段宇宙 30 **不变**；51 个 OR_15 工具 15→16、8 个 OR_12 工具 12→13、handwritten 15→16、t2i 24→25。

**逐族契约一致性（frontend AST 实测）**：现役 OR 池档**只有** prompt/aspect_ratio/resolution；工具级参数（style/colorScheme/brushStyle/inkColor/genre/panels/gender/age_range/industry/art_style/channel_name/album_title/artist_name）只存在于历史 flux-schnell 契约 → 恢复后这些参数会重新出现在对应档位；**61/61 工具页的 `handleSubmit` params 块已透传历史参数名（0 缺失）**。

### 2.6bis 前端发现的两个 UI 缺口与一个可选决策（需拍板）

1. **`ai-signature-generator-cursive` 的 brushStyle/inkColor 未透传**：提交链路（`unified-prompt-bar.tsx` 提交参数分支）条件只含 signature-png / handwritten → 恢复 cursive 历史契约后用户选的笔刷/墨色会被丢弃。**1 行修复候选，但属共享组件改动 → 需授权**（D-C10）。
2. **6 个工具的上传槽 illusion（历史先例）**：`ai-gaming-thumbnail-maker / ai-monster-generator / ai-pixel-art-generator / ai-sprite-generator / ai-text-to-poster / ai-youtube-banner` 的 tool 级 `supportsReferenceImage=true`，选中 -rp 档（sRI=false）时上传槽仍显示，上传图会被 worker `accepted_params` 静默丢弃（BFF 无条件加 image_urls）。11-04~11-17 同状态（历史先例，低风险）→ 修复需把 `showReferenceImage` 改成「档位优先」，属共享组件回归面（D-C11）。
3. **album-cover 3 个 genre labelKey 拼写**：handler 用 `hip_hop / lo_fi / r_and_b`，locale 是 `hip-hop / lo-fi / r-and-b` → 选项回落显示原文。**建议 backend 改 3 个 labelKey 为连字符（零 locale 改动）**，不要前端补 3 键 ×32 语（D-C12）。

### 2.6ter /models hub 与定价页影响（自动跟随，零代码）

- hub 按 i18n nameKey 聚合：**63 个 catalog id 合并进同一行 FLUX Schnell**（61 新 + sankey/venn 旧尾段）；首条 mapping = t2i 显式行 → 该行 `tierId=flux-schnell-rp` → **必须同批补 TEXT_STRENGTH 与 NON_PREMIUM**（否则 textStrength 变 null / 出现 PREMIUM 徽标）。
- 该行数值变化：`fromCredits 3→1`、`maxToolCredits=3`（「部分工具最高 3」）、`toolCount 2→63`、`maxRefs 0`、`premium=false`、`textStrength=weak`；hub 行数/工具数（128）不变。
- 定价页静态文案「from about 1 credit per image」（32 语）**自动恢复为事实**（C 之前最低 3 积分，文案失真）。
- 各工具页 JSON-LD featureList / 对比表由 snapshot 驱动：60+ 工具「N models」+1；40 通用 + t2i 的「from credits」3→1 —— 属数据驱动可见变化，需产品知悉。
- **旧 remap 语义（可选）**：旧烧毁 id 现仍 remap 到 `*-recraft-v4-1-flash-v2`；C 后更 faithful 目标是 `*-flux-schnell-rp`，但改全局 remap 会波及 sankey/venn 现役 id 与 canvas 路径 → **建议本批不动，另立决策**（D-C13）。

### 2.7 docs 影响

`docs/` 下共 **60 个文件**提到 flux-schnell（各工具 `*模型.md` + 3 份调研/待办文档），大多仍把已删档写成现役（换源批未回填）。C 执行时不逐份重写；建议：t2i 文档最小增量 + 61 工具文档统一加一行状态（或在各 `*模型.md` 的模型表加回一行），其余作为文档债另批。

## 三、决策点（待拍板）

| # | 项 | 建议 |
|---|---|---|
| **D-C1** | 计价 | **按历史分族**：通用 40 + t2i 1 = fixed 1；签名 10 + 图表 10 = fixed 3（与各页现有最低档一致，不动价格锚点） |
| **D-C2** | 尾段命名 | `flux-schnell-rp`（已定，同 A 方案 D-2） |
| D-C3 | 默认档 | **不切换**（用户已明确 ✅） |
| D-C4 | PREMIUM 标记 | **非高级**（沿旧 flux-schnell 与 sankey/venn 一致） |
| D-C5 | `resolution` 泄漏 | **执行时规范化**（display-only，13 个 handler 修掉） |
| **D-C6** | 波次 | **建议：backend 3 波 + frontend 最后单 commit 集成**。波1 pilot 4 档（t2i + architecture + html-signature + album-cover，验证三家族与脚本）→ 波2 其余 17 档（9 图表 + 9 签名）→ 波3 通用 40 档；或按 frontend 的 W1 41 / W2 10 / W3 10 分组（两种均可，见 §五）。每波独立门禁、可独立回滚 |
| D-C7 | docs | 最小增量：1 份 batch 记录 + 55 份 per-tool 文档的档位行替换（id→-rp、积分按族、删过时「默认档」表述），不全文重写 |
| D-C8 | 契约测试 | 建议新增 `tests/flux-schnell-rp-family.test.ts`（纯静态：import 61 handler 断言 modelId 后缀/tierId/version/credit/maxDimension/sRI/params/accepted 规范化）→ tests 112→+2~3 |
| **D-C9** | 11 个通用工具的 I2I 语义前缀 | 旧 handler 的 prompt 前缀引用「参考图/照片」，而本档纯 T2I → **逐字恢复（历史保真）** vs 改写 T2I 版（sankey/venn 有 #47 偏离先例，但需逐工具改文案） |
| **D-C10** | cursive brush/ink 透传修复 | **建议修（1 行）**；属共享组件改动，需用户/后端授权（`CLAUDE.md` 共享文件授权原则） |
| **D-C11** | 6 个工具上传槽 illusion | **建议本批不修**（历史先例、低风险；修则改 `showReferenceImage` 为档位优先，共享组件回归面大，另立任务） |
| **D-C12** | album-cover 3 个 genre labelKey | **建议 backend 改成连字符形式**（零 locale 改动、顺手修好存量 bug）；或维持现状（选项回落显示原文） |
| D-C13 | 旧 id remap 是否改指 -rp | **建议不动**（波及 sankey/venn 与 canvas 路径），另立决策 |
| D-C14 | electronic-signature 默认比例 | 历史缺 `defaultValue`/`defaults.aspect_ratio` → **恢复时补 `1:1`**（与其它档一致），可接受 |
| D-C15 | 低价档产品确认 | fixed 1 恢复后 40 通用 + t2i 出现 1 积分新低价档，面板/定价页/hub「from 1」与 PREMIUM 判定同批变 → **需产品确认**（用户已明确默认档不切，此为展示层变化） |

## 四、任务分配（共享任务板；未放行前不执行）

| 任务 | 负责 | 内容 | 依赖 |
|---|---|---|---|
| T1 | Lead | ✅ 本检查 + 清单 + 契约零变更确认 | — |
| T2（task-7） | backend | 按波次新建 61 个 handler（脚本化五件变换 + 逐族人工核对 + 13 处 resolution 规范化 + docs 最小增量）：registry 1451→**1512**、guard tokens 1506→**1567**、tests 112（+D-C8 测试则 +2~3） | D-C1/C5/C6/C8/C9/C12/C14 + 放行 |
| T3（task-8） | frontend | 9 类触点（59 append + t2i/handwritten 显式 + 尾段基础设施）：mapping **1650**、rank **39**、branding 可见 **1650**、premium visible 84 | D-C4/C6/C10/C11 拍板 + 放行；push 须等 backend KV 1512 |
| T4（Lead） | Lead | 时序放行 + KV 对账（1512）+ CI 全绿 + 端到端探针（需 spend 授权）+ 本文档终态回填 | T2+T3 |
| T5 | 后续 | docs 全文回填 55 份 / remap 改指决策 / `num_outputs` 计费 / 上传槽档位优先修复 | — |

## 五、数字与门禁期望（执行时）

| 指标 | 现值 | C 完成后 |
|---|---|---|
| image-workers registry / KV | 1451 | **1512**（+61） |
| guard tokens | 1506 | **1567** |
| image-workers tests | 112 | 112（或 +D-C8 静态契约测试 2~3） |
| arui mapping（client→catalog） | 1589 | **1650**（+61） |
| arui branding 可见档 | 1589 | **1650** |
| TEXT_STRENGTH rank | 38 | **39** |
| t2i 档数 | 24 | **25** |
| 52 个 OR_15 工具 | 15 档 | 16 档 |
| 6 个 OR_12 工具 | 12 档 | 13 档 |
| 2 个 13 档工具 | 13 档 | 14 档 |
| KV sync 分片 | 3 片（1451） | **4 片**（500/500/500/12） |
| `verify:catalog-mapping`（CI） | 1451 / hard fail 0 | **1512 / hard fail 0** |
| `verify:premium`（仅 WARN） | visible 83 / premium 75 | visible **84** / premium 75 / nonPremium 9 |
| /models FLUX Schnell 行 | from 3 / toolCount 2 | from **1** / maxTool **3** / toolCount **63** |

**波次级数字（若按 frontend W1/W2/W3 分组）**

| 波 | 内容 | backend KV | arui mapping | t2i 档数 |
|---|---|---|---|---|
| W1 | t2i + 通用 40（后端 41 档；前端尾段基础设施 + 40 append + t2i 显式） | 1451→1492 | 1589→**1630** | 24→25 |
| W2 | 图表 10（backend 10 档；前端 append +10） | 1492→1502 | 1630→**1640** | 25 |
| W3 | 签名 9 池 + handwritten 1（backend 10 档；前端 append +9 + handwritten 显式） | 1502→**1512** | 1640→**1650** | 25 |

> 单批一次交付也可（mapping 1650 / KV 1512 一次过），前端改动面不变，区别只是 review/验证粒度与回滚成本。

**门禁命令**同 A 方案文档 §T2/T3（backend：prebuild/check:registry/check:guard/typecheck/test；arui：tsc/verify:branding/premium/brand-color/lint-i18n/snapshot/verify:model-snapshot/model-selection/catalog-mapping/build）。

## 六、风险

1. **改动面是 A 的 61 倍**：61 个 handler + 60 工具池 append；一次部署的 review/回滚成本高 → 建议按 D-C6 分 3 波。
2. **前端池表扇出陷阱**：尾段 key 必须走独立映射，不能进 `REPLICATE_TIER_I18N_KEYS`（实测污染半径 = 4 个 legacy 工具 → 4 条不存在 mapping → CI HARD FAIL）。
3. **契约逐字恢复 ≠ 直接照抄**：13 个 `resolution` 泄漏需规范化；61 份旧注释/文件头需改写（旧 id → -rp）；`deprecated` 字段必须摘除。
4. **本地验收限制**：arui 本地快照 stale（11-11）→ 本地 `verify:model-snapshot`/`model-selection` 红是存量债，必须以 CI 刷新后为准。
5. **docs 存量债**：60 份文档仍是旧口径，本批只做最小增量。
6. **老画布/remap**：旧 id 的 legacy remap 保持指向 klein（不改），避免历史画布语义漂移。
7. **混合上游验证面**：60 个工具首次出现 Replicate 档（政策允许，t2i 有先例），但每页都要过 `verify:catalog-mapping` 实查。
8. **两个前端小缺口**：cursive 的 brushStyle/inkColor 未透传（1 行，共享组件需授权 D-C10）；6 个 tool 级 sRI 工具的上传槽 illusion（历史先例，建议不修 D-C11）。
9. **两代尾段并存**：sankey/venn 保留 `flux-schnell`（fixed 3），其余 61 档 `flux-schnell-rp` → i18n/premium/hub 需同时映射两个尾段；不建议给 sankey/venn 改名（§8.4 删档代价）。
10. **verify:model-selection 需执行轮人工复核**：40 通用 + t2i 的 budget 档会翻到 1 积分档；38 个 OR_15 通用工具靠 variant 散列差异化，+1 档后组合唯一性本地无法验证（snapshot stale），须 CI 刷新后跑一遍并抽看 t2i / 1 个签名页 / 1 个图表页的选档行。

---
*创建：Lead 2026-11-20 09:5x；本轮只检查与分配，未执行任何代码改动。*

---

## 附录 D · 对现有模型/页面的影响面（2026-11-20 补查）

> 用户追问「是否会对现有模型有影响」。结论：**现有 1451 档的数据与运行时零改动**（纯新增、零共享逻辑改动、旧 KV key 不覆盖/不删除）；但存在 **4 类可见变化 + 2 个必须同批处理的连带项**。

### D.1 不受影响（已核验）

| 层 | 结论 |
|---|---|
| 现有 1451 档数据/KV | 纯新增 61 key（1451→1512），**不覆盖、不删除、不改字段**；旧 id 不复用（无冲突，已全量比对） |
| 运行时/共享代码 | 61 个新 handler 只 import `shared/replicate-image-handler` + schema；工厂/index/replicate.ts/r2/const 零改动 → 现有模型行为不变 |
| 异步阈值 | `IMAGE_ASYNC_MODEL_IDS` 只 +2 个**新 id**；`isReplicateTierModelId` 对旧 id 判定不变 |
| 品牌/文案 locale | 现有 branding/mapping/locale 条目不动；新增只有新 key（canonical + fanout） |
| 旧 id / 历史画布 | 旧 id 不复活；legacy remap 保持指向 klein（不动）→ 历史画布语义不变 |
| registry 顺序 | `generate-registry` 按目录名**确定性排序**，新目录插入后**现有条目相对顺序不变**（面板顺序对现有档无扰动；t2i 新档按字母序落在中段，属新增档的位置） |

### D.2 会受影响（预期内的可见变化）

1. **`/models` hub 的 FLUX Schnell 行**：`from 3→1 积分`、`toolCount 2→63`、tierId 归因变为 `flux-schnell-rp`。
   ⚠️ **必须同批补** `TEXT_STRENGTH` + `NON_PREMIUM_TIER_IDS`，否则该现有行会出现 `textStrength=null` / PREMIUM 徽标（即「影响现有展示」的真实风险点）。
2. **40 个通用工具 + ai-text-to-image 的工具页**（41 页）：模型数 +1、budget/对比表选档翻到 1 积分档、JSON-LD featureList「N models」+1、`from N credits` 3→1 —— 数据驱动自动变，无需改代码，但属**现有页面可见变化**（产品需知悉）。
3. **定价页**：静态文案「from about 1 credit per image」（32 语）从「失真」恢复为事实（文案本身不动）。
4. **verify 基线数字**：branding 可见 1589→1650、premium visible 83→84（WARN 级）、TEXT_STRENGTH rank 38→39、snapshot 1650 —— CI 断言需同步（否则 CI 红，但非线上影响）。

### D.3 顺带会「修好」两个既有问题（取决于拍板）

- `ai-signature-generator-cursive` 的 brushStyle/inkColor 未透传（**现有 cursive OR 档同样受影响**，是存量 bug）；若采纳 D-C10 的 1 行修复，则现有档一并修好。
- `ai-album-cover-generator` 的 3 个 genre labelKey 下划线/连字符不一致（**现有 OR 档同样命中**）；若采纳 D-C12 改 labelKey，现有档一并修好（零 locale 改动）。

### D.4 已规避的风险（若做错才会影响现有模型）

| 风险 | 后果 | 规避 |
|---|---|---|
| 把 `flux-schnell-rp` 塞进 `REPLICATE_TIER_I18N_KEYS` | 4 个 legacy 工具（photo-enhancer / professional-headshot / passport×2）生成**不存在的 mapping** → `verify:catalog-mapping` HARD FAIL | 走独立 `APPENDED_TAIL_I18N_KEYS`（方案已定） |
| 复用旧 modelId | 违反 §8.4 烧毁规则、历史 remap/画布语义漂移 | 统一新尾段 `-rp`（方案已定） |
| 误改共享文件/旧 handler | 现有模型行为或 KV 字段被改写 | 零共享改动；执行验收要求 `git status` 只含新目录 + `_registry.ts` + docs |
| 后端先于前端/顺序反了 | arui CI 硬校验失败 | backend 先行，KV 1512 就绪后前端再 push |

### D.5 部署层影响

- KV sync 1512 条 = **4 次 invocation**（500/500/500/12）；sync 会**幂等重写**现有 key（内容不变，无风险）。
- Worker bundle +61 模块（约 +4% 模块数）→ 执行轮先 `npm run build`（dry-run）验证体积与类型。
- 回滚：revert 代码 + **手删 61 个 `*-flux-schnell-rp` KV key**（catalog 无 TTL）；前端回退单 commit。

---

## 七、执行终态（2026-11-20 11:0x，**已上线 + 已实测 1 次**）

### 7.1 代码与上线

| 仓 | commit | CI / Deploy | 结果 |
|---|---|---|---|
| image-workers | `c08b1b4`（波1 4 档）/ `e277b20`（波2 18 档）/ `c25c102`（波3 39 档 + 测试） | CI [44662479956](https://github.com/nico-zhuo/image-workers/actions/runs/44662479956) ✓ / Deploy [44662479939](https://github.com/nico-zhuo/image-workers/actions/runs/44662479939) ✓ | registry **1512** / guard tokens **1567** / typecheck 0 / tests **118**；KV sync 4 片 **written 1512/1512**；snapshot 3,125,398 bytes / generatedAt 2026-11-20T02:41:39Z；verify-catalog **1512 entries / 0 deprecated**；Deploy Version `856b05f9` |
| arui | `91186586e`（前端集成）+ `58cc6ceeb`（CI 回归修复） | 首跑 #44663149950 红（verify:model-selection 混合池断言）→ 修复后 [44664422331](https://github.com/nico-zhuo/arui/actions/runs/44664422331) **全绿** | snapshot **1650/1650、孤儿 0**；branding 1650；premium visible 84（WARN 存量）；rank **39**；catalog-mapping 4 仓 1695 / BFF **1650** / hard fails **0** / soft warns 45（存量，未增）；Deploy Version `8c8e5b48` |

- **契约仓零变更**、locales 零改动、默认档零改动（用户要求）；image-workers docs 为 gitignore 目录（55 份 per-tool 文档 + 1 份 batch 记录在本地，未入库）。
- 首跑失败根因：8 个 OR_12 工具（gmail 等）池内新增无参考图档 → `tiers.every(sRI)` 启发式失效 → 能力峰值改按文字强度选 → 旧断言「峰值 mr ≥ 预算档」不再成立。修复：混合池只保留「峰值档必须 ref-capable」护栏，纯 I2I 池断言不变（不削弱门禁）。

### 7.2 端到端实测（用户「完成后实测一次」；走 worker `/generate` + `/status`）

| 项 | 结果 |
|---|---|
| 探针方式 | 临时分支 `probe/flux-schnell-rp-20261120` + 一次性 GitHub Actions 工作流（CI runner 网络可直连 worker；本机 workers.dev 被 DNS 污染/SNI 阻断），**测后分支与工作流已删除，main 未受影响** |
| 请求 | `POST /generate`：model `ai-text-to-image-flux-schnell-rp`、prompt「a single red apple on a wooden table, soft studio lighting, product photo」、aspect_ratio `1:1` |
| request_id | `2f2aa2ca-bb6a-4433-8b91-baa5e1ae5dc3` |
| 轮询 | pending(starting) ×2 → **completed**，耗时 **14s** |
| 产物 | 1 张 **1024×1024 image/webp**（20,768 bytes）落 R2：`https://image.arui.ai/image/generations/ai-text-to-image-flux-schnell-rp/2f2aa2ca-…-0.webp`，HTTP 200 / content-type image/webp |
| 结论 | **Replicate 上游 + 工厂 + R2 落盘链路全通**；画面内容与 prompt 一致（红苹果/木桌/棚拍光），长边 1024 = 面板 1K 承诺 |
| 未覆盖 | BFF 侧积分扣减（探针直连 worker）；按「不实测」口径未做批量/画质评测 |

证据图：`docs/assets/flux-schnell-rp-probe-2026-11-20.webp`

### 7.3 遗留（非阻断）

1. 8 个混合池工具页「对比表能力峰值档」由 refs 最高档变为文字最强档（C 批预期副作用，产品如要 refs 优先需另改启发式）。
2. `verify:premium` WARN（visible 84 vs 基线 62，存量）；snapshot 607KB > 600KB 软告警；catalog-mapping soft warns 45（存量未产品化档，C 批前后不变）。
3. 旧 id remap 仍指向 klein（未改，另立决策）；6 个 tool 级 sRI 工具上传槽 illusion 未修（历史先例）。
4. 回滚预案：revert 上述 commits + 手删 61 个 `*-flux-schnell-rp` KV key + 前端回退。
