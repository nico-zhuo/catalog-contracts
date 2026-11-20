# FLUX.1 [schnell] 新增（ai-text-to-image 池）· 检查结论与待办清单（2026-11-19）

> 依据（唯一真源）：Replicate 模型页 <https://replicate.com/black-forest-labs/flux-schnell>
> 用户指令：**先检查、列待办清单、先不执行**。本文只做检查与任务分配，不含代码改动。
> 开团：ab-team（frontend = arui，backend = image-workers；契约仓 catalog-contracts 只读共享）。

> ⚠️ **2026-11-20 更新：本文的 A 方案（仅 t2i 一档）已被用户改选的「方案 C（61 档全量新建）」取代**，执行口径以 [FLUX-Schnell全量回补-方案C-检查与待办清单-2026-11-20.md](<FLUX-Schnell全量回补-方案C-检查与待办清单-2026-11-20.md>) 为准；本文保留作历史记录（附录 A/C 的历史清单与平台口径仍有效）。
> 侦察轮：backend / frontend 两位 teammate 均只读侦察（零写入、未 claim 实现任务），共享任务板 task-1 / task-2 已 completed。

## 一、检查结论（全只读，2026-11-19 22:14–23:0x）

### 1.1 上游平台事实（API 实拉，非页面文本）

`GET https://api.replicate.com/v1/models/black-forest-labs/flux-schnell` → 200，**与 2026-11-02 首次上线时一致，无需重新调研 / 迁移**：

| 项 | 值 |
|---|---|
| latest_version | `c846a69991daf4c0e5d016514849d14ee5b2e6846ce6b9d6f21369e564cfe51e`（2025-06-25 创建；与仓内现役 sankey/venn 档同一 hash） |
| Input | `prompt`(必填) / `aspect_ratio`(enum 11 值，默认 `1:1`) / `megapixels`(enum `1`/`0.25`，默认 `"1"`) / `num_outputs`(1–4，默认 1) / `go_fast`(默认 true) / `num_inference_steps`(1–4，默认 4) / `disable_safety_checker`(默认 false) / `output_format`(webp/jpg/png，默认 webp) / `output_quality`(0–100，默认 80) / `seed` |
| Output | `uri[]`（1–4 张） |
| billingConfig | **`$3` / 1000 output images ≈ `$0.003`/张**（「or around 333 images for $1」）；H100，`$0.001525`/s，p50 `$0.0048` |
| 能力 | 纯 T2I，**无参考图**、无 Web Search、无 quality 维度；11 个具名比例（无 auto / 无 custom）；`megapixels` 两档同价 |

### 1.2 现网「对接」基线（实查生产 KV + 两仓只读门禁）

| 项 | 实测 |
|---|---|
| image-workers 生产 `GET /__catalog/read` | **1451 entries**，全部 active、0 deprecated |
| flux-schnell 现役档 | **仅 2 条**：`ai-sankey-diagram-generator-flux-schnell`、`ai-venn-diagram-maker-flux-schnell`（`creditCost: fixed 3`） |
| `ai-text-to-image` | **24 档**（15 OR + 9 `-rp`），**无 flux-schnell** |
| image-workers HEAD | `bd15418`（11-18 九档回迁已上线、KV 1451），worktree clean；`check:registry` ✅1451 / `typecheck` ✅ / `vitest` ✅ 8 files 112 tests |
| arui HEAD | `58d312db7`，worktree clean；`tsc --noEmit` ✅ / `verify:branding` ✅（可见 1589）/ `verify:premium` ✅（WARN 83/75，基线偏离为存量）/ `verify:brand-color` ✅ |
| arui 本地快照 | **stale 存量债**：`app/data/model-snapshot.json` 仍是 11-11 基线 → 本地 `verify:model-snapshot` RED、`verify:model-selection` 在 `model-selection.ts:640` 空池崩溃（11-18 已记录、干净 HEAD 复现）；CI 会先 `snapshot:models` 刷新，故 CI 侧可绿。**本批执行前不要以「本地全绿」为验收** |
| 契约仓 | `d783526`；工作区有**未提交**的 `CLAUDE.md`（新增「共享文件/跨模型影响修改授权」+「catalog.params 暴露原则」），本批不 touch |

### 1.3 可复用资产（零调研、零新上游、零新 locale）

1. **旧档 handler 完整可复原**：`git show 23c733a^:src/models/ai-text-to-image-flux-schnell/handler.ts`（129 行，2026-11-15 T2-B2 删除前终态，含契约、计价理由注释）——模板直接取它，去掉 `deprecated` / `deprecated_alternatives`、`handlerVersion` 重置 `v1`、换新尾段与文件头注释即可。
2. **现役同上游参照档**：sankey/venn（`handlerVersion: v2`）——同一 upstream hash / 11 比例 / `megapixels:"1"` / `cancelAfter:"2m"` / `maxDimension 1024` / `resolution` 单选项 1K display-only / `supportsReferenceImage:false`；差异只是工具级 style/direction 注入（本批纯 T2I，**不做注入**）与积分（图表页产品价 fixed 3，非成本换算）。
3. **前端展示名零新增 locale**（已实测 32/32 齐）：`models.aruiFluxSchnell.name = "FLUX Schnell"`、`modelBranding.fluxSchnell.description`、11 个 `params.aspect_ratio.*` key。
4. **品牌 canonical 源在册**：`model-branding.ts:661` 的 `arui-ai-text-to-image-flux-schnell` 条目「保留禁删」——新尾段需**新增 1 条** canonical，否则 `verify:branding` 直接 exit 1。

### 1.4 共享层影响：零（本批最关键结论）

- **契约仓零变更**：只用现有 `ParamSchema`（text/enum）+ `creditCost.fixed` + `maxDimension` 等冻结字段 → 不 bump `schemaVersion`、不改 `schema.ts` / `schema.zod.ts` / `CHANGELOG.md`、不动 submodule 指针、不跑 smoke test。
- **image-workers 零共享文件改动**：手写仅 1 个新 `src/models/<modelId>/handler.ts`；`_registry.ts` 由 prebuild 自动重生成；`src/index.ts` / `replicate.ts` / `shared/*` / `scripts/*` 全不动。guard 只读复算：tokens 1506（= `bd15418` 记录值）→ 预期 1507（仅新 model_id +1；`black-forest-labs/flux-schnell` 已是既有 token，去重不增）。
- ⚠️ 若实现轮发现**必须**动共享文件，按 `CLAUDE.md` 新规**先报 Lead 授权**，未授权不动。

### 1.5 命名：旧 id / 旧 tierId 都已烧毁，必须新尾段

- 旧 modelId `ai-text-to-image-flux-schnell`：`969c77e` 新增（11-02）→ `d1acc7d` 标废 → `23c733a` 删除（11-15），**永久烧毁不可复用**（架构 §13.3 / §8.4 + 契约仓 README + 11-18 回迁文档同口径）；无 `-or` 代。
- 旧 tierId `flux-schnell` 也**不能复用**：sankey/venn 仍 active、TEXT_STRENGTH / premium / 池表都按它索引。
- 建议：`modelId = ai-text-to-image-flux-schnell-rp`、`clientModelId = arui-…-rp`、`tierId = flux-schnell-rp`（11-18 N-1 拍板的 Replicate 回迁后缀，与 `-or` 对称）。

### 1.6 定价页事实对照

定价页 tooltip 现写「**from about 1 credit per image**」（32 语），但 11-15 换源批后全站最低档已是 **3 积分**（klein）→ **文案与事实脱节**。本档按 fixed 1 加回后恢复自洽（= 旧档口径）。

### 1.7 存量债（登记不修）

1. arui 本地快照 stale → `verify:model-snapshot` RED / `verify:model-selection` 空池崩溃（CI 刷新后可通过；11-18 已记录）。
2. `verify:premium` 基线偏离（visible 83 vs 62 基线）仅 WARN —— 存量偏账。
3. image-workers `docs/text-to-image模型.md` 仍是旧 17 档口径（换源批未回填）。
4. 契约仓 `CHANGELOG [1.8.0] 2026-11-16（CreditSurcharge.perItem）` 与 `schema.ts` 的 `CURRENT_SCHEMA_VERSION = "1.7.0"` 自相矛盾（`7d11c9e` 加字段未 bump 常量；arui 子模块也钉在 `7d11c9e`）。BFF `^1` 无运行时影响，**另立修复任务**，不在本批。

## 二、决策点（✅ 2026-11-20 00:0x 用户拍板「按建议」，全部选推荐项）

> 拍板结果：D-1 = **A（仅 ai-text-to-image 一档）**；D-2 = **`flux-schnell-rp`**；D-3 = **fixed 1 积分**；D-4/D-5 = **非高级 + 默认档不切（保持 klein）**。D-6/D-7 按建议（`num_outputs` 不暴露、比例 11 全量）。D-8 待执行轮再定（默认不批量实测）。
> **状态：决策已闭环，代码仍未开工（用户指令「先不执行」，等放行）。**

| # | 项 | 建议 | 说明 |
|---|---|---|---|
| **D-1** | **范围（阻塞）** | **A：只回补 `ai-text-to-image` 一档** | A = 1 handler + 8 处前端触点，KV 1451→1452、mapping 1589→1590；B = t2i + 10 个签名工具（11 档，签名页 11-11 曾默认 flux-schnell，但 11-17 已统一收口 OR 池，回补需重开签名池）；C = 全量回补原 58 工具（不建议，与换源批收口冲突） |
| D-2 | 新尾段命名 | **`flux-schnell-rp`** | 与 11-18 批一致；备选 `flux-1-schnell` 会引入第二套后缀，不推荐 |
| D-3 | 计价 | **`fixed 1`**（ceil($0.003×300)=1；旧档 1；毛利 66.7%；恢复定价页 1 积分锚点） | 备选 3（图表页产品价口径，非成本换算；会让 1 积分文案继续失真） |
| D-4 | 是否非高级（PREMIUM 徽标） | **加入 `NON_PREMIUM_TIER_IDS`（非高级）** | 旧 flux-schnell 非高级、同模型 sankey/venn 也非高级；不加则 t2i 面板出现 PREMIUM 徽标（不一致） |
| D-5 | 默认档是否切换 | **不切**（保持 klein）；切默认须与 mapping 同 commit（踩坑 #46 fallback） | 产品决策 |
| D-6 | `num_outputs` 是否暴露 | **不暴露**，`defaults: 1` | 按 Param Exposure Principle「性能成本类」；要暴露须 (a) 先实测「传 N 得 N」（踩坑 #37）(b) 配 `perUnit num_outputs {1:1,2:2,3:3,4:4}`。否则前端会自动渲染数量分段而只按 1 张计费 → 少收/失真 |
| D-7 | 比例集合 | **上游 11 值全量** | 图表工具 3 值是工具子集口径，不适用于 t2i |
| D-8 | 实测 | 历史批「不实测」；T4 建议做 **1 张端到端探针**（11-18 批先例，不批量） | 需用户授权 spend |

## 三、任务分配（共享任务板；**未获放行前谁都不开工**）

| 任务 | 负责 | 写域 | 依赖 |
|---|---|---|---|
| **T1** 检查 + 待办清单（本文）+ 契约零变更确认 | Lead | catalog-contracts/docs | ✅ 本轮完成 |
| **T2** backend：新增 `ai-text-to-image-flux-schnell-rp` handler | backend（image-workers） | `src/models/**`（单个新目录）+ `docs/**` 最小增量 | D-1~D-3、D-7 拍板 |
| **T3** frontend：8 处触点（零新增 locale） | frontend（arui） | `app/config/**`、`app/lib/**`、`app/routes/api.ai.submit.bff/**`、`scripts/verify-model-selection.ts` | D-1/D-2/D-3/D-4/D-5 拍板；与 T2 并行备好 hold |
| **T4** 收口：放行时序 + KV 对账 + 端到端探针 + 文档回填 | Lead | catalog-contracts/docs | T2+T3 |
| **T5**（可选后续）签名工具回补 / `num_outputs` 计费 / t2i 文档全文回填 | 待定 | — | D-1 之后 |

### T2 backend 明细（执行时）

1. 新建 `src/models/ai-text-to-image-flux-schnell-rp/handler.ts`（单文件，禁拆）：模板 = `23c733a^` 旧档，`handlerVersion: "v1"`，`upstream_model/upstream_version` 照抄（hash 未变）。
2. `param_mapping`：`prompt` / `aspect_ratio`；`accepted_params`：**`["prompt","aspect_ratio"]`**。
3. `defaults`：`aspect_ratio: "1:1"`、`megapixels: "1"`。
4. `transformInput`：11 比例白名单，非枚举回退 `1:1`。
5. catalog：`toolSlug:"ai-text-to-image"`、`tierId:"flux-schnell-rp"`、`creditCost: fixed 1`、`maxDimension:1024`、`supportsQueue:true`、`supportsReferenceImage:false`、`resolution` 单选项 `1K`（display-only，踩坑 #43）、params = prompt / aspect_ratio(11) / resolution(1K)。
6. 隐藏参数 self-review（全部不进 `catalog.params` / `accepted_params`）：`megapixels`（技术细节，锁 "1"）、`num_outputs`（性能成本，锁 1）、`go_fast`（性能）、`num_inference_steps`（性能成本，默认 4）、`disable_safety_checker`（**安全类，硬不暴露**）、`output_format`（技术细节，默认 webp）/ `output_quality`（技术细节）/ `seed`（技术细节）。
7. `cancelAfter: "2m"`（同基准档与现役兄弟档；Replicate Cancel-After 5s–24h）。
8. 门禁（只读实测当前全绿，可作预期）：`npm run prebuild` → registry **1451→1452**、guard tokens **1506→1507**；`check:registry` ✅1452；`typecheck` 0；`npm test` 112/112（不变）；`build` 可选。**不动共享文件**。
9. 本地 hold，不 push；等 Lead 放行（**新增批 backend 先行**）。

### T3 frontend 明细（执行时，8 处）

| # | 文件 | 改动 | 类型 |
|---|---|---|---|
| 1 | `app/routes/api.ai.submit.bff/model-id-mapping.ts` | +1 行：`arui-ai-text-to-image-flux-schnell-rp` → `ai-text-to-image-flux-schnell-rp`（t2i 24→25） | 新增 |
| 2 | `app/lib/generation-queue.server.ts` | `IMAGE_ASYNC_MODEL_IDS` +1 行（**P0**：`isReplicateTierModelId` 实测不覆盖 t2i，漏加 = 3min 僵尸误杀先退款） | 新增 |
| 3 | `app/config/canvas-tools.ts` | `MODEL_I18N_KEY_MAP` +1 行 → `aruiFluxSchnell`（否则 camelCase 派生 key 不存在 → 面板裸显示 tierId） | 新增 |
| 4 | `app/config/model-branding.ts` | +1 条 canonical（`/brand/flux.svg`、FLUX、`modelBranding.bfl.subtitle`、`modelBranding.fluxSchnell.description`、`eta: "3-15s"`）；缺则 `verify:branding` exit 1 | 新增 |
| 5 | `app/config/model-selection.ts` | TEXT_STRENGTH 三表各 +1：`flux-schnell-rp` / 32 分 / `weak`。**必须补**：hub 按 nameKey 聚合取首条 mapping，新 t2i 显式行在池 spread 之前 → `/models` 的 FLUX Schnell 行 `tierId` 归因变新尾段，不补则 textStrength 变 null | 新增 |
| 6 | `app/config/model-premium.ts` | `NON_PREMIUM_TIER_IDS` +1 `flux-schnell-rp`（D-4 拍板后） | 新增 |
| 7 | `scripts/verify-model-selection.ts` | 断言 `TEXT_STRENGTH_RANK.length` **38→39**（+日志） | 修改 |
| 8 | `app/data/model-snapshot.json` | **不手改**，执行轮 `pnpm snapshot:models` 刷新（CI 自动 `|| true`） | 生成 |

**零改动（已逐条核实）**：`replicate-tier-tools.ts` 全文件（t2i 不在池表；⚠️ **切勿**把新尾段加进 `REPLICATE_TIER_I18N_KEYS` —— 会经 `LEGACY_REPLICATE_TAILS` 向 102 工具扇出 → `verify:catalog-mapping` HARD FAIL）；legacy remap（旧 id → klein）保持不动；locales（32 语全复用）；`aspect-resolution-archive.ts`（display-only 1K 无需徽标白名单）；`canvas-tools.ts` t2i 默认档；`/models` hub 与定价页（快照/catalog 自动跟随）；`ns-tool-map`、e2e。

**门禁与期望数字**（执行轮，需先 backend KV 就绪）：`tsc --noEmit` 0 → `verify:branding` 可见 **1589→1590** → `verify:premium` ✅（WARN visible 83→84，非阻断）→ `verify:brand-color` ✅ → `lint-i18n --quick` ✅ → `snapshot:models` → `verify:model-snapshot`（coverage=mapped=1590、孤儿 0）→ `verify:model-selection`（39）→ `verify:catalog-mapping`（KV 1452 / hard fail 0）→ CI build。

### T4 收口明细

1. backend push → CI Deploy → `sync:catalog`（1452 = 500/500/452 三片，written 1452/1452）→ snapshot 1 key → `verify:catalog` **1452 entries、0 deprecated**。
2. arui push → CI（Refresh snapshot → Build → verify:model-snapshot/selection → verify:catalog-mapping **1452 / hard fail 0**）。
3. 端到端探针（D-8 授权后）：真实生成 1 张 `arui-ai-text-to-image-flux-schnell-rp`（1:1 / 1K），验证 Replicate 通路 + 扣 1 积分 + R2 落盘（`image.arui.ai`），并回填首账单口径。
4. 回填本文档终态 + `docs/text-to-image模型.md` 最小增量（BFL 段、模型表 +1 行、计费表 +1 行、旧 id 标「11-15 已删 / 本轮 -rp 重建」）。

## 四、风险清单

1. **异步僵尸阈值 P0**：t2i 不在池表、也不在 `IMAGE_FLUX_OR_TAILS`（只认 `-or`）→ 唯一入口 `IMAGE_ASYNC_MODEL_IDS`，漏加即 3min 误杀资损。
2. **池表扇出陷阱**：新尾段误加进 `REPLICATE_TIER_I18N_KEYS` → 102 工具全体生成不存在档 → CI HARD FAIL（T3 明确「零池表改动」）。
3. **hub 归因副作用**：/models 的 FLUX Schnell 行 tierId/premium/textStrength 由新尾段决定 → TEXT_STRENGTH + premium 两处必须同批补（否则该行降级）。
4. **时序**：必须 backend 先行（arui CI 对 KV 硬校验；快照 refresh 拉不到新档会 coverage fail）。
5. **旧 id 复用陷阱**：历史画布 remap 仍指向旧 `ai-text-to-image-flux-schnell` → 复用会重建已烧毁 id、语义漂移（已由 `LEGACY_CLIENT_REMAP_EXPLICIT` 兜底到 klein，不动）。
6. **本地快照 stale**：执行轮前不要承诺本地全绿；`verify:model-snapshot` / `verify:model-selection` 的红是存量债。
7. **输出 webp**：工厂按输出 URL 扩展名落 R2（.webp），`<img>` 正常，无 png 承诺（与现役 sankey/venn 一致）。
8. **契约仓版本号矛盾**（见 §1.7-4）：不在本批，另立修复。

---

## 附录 A · 历史范围：flux-schnell 曾经在哪些工具页（2026-11-20 补查，全只读）

> 数据来源：image-workers `git log --all --diff-filter=D/A -- 'src/models/*flux-schnell*'`（历史共 **63** 个 handler 目录）+ arui `app/data/model-snapshot.json`（11-11 15:12 生产快照，60 条 flux-schnell 档）+ 换源批 commit 记录。

### A.1 时间线

| 日期 | 事件 | 有 flux-schnell 的工具页数 |
|---|---|---|
| 2026-11-02 | 首次上线：`ai-text-to-image` 新增 FLUX 系列 5 档，flux-schnell = fixed 1（$0.003/张） | 1 |
| 2026-11-04 ~ 11-06 | 17 档 Replicate 模型池扩到 84 + 18 个图片工具（批一~批四），flux-schnell 随池下发到「纯 T2I / 参考图可选」工具组 | 约 50 |
| 2026-11-11 | 签名页引流批（10 个签名页默认档切 flux-schnell，5 个上传型签名工具单独追加）+ 图表批（sankey/venn/circuit 追加） | **峰值 63**（11-11 快照 60 条 + 当日 18:20 追加 3 条） |
| 2026-11-15 | T2-B2：`ai-text-to-image` 删 14 个 Replicate 旧档（含 flux-schnell） | 62 |
| 2026-11-17 | 换源批 A（51 工具 / 8faa4c2）、B（8 工具 / 688a328）、C（1 工具 / 70f667c）删除旧池档 | **2**（仅 sankey / venn 保留，3 积分） |
| 2026-11-18 | 九档 `-rp` 回迁（Google/GPT），**未含** flux-schnell | 2 |

### A.2 峰值清单（63 个工具页，按家族）

**① 旗舰 T2I（1）**：`ai-text-to-image`（fixed 1）

**② 通用图片生成（40）**——全部随「17 档 Replicate 池」下发：
ai-ai-drawing-generator / ai-album-cover-generator / ai-anime-art-generator / ai-anime-character-generator / ai-anime-image-generator / ai-anime-picture-generator / ai-body-generator / ai-caricature-maker / ai-cartoon-character-generator / ai-cartoon-strip-generator / ai-character-creator / ai-color-palette-generator / ai-coloring-book-generator / ai-doodle-generator / ai-face-generator / ai-fursona-generator / ai-gaming-thumbnail-maker / ai-icon-generator / ai-logo-maker / ai-manga-generator / ai-monster-generator / ai-ocs-creator / ai-pattern-generator / ai-photography-generator / ai-pixel-art-generator / ai-pixel-avatar-maker / ai-portrait-generator / ai-selfie-generator / ai-sketch-generator / ai-smile-generator / ai-sprite-generator / ai-text-to-poster / ai-vector-generator / ai-vtuber-maker / ai-waifu-generator / ai-wallpaper-generator / ai-youtube-banner / art-ai-generator / illustration-generator / product-image-generator

**③ 图表类（12）**：
- 纯 T2I 9 个（随池）：ai-architecture-diagram-generator / ai-data-flow-diagram-maker / ai-er-diagram-generator / ai-flow-chart-maker / ai-hierarchy-chart-maker / ai-mind-map-generator / ai-org-chart-maker / ai-spider-chart-maker / ai-uml-diagram-generator
- I2I 3 个（11-11 单独追加）：**ai-sankey-diagram-generator ✅现役** / **ai-venn-diagram-maker ✅现役** / ai-circuit-diagram-generator（11-17 批 B 删除）

**④ 签名类（10，fixed 3）**：ai-electronic-signature-maker / ai-email-signature-generator / ai-gmail-signature-generator / ai-handwriting-generator / ai-handwritten-signature-generator / ai-html-signature-generator / ai-outlook-signature-generator / ai-professional-email-signature-generator / ai-signature-generator-cursive / ai-signature-png-maker
（其中 5 个纯 T2I 随池、5 个上传型为 11-11 引流批单独追加）

**❌ 从来没有的**：上传型 / 必须参考图的工具组——如 ai-2x2-picturer、各类 avatar（anime/cartoon/chibi/fantasy/pixel…）、photo-to-*（anime/cartoon/sketch/poster…）、image-to-image-converter、photo-editor/retouching/filter、background-remover、证件照 / passport / id-photo、logo-video 等（当时按能力矩阵明确排除「无参考图档」）。

### A.3 当时的范围规则

- 池分组矩阵（`app/config/replicate-tier-tools.ts` 文件头）：flux-schnell 是**无参考图档** → 只进 `ALL_17`（纯 T2I / 参考图可选）与 `G16`（16:9 固定画幅，G16 不排除无参考图档）；**`NO_REF_14` / `G13` / `PASS_13` / `I2I_13` / `I2I_12` 等上传型组明确排除**。
- 例外追加（均为产品引流决策）：11-11 签名批 5 个上传型签名工具 + 10 个签名页默认档；11-11 图表批 3 个 I2I 图表工具（sankey / venn / circuit）。
- 峰值的 63 = 池派生 49（40 通用 + 9 纯 T2I 图表）+ 旗舰 1 + 签名 10 + 图表追加 3。

### A.4 与本次范围（D-1 = A）的对照

| 方案 | 工具页数 | 说明 |
|---|---|---|
| **本次 D-1=A** | **1**（ai-text-to-image） | 拍板选项；KV 1451→1452 |
| 若按历史池派生回补 | +50（40 通用 + 10 纯 T2I 图表，不含现役 2） | 需 50 个 handler；**不是政策冲突**（11-18 起 OR/Replicate 并存），成本在改动面与验证面 |
| 若按历史全量回补 | +61（63 − 现役 2） | 另含 10 签名（fixed 3 口径）+ 图表 3（其中 circuit 已换源） |

结论：**历史 63 个工具页 ≠ 本次范围**。本次只回补旗舰 T2I 一档；其余 61 页属历史引流/池派生，如需分批回补应另立批次（建议优先级：签名 10 > 图表 3 > 通用 40，且需先重开对应工具池 + 前端白名单追加）。

> ⚠️ **2026-11-20 口径修正**：11-17 的「换源批统一收口 OR 池」是**批量迁移动作**，不是平台政策。11-18 平台政策终版明确 **OR 与 Replicate 并存、OR 为主**，因此「回补 Replicate 档」本身不与任何政策冲突（详见附录 C）。

---

## 附录 B · 方案 B 范围定义（2026-11-20 补查，只读）

> **B = A（ai-text-to-image 1 档）+ 10 个签名工具页各回补 1 档 flux-schnell-rp** ⇒ 共 **11 个工具页 / 11 个新 handler**。
> 不含：其它图表工具（circuit 等 10 个）、通用图片生成 40 个、上传型 avatar/photo-to-* 等（见附录 A）。

### B.1 10 个签名工具页现状 + 历史契约

| 工具 slug | 当前档数 / 池 | 当前默认档 | 历史 flux-schnell 契约（待恢复） |
|---|---|---|---|
| ai-electronic-signature-maker | 12（OR_12） | klein（3） | prompt + aspect_ratio（11 值），fixed 3 |
| ai-email-signature-generator | 15（OR_15） | klein（3） | prompt + style + colorScheme + aspect_ratio（11 值），fixed 3 |
| ai-gmail-signature-generator | 12（OR_12） | klein（3） | prompt + style + colorScheme + aspect_ratio（11 值），fixed 3 |
| ai-handwriting-generator | 12（OR_12） | klein（3） | prompt + aspect_ratio（11 值），fixed 3 |
| ai-handwritten-signature-generator | 15（显式 15 档） | klein（3） | prompt + brushStyle + inkColor + aspect_ratio（11 值），fixed 3 |
| ai-html-signature-generator | 12（OR_12） | klein（3） | prompt + style + colorScheme（**无比例参数**），fixed 3 |
| ai-outlook-signature-generator | 15（OR_15） | klein（3） | prompt + style + colorScheme + aspect_ratio（11 值），fixed 3 |
| ai-professional-email-signature-generator | 12（OR_12） | klein（3） | prompt + style + colorScheme + aspect_ratio（11 值），fixed 3 |
| ai-signature-generator-cursive | 15（OR_15） | klein（3） | prompt + brushStyle + inkColor + aspect_ratio（11 值），fixed 3 |
| ai-signature-png-maker | 15（OR_15） | klein（3） | prompt + brushStyle + inkColor + aspect_ratio（11 值），fixed 3 |

- 10 档历史均为 `supportsReferenceImage: false`（FLUX Schnell 无参考图；工具本身的 I2I 档另算）、`maxDimension 1024`、`cancelAfter 2m`。
- 工具级 prompt 注入与枚举（style / colorScheme / brushStyle / inkColor）**逐字在 git 里**：待恢复位置 `8faa4c2^`（cursive / png / email / outlook）、`688a328^`（electronic / gmail / handwriting / handwritten / professional）、`70f667c^`（html）。
- 当前签名页最便宜档 = klein 3 积分 → B 若沿用 fixed 3 **不改变页面价格锚点**；若统一 fixed 1 则签名页会出现 1 积分。

### B.2 B 的改动面与数字

**backend（image-workers）**：11 个新 handler（1 个 t2i 基准 + 10 个签名工具级）
- registry **1451 → 1462**；guard tokens **1506 → 1517**；tests 112 不变（现测试无签名档数断言）；零共享文件改动。
- 签名档按「新 modelId 从 v1 起」重置 handlerVersion；`resolution` 统一 display-only 不进 `accepted_params`（规范化旧 v3 的遗留写法）。

**frontend（arui）**：A 的 8 处 + 签名专属 3 处
- mapping **1589 → 1600**（t2i 显式 +1；10 个签名档经池白名单 append 自动派生）。
- `replicate-tier-tools.ts` **结构性改动**：新增签名 append 名单（10 工具）+ 尾段 i18n key 走**独立映射表**（⚠️ 不能塞进 `REPLICATE_TIER_I18N_KEYS`，否则经 `LEGACY_REPLICATE_TAILS` 扇出到 102 工具 → CI HARD FAIL）。
- `IMAGE_ASYNC_MODEL_IDS`：只需 t2i +1；10 个签名档 append 进 `REPLICATE_TIER_TAILS_BY_TOOL` 后由 `isReplicateTierModelId` 自动落 11min 阈值。
- branding canonical +1 自动 fanout 到 10 工具；`NON_PREMIUM_TIER_IDS` / TEXT_STRENGTH 各 +1（按尾段索引，一处覆盖 11 档）。
- canvas `MODEL_I18N_KEY_MAP` 仅 t2i +1（签名走池派生）；**10 个签名页默认档切换**为子决策（切则 canvas-tools +10 行）。
- verify 数字：branding/premium 可见 **1600**、rank **39**、verify:catalog-mapping **1462 / hard fail 0**。

### B.3 B 的子决策（若选 B 需拍板）

| # | 项 | 建议 |
|---|---|---|
| B-1 | 签名 10 档积分 | **fixed 3**（历史口径 + 不动签名页价格锚点）；t2i 仍 fixed 1 |
| B-2 | 10 个签名页默认档 | **切到 flux-schnell-rp**（恢复 11-11 引流批原意；需同 commit 改 canvas-tools，踩坑 #46） |
| B-3 | 工具级参数 | **逐字恢复**（brushStyle/inkColor、style/colorScheme），否则面板与历史档不一致 |
| B-4 | 交付方式 | **建议拆两波**：波 1 = A（t2i 1 档，1 天）先上线；波 2 = 签名 10 档（另 1 天，独立验收/回滚） |

### B.4 工作量与风险对比

| 项 | A（现拍板） | B |
|---|---|---|
| 新增 handler | 1 | 11（10 个 bespoke，含工具级注入） |
| 前端触点 | 8 | 8 + 签名池结构改动 + 10 默认档 |
| registry / KV | 1452 | 1462 |
| mapping | 1590 | 1600 |
| 相对工作量 | 1× | ≈ **2.5–3×** |
| 主要新增风险 | 无（纯新增单文件） | ① 前端池表结构改动（扇出陷阱）② 10 个工具首次出现 Replicate 上游档（**符合 11-18 并存政策**，t2i 已有混合先例；仍需逐个 verify:catalog-mapping 实查）③ 10 个默认档切换的 fallback 一致性 |

**结论**：B 的边界 = 「旗舰 T2I + 签名 10 工具」，不含图表与通用图片工具；建议以「A 先行、签名 10 档为 B2 波」的方式落地，避免一次改动横跨 11 个工具 + 前端池表结构。

---

## 附录 C · 平台共存口径与上游归属核查（2026-11-20，只读实证）

> 触发：用户指出「现在是 OR 和 Replicate 共存的」。本附录修正正文中把「11-17 换源批」误当平台政策的表述。

### C.1 政策终版（11-18 用户拍板，`e472c8f`）

> **OpenRouter 与 Replicate 两平台均可使用；OpenRouter 为主平台。** Google/GPT 系恢复候选资格；11-16「Google/GPT 永久排除」作废。11-17 的「换源批」只是**批量迁移动作**（把多数工具的 Replicate 旧档换成 OR 档），**不是政策禁止 Replicate**。

### C.2 现网共存实证（2026-11-20 实查生产 KV 1451 档）

| 上游 | 档数 | 构成 |
|---|---|---|
| OpenRouter | **1371**（94.5%） | 15 个 OR 尾段（flux-3-image-klein / flux-3-image-or / flux-2-*-or / seedream-*-or / qwen×2 / recraft×3 / grok-or 等） |
| Replicate | **80**（5.5%） | 9 个 `-rp` 回迁档（Google/GPT，11-18 批）+ `flux-schnell` 2（sankey/venn）+ 人脸类工具旧池档（nano-banana×5 / gpt-image×2 / seedream×5 各 5 工具）+ bria 抠图 3 类 + flux/grok 旧尾段 |

`ai-text-to-image` 本身就是**混合上游页**：24 档 = 15 OR + 9 Replicate（`-rp`）。⇒ 同一工具页混合上游是**已被生产验证的常态**，不是本批新增风险。

### C.3 为什么 flux-schnell 只能走 Replicate

今日实拉 `GET https://openrouter.ai/api/v1/images/models` → **70 个 OR 图像模型**，BFL 系只有：
`black-forest-labs/flux-3-image` / `flux-3-image-klein` / `flux.2-pro` / `flux.2-max` / `flux.2-flex` / `flux.2-klein-4b`。
**没有 FLUX.1 [schnell]**（也没有任何 `*-schnell`）⇒ 该模型在 OR 无对应上游，「改走 OR 以保持池统一」这个选项**不存在**；走 Replicate 是唯一可达路径，且完全符合 11-18 并存政策。

### C.4 对 A/B/C 结论的影响

- **政策层面**：A/B/C 都合规，不存在「回补 Replicate 档违反收口」的问题（正文相关表述已修正）。
- **范围层面**：A（1 页）/ B（11 页）/ C（62 页）的差异纯粹是「回补多少个工具页」的成本与验证面，与平台政策无关。
- **B 的真实成本**仍是：11 个 handler + `replicate-tier-tools.ts` 池表结构改动（扇出陷阱）+ 10 个默认档切换 + 11 个页面的 verify 实查；建议仍按 B-4 拆波（A 先行）。
