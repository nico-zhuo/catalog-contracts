# 三工具 + 首页默认档切回 Seedream 5.0 Flash · 检查结论与待办清单（2026-11-25）

> **需求（用户原话）**：「AI Text to Image 和 AI Circuit Diagram Generator 和 AI Chibi Avatar Maker 和 首页的多模态输入框的 Text to Image 默认档都切换为 Seedream 5.0 Flash 模型，你来分配任务，先检查，列一份代办清单，下不执行」。
>
> **团队**：ab-team（backend = image-workers、frontend = arui；catalog-contracts 只读共享）。
> 侦察轮共享任务板 `task-3`（backend）/ `task-4`（frontend）均 **complete**，**两仓零写入**：
> arui HEAD=`8dee1a0fc`（`git status` 侦察前后一致，仅存量未跟踪预览文件）、image-workers HEAD=`cfcf3bf`（干净）。
>
> **本轮只做检查与排程，不含任何执行动作**（未改两个仓任何文件、未 deploy、未 sync、未写 KV；本文件即本轮唯一新增物）。
>
> **执行终态（2026-11-25 15:36 放行 → 15:56 上线）**：用户拍板 D-1~D-7 并放行；arui commit `82518c43f` + CI `45571069592` 全绿 + deploy 成功；线上 7 页面实证通过。详见 §十。

---

## 〇、一句话结论

现网这 4 个位置默认档都是 **Seedream 4.0（`seedream-4-rp`，Replicate，fixed 9 / 1K-2K-4K / md 4096 / 参考图 ≤10）**；
用户要求切回 **Seedream 5.0 Flash（`seedream-5-0-flash`，OpenRouter，fixed 6 / 1K-2K（默认 1K）/ md 2048 / 参考图 ≤14）**。

**改动面 = 前端 `canvas-tools.ts` 3 行 `defaultModelId` 值 + 7~8 处注释；后端 0 改动；契约 0 变更；mapping / 池表 / i18n / branding / 异步阈值 / locales / 快照 0 新增、0 变更。**
「首页多模态输入框的 Text to Image」**没有独立默认档配置**——4 个 hero 页面（`/`、`/canvas-home`、`/ai-image-generator`、`/ai-picture-generator`）都读 `ai-text-to-image` 的 `defaultModelId`，改 t2i 一行即自动跟随。

这是「一行默认档切换」类改动的第 2 批工具级例外（先例 = 2026-11-23 `ai-id-photo-maker` 回切 flash，见 `docs/id-photo-maker默认档切Seedream5.0Flash-检查与待办清单-2026-11-23.md`）。

---

## 一、现状（2026-11-25 实拉 / 实测）

### 1.1 四个目标位置当前默认档 = Seedream 4.0

| # | 位置 | 默认档来源 | 现值 | 实测 |
|---|---|---|---|---|
| 1 | AI Text to Image 工具页 `/ai-image-generator/text-to-image` | `arui/app/config/canvas-tools.ts:380` | `arui-ai-text-to-image-seedream-4-rp` | 线上 JSON-LD：`Seedream 4.0 is selected by default` |
| 2 | AI Chibi Avatar Maker `/ai-avatar-generator/chibi-avatar-maker` | `canvas-tools.ts:943` | `arui-ai-chibi-avatar-maker-seedream-4-rp` | 同上 |
| 3 | AI Circuit Diagram Generator `/ai-diagram-generator/circuit-diagram-generator` | `canvas-tools.ts:1112` | `arui-ai-circuit-diagram-generator-seedream-4-rp` | 同上 |
| 4 | 首页多模态输入框（Text to Image 预选） | `hero-section.tsx:22` 只定 `defaultToolSlug="ai-text-to-image"` → `hero-prompt-section.tsx:64-71` / `unified-prompt-bar.tsx:674`（预选）/ `:683-692`（失效回退）全部读 `currentTool.defaultModelId` | 跟随 #1 | **无独立默认档配置** |

登录后首页 `/canvas-home` 同样：`:444` 硬编码工具 `ai-text-to-image`、`:452-456` 读 `currentTool.defaultModelId` → 自动跟随。
**额外发现（同链路、会一并跟随）**：`/ai-image-generator`（`($locale).ai-image-generator._index.tsx:165`）与 `/ai-picture-generator`（`($locale).ai-picture-generator.tsx:225`）的 hero 也默认 t2i。

### 1.2 目标档 `seedream-5-0-flash`（现役、可路由）

| 工具 | model_id | factory / 上游 | 计价 | resolution | maxDim | maxRef | 状态 |
|---|---|---|---|---|---|---|---|
| text-to-image | `ai-text-to-image-seedream-5-0-flash` | `createOpenRouterImageHandler` / `bytedance-seed/seedream-5-0-flash` | fixed **6** | 1K/2K，默认 **1K** | **2048** | **14** | KV live、`deprecated` 缺省 |
| chibi-avatar-maker | `ai-chibi-avatar-maker-seedream-5-0-flash` | 同 | fixed 6 | 1K/2K，默认 1K | 2048 | 14 | 同 |
| circuit-diagram-generator | `ai-circuit-diagram-generator-seedream-5-0-flash` | 同 | fixed 6 | 1K/2K，默认 1K | 2048 | 14 | 同 |

- 线上 `GET https://arui.ai/api/catalog/{tool}` 实拉：三页档数 26 / 13 / 14，`tierId=seedream-5-0-flash` 均在列、`deprecated:false`、credit 6。
- i18n 展示名 `aruiSeedream50Flash` = **“Seedream 5.0 Flash”**（32/32 locale 已齐）；branding、异步 11min 阈值、映射表均已具备（见 §二.2）。
- 后端 REGISTRY 已注册这 3 档（提交于 11-15 `52e57a4` / 11-17 `a83a416`，早于线上部署 11-23 17:03）；catalog KV 由已部署 worker sync 写出 → 线上必可路由。

### 1.3 现默认档 4-rp vs 目标档 flash（逐工具）

| 维度 | `seedream-4-rp`（现默认） | `seedream-5-0-flash`（目标） | 可见变化 |
|---|---|---|---|
| 上游 | Replicate `bytedance/seedream-4`（固定 version `cf7d4319…a7e9`，异步 prediction，cancelAfter 10m） | OpenRouter `bytedance-seed/seedream-5-0-flash`（同步 + CF Queue） | 用户无感 |
| 计价 | fixed **9** | fixed **6** | 首屏价 9→6 |
| resolution | 1K/2K/**4K**，默认 **2K**，非必填 | **1K/2K**，默认 **1K**，必填 | 4K 选项从默认档消失（4-rp 仍可手选 4K）；初始分辨率 2K→1K |
| aspect_ratio | t2i/chibi 8 值；circuit 3 值（1:1/4:3/16:9） | 17 值（含 4:5 / 5:4 / 1:2 / 2:1 / 9:19.5 等） | t2i/chibi 8→17（超集）；circuit 3→17 |
| maxDimension | 4096 | 2048 | 上限降 |
| 参考图上限 | t2i/chibi 10；circuit 3 | 14 | 放宽 |
| catalog params 键集 | t2i/chibi `{prompt, aspect_ratio, resolution, image_urls}`；circuit `{prompt, style, aspect_ratio, resolution}`（**无 image_urls**，上传门在 handler `422 REFERENCE_REQUIRED`） | t2i/chibi 逐字相同；circuit 多一个**可选** `image_urls`，且 handler **无必填门** | circuit 的「必须上传参考图」后端约束消失 |
| accepted_params | — | 4-rp 会发的参数名全部在 flash 白名单内 | **无 422 风险** |

---

## 二、检查结论（侧侦察，均零写入）

### 2.1 backend（image-workers）：**零改动**

| 项 | 结论 | 证据 |
|---|---|---|
| 3 个 flash handler | 现役、已注册、已同步 KV、未弃用 | `src/models/<tool>-seedream-5-0-flash/handler.ts`；`_registry.ts:311/1385/1925/325/1939` |
| 参数兼容（切默认不 422） | t2i/chibi 键集逐字一致；circuit 集合一致（仅顺序不同）；4-rp 用过的 aspect_ratio 值全部在 flash 17 值内 | handler `accepted_params` + KV 实读 |
| 后端「每工具默认档」 | **不存在**：`defaultTier/default_tier/defaultModel/isDefault` grep 0 命中；`ModelCatalogEntry` 无默认档字段；`POST /generate` 只认 `body.model` | 契约 `vendor/catalog-contracts/schema.ts`；`src/index.ts:168-182` |
| 是否需要 deploy / sync / deprecate | **都不需要**（3 档已在线上，4-rp 保留不弃用） | — |
| 已知风险（非 422） | ① `resolution:"4K"` 不在 flash 枚举，flash `transformInput` 会**静默回退 1K**（t2i `:163-169`、chibi `:179-185`、circuit `:202-208`）；② flash 的 `resolution.required=true`，但 worker 不做 required 校验（`openrouter-image-handler.ts:100-108`） | 执行时前端必须把默认分辨率重置为 1K/2K，并确认请求带 resolution |

### 2.2 frontend（arui）：**3 行值 + 注释**

**必须改（3 行）**

| # | 文件:行 | 现值 → 目标值 |
|---|---|---|
| 1 | `app/config/canvas-tools.ts:380` | `arui-ai-text-to-image-seedream-4-rp` → `arui-ai-text-to-image-seedream-5-0-flash` |
| 2 | `canvas-tools.ts:943` | `arui-ai-chibi-avatar-maker-seedream-4-rp` → `arui-ai-chibi-avatar-maker-seedream-5-0-flash` |
| 3 | `canvas-tools.ts:1112` | `arui-ai-circuit-diagram-generator-seedream-4-rp` → `arui-ai-circuit-diagram-generator-seedream-5-0-flash` |

**同 commit 必须同步的注释（语义防漂移）**

| # | 位置 | 处理 |
|---|---|---|
| 4 | `canvas-tools.ts:372-377`（t2i 历史块） | 追加 2026-11-25 回切一行（11-20 切 flash → 11-23 切 4-rp → 11-25 回切 flash） |
| 5 | `canvas-tools.ts:226-233`（11-23 默认档总注） | 追加「2026-11-25 用户拍板：t2i / chibi / circuit 三工具默认档回切 flash；首页 hero 随 t2i 自动跟随」 |
| 6 | `canvas-tools.ts:1106-1112`（circuit 块） | 陈旧注释「默认档 = FLUX Schnell（2026-11-11）」改写为现行口径 |
| 7 | `canvas-tools.ts:1140-1149`（id-photo 例外块） | 「回迁批单一例外」→「第 1 笔 id-photo；第 2 笔 = 2026-11-25 三工具回切 flash」 |
| 8 | `replicate-tier-tools.ts:508-526`（阶段 2 批注，含「名单推导」段） | 追加例外说明；**名单 `SEEDREAM_4_RP_TOOLS` 本身不要动**（它定义挂载/候选，不是默认档） |
| 9 | `model-id-mapping.ts:251-268` 注释 | 追加 11-25 回切说明（只改注释） |
| 10 | `unified-prompt-bar.tsx:676-680` 陈旧注释 | 「2026-11-20 起 95 个图片工具默认切 flash」→「默认档以 canvas-tools.ts `defaultModelId` 为准」 |

**已具备、零改动（逐项实测在位）**：映射（t2i 显式 `model-id-mapping.ts:187`；chibi/circuit 池派生 `:1455` + `replicate-tier-tools.ts:742-750`）、池白名单（`NEW_OR_TAILS:113` → OR_12）、i18n 32 语、branding（`model-branding.ts:493-499` + 扇出 `:879-892`）、异步 11min（`generation-queue.server.ts:178` + `isReplicateTierModelId`）、premium 门禁（arui 无此机制）。

### 2.3 契约（catalog-contracts）：**零变更**

- `schema.ts` 无需改字段（fixed 计价 / enum / sRI / maxReferenceImages / maxDimension 全现成）；**不新增 modelId、不删档、不改 handler、不改 KV** → 不涉及旧 id 烧毁 / in-flight 排空 / §8.4 时序。
- `CURRENT_SCHEMA_VERSION` 不动。

---

## 三、连带影响（自动跟随 / 半动态 / 不变）

| 展示点 | 行为 | 证据 |
|---|---|---|
| 3 工具页首屏积分预估 | 9→6（动态） | t2i 路由 `:250-252`、chibi `:222-224`、circuit `:220-222` |
| hero 成本胶囊（首页 + 3 个聚合/画布页） | 9→6（动态） | `hero-prompt-section.tsx:64-71` |
| PromptBar 预选档 & 下拉展示名 | Seedream 4.0 → Seedream 5.0 Flash（动态） | `unified-prompt-bar.tsx:674 / 683-692 / 3276-3278` |
| 工具页 JSON-LD `featureList` | 仅「{{model}} is selected by default」一条变（其余条不变：26/13/14 档、from 1/3/3、output 7284px、refs 14） | `model-facts.ts:60-66`；线上实拉 3 页均为 `Seedream 4.0 is selected by default` |
| 「Model Tiers」宣传对比表 | default 锚点动态（`model-selection.ts:568-578`），但候选档来自**构建期快照**；CI 先 `pnpm snapshot:models` 刷新，正常构建会把 flash 纳入 | `deploy.yml:62-97` |
| `/models` 模型库 hub | 不涉及（无 per-tool 默认档） | — |
| 定价页 / sitemap / 结构化数据其它字段 / locales | 不变 | 实拉 + `audit-stale-copy --check` 高/中置信 0 |
| 默认价并存 | 其余 82 个 `-seedream-4-rp` 默认工具不动 → 站内默认价 **6 / 9 并存**（有意） | — |

---

## 四、风险与踩坑对照（执行时逐条勾）

| # | 风险 | 处置 |
|---|---|---|
| R1 | **4K 静默降级**：UI 若把 `resolution:"4K"` 带到 flash，worker 静默出 1K 仍收 6 积分 | 切默认后确认初始分辨率 = flash 默认 1K；验证请求体/resolution 参数只有 1K/2K |
| R2 | **circuit 双上传入口**：flash 把 `image_urls` 列进 catalog.params，页面已有 tier 级上传槽（`isCircuitDiagramTool && currentTier.supportsReferenceImage`） | 部署后首查上传槽数量与提示语；若出现两个上传控件，另立小 fix（本轮清单不含） |
| R3 | **circuit「必须上传」语义**：两档 sRI 均 true → 前端 `needsImage` 硬拦仍在；但 flash 上游本不要求参考图 | 本批**保持行为不变**（见 D-3）；若要恢复纯文本可提交需另批改 prompt-bar / route 兜底 |
| R4 | 踩坑 #46：默认档与映射不同步会 fallback 到字典序首档 | flash 映射已存在，3 行值 + 注释同 commit；跑 `verify:model-selection` |
| R5 | 本机旧快照（`app/data/model-snapshot.json` generatedAt=2026-11-11）导致 `verify:model-selection` 本机 crash（`model-selection.ts:651`，97 工具快照可见档 0） | 既有基线滞后、与本次无关；本地先 `pnpm snapshot:models`（需 4 worker env）或直接依赖 CI（CI 先刷新） |
| R6 | 注释里的批次数（84 / 85 / 87）已互相漂移 | 执行时以实测 `grep -c` 为准（当前 4-rp 默认 **85** → 切后 **82**；flash 默认 1 → **4**），不照抄旧数字 |
| R7 | 32 语 locale 文案改动风险 | 本批不改 locale → 不触发 locales KV 上传 |

---

## 五、决策点（执行前需拍板）

| # | 决策 | 建议 |
|---|---|---|
| **D-1** | **范围**：只这 3 工具 + 首页（自动连带 4 个 hero 页面）；其余 82 个 `-seedream-4-rp` 默认工具不动 | 按用户原话执行（三工具例外，id-photo 同型）；默认价 6/9 并存可接受 |
| **D-2** | **默认价 9→6**（降价）+ 默认分辨率 2K→1K、4K 从默认档消失（4-rp 手选仍有 4K） | 确认这是有意的定位调整；无需改定价页 |
| **D-3** | **circuit 参考图必传**：切 flash 后前端仍强制上传（两档 sRI 均 true），而 flash 上游允许纯文本 | 本批**不做**行为变更（零风险）；如产品要纯文本可提交，另立任务改 prompt-bar `needsImage` + route 兜底 |
| **D-4** | circuit 比例选项 3→17、图表类画幅暴增是否可接受 | 可接受（超集，1:1 默认不变）；上线后抽查画幅面板 |
| **D-5** | 是否顺带加断言「默认档必须可见且非 deprecated」 | 建议另批（现由 `verify:catalog-mapping` HARD FAIL 间接保证） |
| **D-6** | 是否把 3 工具记入「11-23 回迁批默认档策略的工具级例外」 | 建议照 id-photo 先例记录（注释第 7 项） |
| **D-7** | 是否保留 `seedream-4-rp` 手选档（9 积分 / 4K） | **保留**（零删除风险最低，用户仍可手选） |

---

## 六、执行步骤与任务分配（本轮不执行；放行后按此派发）

| 任务 | 负责 | 内容 | 依赖 |
|---|---|---|---|
| **T1** | frontend（arui） | §2.2 的 3 行值 + 7~8 处注释；**单 commit**（建议 `feat(models): 三工具+首页 t2i 默认档切回 seedream-5-0-flash`）；本地/CI 门禁全绿；CI 绿后 deploy | D-1/D-2/D-3/D-6 拍板 |
| **T2** | Lead | 放行 + 上线后验证（§八）+ 本文档回填执行终态 | T1 |
| **T3（无）** | backend | **0 改动**：不 deploy、不 sync、不 deprecate、不写 KV | — |

**执行时序**：无 backend 先行依赖（3 个 flash 档早就在线）→ 前端单仓单 commit 直上；回滚 = revert 该 commit 后重新 deploy（无数据/后端回滚）。

---

## 七、门禁与期望数字

**改动基线（本机实测，HEAD=`8dee1a0fc`）**
- `defaultModelId` 行 129（128 工具 + 1 接口声明）；`*-seedream-4-rp` 默认 **85**；`*-seedream-5-0-flash` 默认 **1**（id-photo）→ **切后预期 82 / 4**。
- 映射总数 **1749**；`verify:branding` PASS（工具页 128 / 可见档 1749 / 未配品牌 0 / 混组 0 / 资产 20-20）；`audit-stale-copy --check` 高 0 / 中 0。

**CI（deploy.yml）顺序**：i18n-completeness → typecheck → `verify:branding` → `snapshot:models || true`（4 worker env）→ build → `verify:model-snapshot` → `verify:model-selection` → `audit:stale-copy --check` → `verify:catalog-mapping` →（locales 变更时）KV 上传 → deploy。

**期望**：`verify:model-snapshot` mapping=1749、覆盖 1749/1749、孤儿 0；`verify:model-selection`「全部工具 defaultModelId 在映射表内」PASS；`verify:catalog-mapping` 1749、hard fail 0；typecheck / i18n / stale-copy 全绿。
⚠️ 本地无 fresh snapshot 时 `verify:model-selection` 会 crash（既有基线滞后，切前切后一致），不要误判为本批引入。

---

## 八、上线后验收口径

1. **3 个工具页 JSON-LD**（curl 实拉）：`"Seedream 5.0 Flash is selected by default"`；其余 facts 不变（26/13/14 档、from、output 7284px、refs 14）。
2. **3 个工具页 + 4 个 hero 页面**：成本胶囊/首屏价 **6 积分**（hero：`/`、`/canvas-home`、`/ai-image-generator`、`/ai-picture-generator`）。
3. **模型选择器**：默认选中「Seedream 5.0 Flash」；「Seedream 4.0」仍在列表可手选（9 积分 / 4K）。
4. **参数面板**：默认分辨率 = 1K；4K 不在默认档选项内；circuit 画幅 17 值；chibi/t2i 17 值。
5. **circuit 上传槽**：数量与提示语无异常（R2 重点检查项）。
6. 冒烟一单（各页 1 次）：实付 6 积分、出图正常、D1 `model_id` 命中对应 `-seedream-5-0-flash`。

---

## 九、本轮声明

- 未修改 image-workers / arui 任何文件；未 deploy、未 sync catalog、未写 KV/D1；未新增/删除任何模型档位。
- 侦察证据：共享任务板 `task-3`（backend）/ `task-4`（frontend）报告；线上实拉（`arui.ai/api/catalog/*`、3 页 HTML JSON-LD）；catalog KV 逐 key 实读（ns `d0f937ec33d247c9a93ad8ab7cc2bc18`，key `model:image:<modelId>`）。
- 待拍板：§五 D-1 ~ D-7；放行后按 §六 派发 T1，本轮**不执行**。

---

## 十、执行终态（2026-11-25 15:36 放行 → 15:56 上线）

### 10.1 拍板记录

| 决策 | 用户口径 |
|---|---|
| D-1 范围 | **确认**：只 t2i / chibi / circuit 三工具 + 首页（其余 82 个 `-seedream-4-rp` 默认工具不动，默认价 6/9 并存） |
| D-2 默认价 9→6 | **确认** |
| D-3 circuit 参考图必传 | **按建议**：本批不放开，行为保持不变（仅默认档换 flash） |
| D-4 circuit 17 比例 | **接受** |
| D-5 新增门禁断言 | **否**（不加） |
| D-6 记录为回迁批例外第 2 笔 | **按建议** |
| D-7 保留 seedream-4-rp 手选档 | **按建议**（保留 9 积分 / 1K-4K） |

### 10.2 执行与部署（frontend / arui）

- commit：**`82518c43f`** `feat(models): 三工具+首页 t2i 默认档切回 seedream-5-0-flash(11-23 回迁批例外第 2 笔)`
- 改动：4 files changed，+37 / −13 —— `canvas-tools.ts`（3 行默认值 + 注释）、`replicate-tier-tools.ts`（注释）、`model-id-mapping.ts`（注释）、`unified-prompt-bar.tsx`（注释）；**mapping 条目 / 池表 `SEEDREAM_4_RP_TOOLS` / i18n / branding / 队列 / 快照基线均未动**。
- 提交纪律：仅 `git add` 上述 4 文件，未提交既有无关改动（`footer.tsx` / `progress.txt` / 未跟踪预览 html·png）。
- push：`8dee1a0fc..82518c43f main -> main`
- CI：run **`45571069592`**（deploy.yml）**success**，deploy job 7m46s，完成 **2026-11-25T07:56:39Z = 北京 15:56:39**；Deploy Version ID `325bd108-081a-4bb1-9be8-fb5b4294d815`（Uploaded 10428 files）；「Upload translations to KV」按预期 skipped（无 locales 改动）。
- 本地门禁（commit 前）：`pnpm typecheck` ✅；`verify:branding` ✅（128 / 1749 / 0 / 0 / 20-20）；`audit:stale-copy:check` ✅（高 0 / 中 0）；`grep` 默认档计数 **82 / 4** ✅；临时 refresh snapshot 后 `verify:model-snapshot` ✅（1749/1749、孤儿 0）、`verify:model-selection` ✅（t2i 默认锚点 = seedream-5-0-flash(6)），**快照已还原、未进 commit**。
- CI 门禁：typecheck / verify:branding / snapshot refresh(1749/1749) / build / verify:model-snapshot / verify:model-selection / audit:stale-copy / **verify:catalog-mapping（1749、hard fails 0）** / Deploy 全绿。

### 10.3 线上验收（Lead 独立实拉 + 无头浏览器实测）

1. **3 个工具页 JSON-LD**：`Seedream 5.0 Flash is selected by default`（旧文案 0 命中）；其余 facts 不变 —— t2i「26 档 / from 1 / output 7284px / refs 16」、chibi「13 档 / from 3 / 7284px / refs 14」、circuit「14 档 / from 3 / 7284px / refs 14」。
2. **7 个页面 PromptBar 实测**（4 hero：`/`、`/canvas-home`、`/ai-image-generator`、`/ai-picture-generator`；3 工具页）全部显示：`Text to Image | Seedream 5.0 Flash | 1:1 | 1K | Generate` + `Reference up to 14`，PromptBar 内无 `Seedream 4.0`（0 失败）。
3. **4-rp 手选档实测**：t2i 模型选择器仍含 `Seedream 4.0`；点选后 PromptBar = `Reference up to 10 | Seedream 4.0 | 1:1 | 2K` → 手选路径正常（4K 能力保留在 4-rp 档）。
4. **价格**：工具页 tier 文案由 `9 credits` → **`6 credits`**；`/api/catalog/*` 三页 flash 档 active、credit 6，4-rp 档 active、credit 9；档数 26/13/14 不变。
5. **circuit 上传控件 = 1**（R2「双上传入口」未发生）；chibi = 1。
6. hero 成本胶囊：未登录态不渲染积分数字（按钮为 `Sign in to generate`），以 catalog credit 6 + 工具页 `6 credits` 佐证；如需登录态逐位截图可另行补验。
7. D-3 行为不变：circuit 页面 gate 代码未动，`needsImage` 仍由 `tier.supportsReferenceImage=true` 触发（两档均 true），无图提交拦截保持原样。

### 10.4 两仓终态与回滚

- arui：HEAD=`82518c43f`；工作树仅存量无关改动（`footer.tsx`、`progress.txt`、未跟踪预览 html/png），与本批无关。
- image-workers：**零改动、未部署、未 sync、未写 KV**（默认档纯前端决定）。
- 回滚：`git revert 82518c43f` → push main（CI 自动重部署恢复 Seedream 4.0 默认档），无数据/后端回滚。
- 遗留（既有、与本批无关）：提交的 `app/data/model-snapshot.json` 基线仍为 2026-11-11，CI 每次构建前 `snapshot:models` 刷新；本地跑 `verify:model-selection` 前需先刷新快照，否则会因旧基线 crash（`model-selection.ts:651`）。
