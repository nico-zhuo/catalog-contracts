# 风格「无风格(none)」选项 —— 检查结论与代办清单 v2

> 2026-11-05 修订。**当前只做只读检查，未执行任何改动**。
> v1（全量 1020 档）作废，本版按用户口径收窄：**只做 Replicate 平台（已完成换型的工具页）**；语义照 video-workers 先例；D3 排除项生效；顺手修 3 个透传漏配工具。
> 关联：`docs/踩坑集锦.md` #1 / #4 / #5、image-workers `docs/踩坑集锦.md` #28 / #47。

---

## 0. 用户口径（本轮执行边界）

1. **范围**：只做 **Replicate 平台、已完成换型的工具页**（fal/standard 未换型的工具本轮不动）。
2. **语义**：不纠结 prefix 取舍——**照 video-workers 已上线的先例**：给用户多一个「无风格」选项，想让用户自由发挥时选它。
3. **D3 本轮排除**：`ai-image-to-image-converter` / `ai-blur-background` / `ai-photo-filter` / `ai-photo-color-correction`（none≈不做处理，无意义）。
4. **顺手修**：arui style 透传名单漏掉的 3 个工具（discord-message / spider-chart / text-message）。
5. 先检查、先不执行，等通知再派活。

---

## 1. 结论摘要

1. **范围核实：49 个工具 / 773 档**（全部 active，0 deprecated）= Replicate style 812 − D3 排除 56 + art_style 17。
   - 档位分布：17 档 ×32 工具、14 档 ×15 工具、16 档 ×1（youtube-banner）、3 档 ×1（linkedin-banner）。
   - 全部落在 arui 的 84 个 `REPLICATE_TIER_TOOL_SLUGS` 内 → **"已完成换型的工具页" = 这批，前端已是 `isReplicateTierToolCurrent` 覆盖，主干零改动**。
2. **video-workers 先例已核实**（commit `51cc3cc`）：options 末尾加 `{ value: "none", labelKey: "params.style.none" }` → `if (style !== "none") { 注入 }` → `delete input.style` 保留 → `handlerVersion` bump → 空 prompt 在 handler 层 400 兜底。**本轮照此实现**。
3. **image 与 video 的唯一差异**：image handler 的注入块 = 「工具功能前缀 + 风格 token」两层，而 video 的模板本身就是风格模板。所以 image 的 none 语义定为：**跳过风格 token，保留工具功能前缀和其它用户参数（colorScheme / panels / shot_type 等）**，用户 prompt 原样保留。
4. **不需要额外 400 兜底**：773 档的 `prompt` 全部 `required: true`（已逐个核对），空 prompt 会被 BFF `resolveCatalogParams` 直接 400 `CATALOG_PARAM_MISS`；前端 `unified-prompt-bar.tsx:2229` 的「none + 空文本」守卫继续做体验兜底。
5. **契约仓零改动**：enum 选项值是 entry 数据，`schema.ts` / `schema.zod.ts` / `CURRENT_SCHEMA_VERSION`(1.7.0) / CHANGELOG / arui submodule pin 全部不动。
6. **前端主干零改动**（none 选项由 catalog 驱动自动出现、32/32 locale 文案已在线）；唯一前端改动是「顺手修」3 个 flag。
7. 生效延迟：后端 deploy + sync 后最长约 **10min**（BFF catalog cache 5min + 客户端 5min）。

---

## 2. 范围（Replicate only）

| 类别 | 数量 | 处理 |
|---|---|---|
| Replicate style handler（active） | 812 | 本轮改 |
| Replicate art_style handler（ai-ocs-creator） | 17 | 本轮改（同属"风格"下拉） |
| D3 排除 4 工具 ×14 档 | 56 | **本轮不改**（image-to-image-converter / blur-background / photo-filter / photo-color-correction） |
| **本轮合计** | **773 档 / 49 工具** | |
| fal/standard 未换型 style handler（active） | 51 | 不改（不在 Replicate 平台） |
| deprecated style handler（fal 旧三档等） | 157 | 不改（`/generate` 返 410、UI 不可见） |
| deprecated art_style | 3 | 不改 |
| 3 个透传漏配工具（discord-message / spider-chart / text-message） | 9 档，均为 fal/standard | 不加 none；只修 arui 透传 flag |

---

## 3. 语义定案（按 video 先例，写死供实现）

| 项 | 定案 |
|---|---|
| none 时 | 不注入**风格预设 token**；用户 prompt 原样；工具功能前缀**保留**；其它参数（colorScheme / panels / shot_type 等）继续生效 |
| options | 追加**末位**：`{ value: "none", labelKey: "params.style.none" }`（art_style 同用 `params.style.none`，32 locale 已有；不要新建 `params.*.style.none`） |
| `delete input.style` | 保留，位于所有分支之外（不加 early-return） |
| defaultValue | **不动**（存量 API 不变；默认 none 会让首屏"点就报错"） |
| handlerVersion | `vN → v(N+1)`（773 档全 bump，验证用） |
| 空 prompt | 不加 handler 层 400（prompt 全 required，BFF 已兜）；依赖前端守卫改善体验 |
| schemaVersion | 不动 |

**特殊族实现口径（后端在 BT0 里出逐形态规则，这里先定方向）**：
- 签名族 62 档（emailsig 17 / outlooksig 17 / gmailsig 14 / profsig 14）：`${p}, ${styleToken} email signature design, ${color} color scheme, ...` → none 时删掉 style 段、保留 color/layout，**避免双逗号**。
- storyboard 14：`${PREFIX} ${styleToken}, ${shotToken}. ${p}` → 保留 shotToken、去掉 style。
- cartoon-strip 17：`Draw ${panelToken} in ${styleToken}.` → 保留 panel 数、改写成 `Draw ${panelToken}.` / `${STRIP_PREFIX} ${p}`。
- product-background 14：`${BG_PREFIX} The new background: ${token}.` 是语法接续 → none 时跳过该句（prompt 原样）或中性兜底，BT0 里定一句。
- youtube-banner 16：prefix + styleToken + channelClause + p → 保留 prefix/channel，去 token。
- vector / logo-maker / text-to-poster：parts / switch / poster 拼接，none 时数组条件展开 / `case "none": break;` / 去掉 `", "` 残段。
- 其余 17/14 档标准族（S1/S2 直拼形态，占 500+ 档）：token 置空 + 模板条件化，normal 分支必须 **byte-identical**。

---

## 4. 待办清单

### A. 后端 image-workers（backend teammate）

- [ ] **BT0 规则集 + 断言**：按 §3 出 38 种注入形态（已聚类）的逐形态 before/after 规则；写本地断言脚本（不提交）；确认 773 个文件清单并冻结。
- [ ] **BT1 Pilot（5 工具 / 85 档，覆盖 5 种形态）**：`ai-anime-art-generator`(17)、`ai-ai-drawing-generator`(17)、`ai-vector-generator`(17)、`ai-logo-maker`(17)、`ai-text-to-poster`(17)。
      → 门禁全绿后**明确路径 commit（不 push）** → 部署 + sync + verify → UI 验收 → **停下等用户确认**。
- [ ] **BT2 签名族（4 工具 / 62 档）**：emailsig / outlooksig / gmailsig / profsig。重点：句中拼接去逗号、colorScheme 保留。
- [ ] **BT3 特殊多参数族（4 工具 / 61 档）**：cartoon-strip 17 + storyboard 14 + product-background 14 + youtube-banner 16。
- [ ] **BT4 art_style（1 工具 / 17 档）**：ai-ocs-creator，`STYLE_PREFIX` 整段前缀 → none = 不注入；labelKey 用 `params.style.none`。
- [ ] **BT5 批量（8 工具 / 136 档）**：anime-character / anime-image / anime-picture / body / caricature / color-palette / coloring-book / doodle。
- [ ] **BT6 批量（8 工具 / 136 档）**：face / icon / manga / monster / pattern / photography / pixel-art / portrait。
- [ ] **BT7 批量（8 工具 / 133 档）**：selfie / sketch / sprite / waifu / wallpaper / art-ai-generator / illustration-generator / avatars-picture。
- [ ] **BT8 批量（11 工具 / 143 档）**：cartoon-yourself / fantasy-avatar-maker / image-colorizer / movie-poster / painting / photo-to-anime / photo-to-cartoon / photo-to-comic / photo-to-sketch / youtube-avatar / linkedin-banner(3)。
- [ ] 每批门禁：① 文件数 = 本批、每文件 ~4-5 行 ② grep 断言（本批 style 文件都有 none / `delete input.style` 未丢 / handlerVersion 已 bump / 无共享文件改动 / 不在本批的 fal 文件零改动）③ `npm run typecheck` + `check:registry` + `check:guard` + `test` ④ 每形态抽 1 档 normal prompt before/after **逐字节一致** ⑤ deploy + sync + `verify-catalog` 绿 + 抽读 KV 确认 `params` 含 none、`handlerVersion` 已 bump。

### B. 前端 arui（frontend teammate）

- [ ] **FT1（顺手修）3 工具 style 透传补丁**：`unified-prompt-bar.tsx` 新增 `isDiscordMessageGeneratorTool` / `isSpiderChartMakerTool` / `isTextMessageGeneratorTool` flag，并加进 `:2454` style 条件；`pnpm typecheck` 绿；需发版。
      副作用：这 3 个工具的既有 style 选项从「静默失效」变为生效（属修复，输出会变化）。
- [ ] **FT2 验收配合**：后端每批 sync 后等过 5min+5min 缓存，抽本批 2 个工具页验：下拉出现「无风格」（zh/en/zh-TW）、提交后 `input_params.style === "none"`、worker prompt 无风格 token、normal 档输出与改前一致。
- [ ] **FT3（不做，仅记录）**：submitDisabled 置灰 / 专属错误文案 / effect prefill 缺口（预存在、非阻塞，用户未要求）。

### C. 契约仓（Lead）

- [ ] **CT1** 复核零契约改动（schema / zod / schemaVersion / CHANGELOG / submodule pin 都不动）。
- [ ] **CT2** 全部落地后补一条 `docs/踩坑集锦.md`（预计 #6）：video→image 的 none 先例复用、labelKey 统一、per-tool 透传名单漏配、双 5min 缓存、回滚窗口期旧代码静默回落。
- [ ] **CT3** 改动范围：**只有 image-workers 773 个 handler + arui 1 个组件文件**；catalog-contracts 本轮不产生代码 diff。

---

## 5. 部署 / 回滚

- **顺序**：pilot 批后端 commit → push（触发 deploy → sync → verify）→ 等 ~10min → UI 验收 → 用户确认 → 后续批。
- **前端**：主干无需发版（catalog 驱动）；FT1 需 arui 单独发版（可先行，惰性无害）。
- **回滚**：`git revert <批次 sha>` + push → 自动重部署 + sync（KV 原子覆盖）→ ≤10min 恢复。窗口期旧代码收到 `style:"none"` 走 `?? 默认 token` 兜底，不会 4xx/5xx，只会静默回落默认风格（可接受）。
- **灰度**：catalog 全量原子 sync，没有 per-model 灰度；靠"分批合并/分批 push"控制暴露面。

---

## 6. 风险

1. **特殊族语法**：签名族去逗号、cartoon-strip/storyboard 保留其它 token、product-background 语法接续——必须手改 + 逐族 review（约 123 档）。
2. **normal 档漂移**：codemod 改变既有拼接（空格/句号/逗号）会导致全部存量用户输出变化 → 每形态 byte-identical 快照。
3. **switch 族强注 default**：logo-maker 必须 `case "none": break;`，否则"无风格"实际=极简。
4. **透传漏配**（顺手修）：不修则 3 个工具 none 静默失效（本轮它们不在 replicate 范围，但修复仍值得）。
5. **缓存窗口**：10min 内验收会看到旧 catalog，别误判。
6. **任务板串台**：任务标题加 `[ab-team]` 前缀，只认领先域内任务。

---

## 7. 任务分配（用户批准后按此派）

| 任务 | 负责人 | 依赖 |
|---|---|---|
| BT0-BT8 | backend teammate | 用户批准；BT1 后暂停等确认 |
| FT1 + FT2 | frontend teammate | FT1 可先行；FT2 依赖后端每批 sync |
| CT1-CT3 | Lead | 执行完成后 |
| 每批授权 / 工作区体检 / 最终 diff review | Lead | 每批结束 |

**派活纪律**（`docs/踩坑集锦.md` #1/#4/#5）：每批先回显任务书（目的/文件范围/验收/是否 commit/push）等用户确认；任务板 `[ab-team]` 前缀；`git add` 只用明确路径、禁 `-A`；里程碑即 commit、不 push（除非用户授权 push → 自动部署）；teammate 停止后 Lead 立即工作区体检。
