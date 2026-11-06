# ai-character-voice 换型 v2 —— 移除 token 计费 5 档 + Replicate 按字符计费模型池

> 2026-11-06（第二次调整）。**当前只做只读检查，未执行任何改动**。
> 口径（用户 2026-11-06）：**Replicate 平台模型统一积分 = 成本 × 300**；只上 **billing metric = `character_input_count`（按输入字符计费）** 的模型；
> token 计费（`token_input_count` / `token_input_count + token_output_count`）的模型一律不上/移除。
> 关联：`docs/踩坑集锦.md` #4/#5、`docs/character-voice.md`、`docs/ai-character-voice-代办清单.md`（v1，本批完成后作废）。

---

## 0. 用户口径（本轮边界）

1. **移除 5 档**：`minimax-speech-2-8-turbo` / `-2-8-hd` / `-2-6-turbo` / `-2-6-hd`（Replicate billing = `token_input_count`）、`gemini-3-8-flash-tts`（`token_input_count + token_output_count`）。
2. **只保留/新增按字符计费模型**：billing metric 必须是 `character_input_count`，成本随输入字符线性、可被 charLimit 套餐锁定。
3. **积分统一 ×300**：`credits = ceil(上游 USD × 300)`（本批所有档位重算；含保留的 elevenlabs-v3 / inworld-2）。
4. 一模型一档，用户自选；不符合的不上；模型选择面板需有**供应商图标**（当前缺失，见 §5）。
5. 先检查、不执行；批准后执行 → 提交 + 推送 → deploy/sync 对账 → 更新 `docs/character-voice.md` 与 arui 模型文档。
6. **2026-11-06 12:13 用户批准**：执行范围 = 本清单（默认档 = `elevenlabs-turbo-v2.5`）；**图标本轮不补**（「先不补图标」，§5 结论保留为后续批次）。

---

## 1. 结论摘要

1. 当前线上 7 档 → **移除 5、保留 2、新增 6 = 最终 8 档**。
2. 新增（全部 `character_input_count`）：`elevenlabs/turbo-v2.5`、`elevenlabs/v2-multilingual`、`elevenlabs/flash-v2.5`、`inworld/realtime-tts-1.5-max`、`inworld/realtime-tts-1.5-mini`、`qwen/qwen3-tts`。
3. 排除 2 个字符计费候选：`resemble-ai/chatterbox-turbo`（text 上限 **500 字符**，低于工具最低 1000 字套餐）、`resemble-ai/chatterbox`（**无预设音色可选**，仅单一默认声 + 可选参考音频克隆，不符合「选角色」心智）。
4. 积分表全部重算为 ×300（见 §4.3）；其中 elevenlabs-v3 `50→30`、inworld-2 `13/26→8/15`，其余新档按页面单价直接换算。
5. **图标缺失根因已定位（比"缺图标"更根本）**：`model-branding.ts` **audio 条目 = 0**（42 条全是图片族），而模型下拉有门控 —— `tiers.some(t => getModelBranding(t.modelId))` 为 false 时**整个工具退化为朴素 `CanvasDropdown`**（无图标、无供应商分组、无积分徽标），所以 ai-character-voice 7 档全程无图标。补齐 branding 后会整体切到富面板 `ModelPickerPanel`。方案见 §5。
6. 契约仓 schema 零改动（creditCost 仍 perUnit/charLimit；audio 子模块 v1.2.0 不变）。

---

## 2. 候选可行性矩阵（Replicate 页面 billing metric 为准，2026-11-06 抓取）

| # | Replicate slug | billing metric | 单价 | 语言 | 音色 | 字符上限 | 结论 |
|---|---|---|---|---|---|---|---|
| 1 | `elevenlabs/v3` | `character_input_count` | $0.10/1K | 70+ | 26 | 5000+ | ✅ **保留**（已在线上，积分 50→30） |
| 2 | `elevenlabs/turbo-v2.5` | `character_input_count` | $0.05/1K | 32 | 26 | 40,000 | ✅ 新增 |
| 3 | `elevenlabs/v2-multilingual` | `character_input_count` | $0.10/1K | 29 | 26 | ~10 min 音频 | ✅ 新增 |
| 4 | `elevenlabs/flash-v2.5` | `character_input_count` | $0.05/1K | 32 | 26 | 40,000 | ✅ 新增 |
| 5 | `inworld/realtime-tts-2` | `character_input_count` | $0.025/1K | 16+90 | 4 | 2,000 | ✅ **保留**（积分 13/26→8/15） |
| 6 | `inworld/realtime-tts-1.5-max` | `character_input_count` | $0.035/1K | 15 | 4 | 2,000 | ✅ 新增 |
| 7 | `inworld/realtime-tts-1.5-mini` | `character_input_count` | $0.015/1K | 15 | 4 | 2,000 | ✅ 新增 |
| 8 | `qwen/qwen3-tts` | `character_input_count` | $0.02/1K | 10 | 9 | 未标注 | ✅ 新增（custom_voice 模式） |
| 9 | `resemble-ai/chatterbox-turbo` | `character_input_count` | $0.025/1K | 英语 | 20 | **500** | ❌ 不上（500 字上限 < 最低 1000 字套餐） |
| 10 | `resemble-ai/chatterbox` | `character_input_count` | $0.025/1K | 英语 | **无预设音色**（仅默认声 + 参考音频克隆） | 未标注 | ❌ 不上（角色无可选音色） |
| — | `minimax/speech-2.8-hd/-turbo`、`2.6-hd/-turbo` | `token_input_count` | $0.10 / $0.06 /1K | — | — | 10,000 | ❌ **移除**（token 计费，非字符） |
| — | `google/gemini-3.8-flash-tts` | `token_input_count + token_output_count` | $0.5/M 入 + $9/M 出 | — | — | — | ❌ **移除**（输入+输出双计费，成本随音频时长波动） |

> 判定规则：字符计费 = 成本随输入字符线性，charLimit 套餐可锁毛利；token 计费（尤其含输出 token）成本与音频时长挂钩，无法用字符套餐锁定 → 不上。

---

## 3. 移除清单（5 档，走 §8.4 弃用，不物理删）

| catalog modelId | 弃用原因 | `deprecated_alternatives`（须为真实新档） | 前端旧 client id remap |
|---|---|---|---|
| `gemini-3-8-flash-tts` | 输入+输出 token 双计费 | `ai-character-voice-elevenlabs-v3` | `arui-character-voice-gemini-3-8-flash-tts` → `arui-character-voice-elevenlabs-v3` |
| `minimax-speech-2-8-turbo` | token 计费 | `ai-character-voice-elevenlabs-turbo-v2-5` | `...-minimax-speech-2-8-turbo` → `...-elevenlabs-turbo-v2-5` |
| `minimax-speech-2-8-hd` | token 计费 | `ai-character-voice-elevenlabs-v2-multilingual` | `...-minimax-speech-2-8-hd` → `...-elevenlabs-v2-multilingual` |
| `minimax-speech-2-6-turbo` | token 计费 | `ai-character-voice-elevenlabs-flash-v2-5` | `...-minimax-speech-2-6-turbo` → `...-elevenlabs-flash-v2-5` |
| `minimax-speech-2-6-hd` | token 计费 | `ai-character-voice-elevenlabs-v2-multilingual` | `...-minimax-speech-2-6-hd` → `...-elevenlabs-v2-multilingual` |

- 旧 fal 三档（kokoro / elevenlabs-turbo / minimax-speech-02-hd）**上一批已 deprecated**，但其 `deprecated_alternatives` 现指向本轮要移除的档（kokoro→gemini、minimax-02-hd→minimax-2.8-hd），**必须同步改指幸存档**：kokoro→`ai-character-voice-elevenlabs-v3`、elevenlabs-turbo→`ai-character-voice-elevenlabs-turbo-v2-5`、minimax-speech-02-hd→`ai-character-voice-elevenlabs-v2-multilingual`。
- 本轮弃用后 registry = 原 19 + 新增 6 = **25 entries**（active 17 / deprecated 8）；sync 后 verify 期望 `25 entries, 8 deprecated skipped`。
- 5 个 deprecated handler 文件保留（`/status` 仍服务在途），后续清理批次再物理删。

---

## 4. 最终 8 档设计

### 4.1 命名契约

- catalog `modelId` = `ai-character-voice-<尾段>`；`tierId` = `<尾段>`；client = `arui-character-voice-<尾段>`。

| 尾段 | upstream | 定位 | params | 音色 |
|---|---|---|---|---|
| `elevenlabs-v3`（保留） | `elevenlabs/v3` | 表达力最强（alpha，70+ 语种） | prompt, voice, speed(0.7–1.2), charLimit | 26 |
| `elevenlabs-turbo-v2.5` | `elevenlabs/turbo-v2.5` | 低延迟主力（32 语种） | 同上 | 26 |
| `elevenlabs-v2-multilingual` | `elevenlabs/v2-multilingual` | 长文/高保真（29 语种） | 同上 | 26 |
| `elevenlabs-flash-v2.5` | `elevenlabs/flash-v2.5` | 极低延迟/低价（32 语种） | 同上 | 26 |
| `inworld-realtime-tts-2`（保留） | `inworld/realtime-tts-2` | 高表达（16+90 语种） | prompt, voice, charLimit(1000/2000) | 4 |
| `inworld-realtime-tts-1.5-max` | `inworld/realtime-tts-1.5-max` | 1.5 旗舰 | 同上 | 4 |
| `inworld-realtime-tts-1.5-mini` | `inworld/realtime-tts-1.5-mini` | 最快/最便宜 | 同上 | 4 |
| `qwen3-tts` | `qwen/qwen3-tts` | 中文/多语种 + 9 预置音色 | prompt, voice, charLimit | 9 |

### 4.2 参数暴露（统一形态）

- `prompt`（text，必填）、`voice`（enum）、`charLimit`（enum）；`speed` 仅 elevenlabs 4 档暴露（0.7–1.2）。
- 隐藏 defaults：
  - elevenlabs ×4：`stability=0.5`、`similarity_boost=0.75`、`style=0`、`language_code`（handler 按字符集自动探测，不暴露）
  - inworld ×3：`language=auto`、`temperature=0`、`audio_format=mp3`、`sample_rate=48000`、`text_normalization=auto`、`speaking_rate=0`
  - qwen3：`mode=custom_voice`（不暴露克隆/设计模式）、`language=auto`、`style_instruction=''`、`reference_audio` 不接
- `accepted_params` 与 `catalog.params` 严格对齐；`charLimit` 永不转发上游。
- 所有档 `cancelAfter="4m"`（< BFF TTS 僵尸阈值 5min，踩坑 #5）。

### 4.3 积分表（统一 ×300，单位 credits / charLimit 套餐）

| 档 | 上游价 | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|---|
| elevenlabs-v3 | $0.10/1K | 30 | 60 | 90 | 120 | 150 |
| elevenlabs-v2-multilingual | $0.10/1K | 30 | 60 | 90 | 120 | 150 |
| elevenlabs-turbo-v2.5 | $0.05/1K | 15 | 30 | 45 | 60 | 75 |
| elevenlabs-flash-v2.5 | $0.05/1K | 15 | 30 | 45 | 60 | 75 |
| qwen3-tts | $0.02/1K | 6 | 12 | 18 | 24 | 30 |
| inworld-realtime-tts-2 | $0.025/1K | 8 | 15 | — | — | — |
| inworld-realtime-tts-1.5-max | $0.035/1K | 11 | 21 | — | — | — |
| inworld-realtime-tts-1.5-mini | $0.015/1K | 5 | 9 | — | — | — |

- 取整：`ceil(USD × 300)`（inworld 三档按 1000/2000 两档计算，如 7.5→8、10.5→11、4.5→5）。
- 保留档同步修正：elevenlabs-v3 `50…→30…`；inworld-2 `13/26→8/15`（`handlerVersion v1→v2`）。

---

## 5. 模型图标检查（用户反馈「模型图标没有」）

### 5.1 根因（前端只读核实）

| 事实 | 证据 |
|---|---|
| 模型下拉有**富面板门控**：工具内**至少一个档命中** `model-branding.ts` 才渲染 `ModelPickerPanel`（带图标/供应商分组/积分徽标），否则整体退化 `CanvasDropdown`（纯文字） | `unified-prompt-bar.tsx:2948` |
| `model-branding.ts` **audio/voice 条目 = 0**（42 条全部是图片族；video 也是 0） | 全文 grep `character-voice\|elevenlabs\|inworld\|minimax\|gemini\|qwen\|chatterbox` 无命中 |
| 未命中 branding 时：vendor 归兜底组 `"Arui"`、图标回退 `Sparkle` 占位 | `model-picker-panel.tsx:90 / 133-139 / 328-337 / 371-380` |
| `public/brand/` 仅 5 个 SVG：`flux / google / openai / seedream / xai`；**ElevenLabs / Inworld / Qwen / Resemble / MiniMax 全缺** | `ls public/brand/` |
| 图标非 schema 硬需求（`icon?` 可省），但**同一工具内若有档命中、有档未命中 → 未命中的落 "Arui" 混组**，故 8 档必须全配 `vendor` | `model-branding.ts:24-45`、`model-picker-panel.tsx:153-164` |
| 图标渲染：`<img src>`，选中态 h-4 / 组头 h-3.5 / 行内 h-5；资产规格 48×48 viewBox、单色 `#9CA3AF` 或品牌色、小写 `<vendor>.svg` | `model-picker-panel.tsx:301/330/372`、`public/brand/google.svg` |

→ 结论：**不是某张图标丢失，而是 audio 档位从未配 branding**；补 branding 后该工具会**从朴素下拉整体切到富面板**（新增积分徽标/供应商分组/搜索/eta，移动端同样生效）——需回归移动端与键盘导航。

### 5.2 方案（最小改动）

1. 新增 3 个供应商 SVG（已确认可获得，执行时下载/规整）：
   - `public/brand/elevenlabs.svg`：simple-icons 官方图形（取 `#9CA3AF` 单色版，与 flux/openai/xai 一致，深色可见）
   - `public/brand/inworld.svg`：inworld.ai 官网内嵌官方图形（白色/单色，去掉 `width/height=1em` 保留 viewBox `0 0 14 18`）
   - `public/brand/qwen.svg`：simple-icons 官方图形（品牌色 `#6950EF`）
2. `model-branding.ts` 新增 **8 条**（key = client modelId，**每个展示档都要有**）：`{ icon, vendor, eta }`
   - ElevenLabs ×4（`vendor:"ElevenLabs"`，eta 如 `"3-15s"`）、Inworld ×3（`"Inworld"`，`"2-10s"`）、Qwen ×1（`"Qwen"`，`"2-10s"`）
   - **本轮只写 icon+vendor+eta（eta 是静态字符串），不写 `vendorSubtitleKey/descriptionKey` → 32 locale 零 i18n 新增**
3. 不配图标的档：**不允许**（会落 "Arui" 混组 + Sparkle）；已弃用的 5 档不在面板，无需图标。
4. 回归点：富面板启用后的移动端/键盘导航/积分徽标展示（perUnit 无上下文时展示 `table` 最小值 = 起步价，符合预期）。

> **本轮决定（用户 2026-11-06 12:13）：先不补图标** —— 不新增 SVG / 不加 branding 条目，工具继续走朴素 `CanvasDropdown`；图标作为独立后续批次（本 §5 根因与方案保留，届时直接按 §5.2 执行）。

## 6. 改动清单（待执行）

### A. 后端 audio-workers（先做）

- [ ] **BT-A1 移除 5 档**：5 个 handler 加 `deprecated:true` + `deprecated_alternatives`（§3 表，必须指向真实幸存档）；`describe()` 透传。
- [ ] **BT-A2 修旧三档 alternatives**：kokoro→`ai-character-voice-elevenlabs-v3`、elevenlabs-turbo→`ai-character-voice-elevenlabs-turbo-v2-5`、minimax-speech-02-hd→`ai-character-voice-elevenlabs-v2-multilingual`（否则 410 候选指向已弃用档）。
- [ ] **BT-A3 新增 6 档 handler**（复用 `createReplicateAudioHandler`）：
  - elevenlabs 3 档（turbo-v2.5 / v2-multilingual / flash-v2.5）：同 v3 结构，26 音色、speed 0.7–1.2、语言自动探测；
  - inworld 2 档（1.5-max / 1.5-mini）：4 音色、charLimit 仅 1000/2000、**无 `language` 入参**（1.5 schema 无该字段），defaults 省 language；
  - qwen3-tts：`prompt→text`、`voice→speaker`，defaults `mode:"custom_voice"`、`language:"auto"`、`style_instruction:""`，不接 reference_audio/voice_description，charLimit 1000–5000。
- [ ] **BT-A4 保留 2 档改积分 + bump handlerVersion v1→v2**：elevenlabs-v3 `30/60/90/120/150`、inworld-2 `8/15`。
- [ ] **BT-A5 门禁 + push**：`generate-registry` → typecheck → prebuild → test；commit 明确路径 → push main → deploy → sync（期望 **25 entries**）→ verify（**25 entries / 8 deprecated skipped**）；回报 run URL + sync 日志。
- [ ] **BT-A6 产出 8 档 `describe()` JSON** 存档 `/tmp/character-voice-describe-v2.json` 给 Lead 写文档。

### B. 前端 arui（依赖 BT-A5 sync 成功）

- [ ] **FT-B1 映射**：`model-id-mapping.ts` 删 5 条旧映射、加 6 条新映射（`arui-character-voice-<尾段>` ↔ `ai-character-voice-<尾段>`）。
- [ ] **FT-B2 默认档**：`canvas-tools.ts:212` `defaultModelId` → `arui-character-voice-elevenlabs-turbo-v2-5`（推荐，待用户确认；不能留指向被删档）。
- [ ] **FT-B3 legacy remap**：`replicate-tier-tools.ts` 的 `LEGACY_AUDIO_CLIENT_REMAP` 更新：
  - 已移除 5 档 client + catalog id → §3 目标新档；
  - 旧三档 remap target 改幸存档：standard→elevenlabs-turbo-v2-5、pro→elevenlabs-v3、master→elevenlabs-v2-multilingual（含旧 catalog id 三条）。
- [ ] **FT-B4 i18n（32 locale）**：`models.*` 新增 6 条展示名；删 5 条已移除档 model key（gemini voice 30 条**先确认无其他工具引用**再删，minimax 53 条**保留**）；`toolbar.voice.*` 新增 qwen3 9 条（Aiden/Dylan/Eric/Ono_anna/Ryan/Serena/Sohee/Uncle_fu/Vivian）；elevenlabs 26 / inworld 4 复用已有 key。
- [ ] **FT-B5 图标（本轮不做）**：用户决定先不补图标 → 不新增 SVG/branding；清单见 §5，留作独立后续批次。
- [ ] **FT-B6 文档**：更新 `docs/模型信息/ai-character-voice模型.md`（8 档 / 移除 5 档 / ×300 积分 / 图标与富面板说明；docs 目录 gitignore，本地文档）。
- [ ] **FT-B7 门禁 + push**：typecheck + lint；commit 明确路径 → push → 前端 deploy + `verify:catalog-mapping` PASS（期望 audio-workers 25 entries、hard fails 0）；回报 run URL。

### C. 契约仓 / Lead

- [ ] **CT-C1** 更新 `docs/character-voice.md`：8 档、移除 5 档（含 billing metric 原因）、积分表 ×300、默认档、图标/富面板说明、billing metric 准入规则。
- [ ] **CT-C2** 新增 `docs/踩坑集锦.md` #6：① 成本→积分统一 `ceil(USD×300)`（replicate 新批；旧 ×500 仅存量）；② 选型先看 billing metric：`character_input_count` 可字符定价，`token_input_count(+output)` 不可；③ 保留档同步改表 + handlerVersion bump；④ 图标缺失根因 = audio 无 branding 条目触发富面板门控。
- [ ] **CT-C3** commit（只 add 上述两个文件）+ push；复核两仓 diff 无越界/无敏感信息。

## 7. 部署时序（不可交换）

1. **后端先行**：新增 6 档 + 弃用 5 档 + 保留 2 档改积分 → push → deploy → **sync 落 KV**（25 entries）→ verify 绿。
2. **前端随后**：同一 commit 内删 5 旧映射 + 加 6 新映射 + 改默认档 + remap + i18n + 图标 → push → deploy；此时 mapping ⊆ active（8 档）→ `verify:catalog-mapping` PASS。
   - 窗口期（后端 sync 完成 → 前端部署完成，约 15min）线上面板仅剩 elevenlabs-v3 / inworld-2；无 410（旧档已从 catalog 过滤）。可接受。
3. 生效延迟：catalog KV（BFF 内存 5min + 客户端 5min）≈ 10min。
4. 回滚：任一仓 `git revert <sha>` + push → 自动重部署/重 sync。

**验收**：
- 后端 run：`Sync catalog` 日志 `written: 25 / total: 25`；`Verify`：`25 entries, 8 deprecated skipped`。
- 前端 run：`verify:catalog-mapping` PASS（audio-workers 25 entries / hard fails 0）。
- 只读线上核对：`GET https://arui.ai/api/catalog/ai-character-voice` 返回 **8 档**（无 minimax/gemini），每档 creditCost 与 §4.3 一致。
- 模型面板自检：8 档可见、默认档 = `elevenlabs-turbo-v2.5`（本轮继续朴素下拉，图标后续批次）。
- 410 兜底自检：旧三档 410 alternatives 指向的 modelId 均在本轮 8 档内。

---

## 8. 风险

| # | 风险 | 处理 |
|---|---|---|
| 1 | 后端先弃用 5 档、前端后删映射：窗口期前端运行时仍持旧映射 → 旧档被 catalog 过滤不可见，仅历史任务 replay 410 | 接受；remap 在下一前端 commit 补齐 |
| 2 | 前端新映射必须在后端 sync 后才 push | 严格顺序，见 §7 |
| 3 | qwen3 文本上限页面未标注 | 先按 1000–5000 套餐，实测超限由 `UPSTREAM_4XX` 透传 |
| 4 | inworld 上限 2000 字 | charLimit 仅 1000/2000 |
| 5 | chatterbox ×2 排除可能被用户推翻 | 若上，需 500 字套餐（turbo）/ 增加默认声档（原版），另做 |
| 6 | 图标深色可见性 | elevenlabs 用白色填充版、inworld 官方白、qwen 品牌紫；上线前自查 |
| 7 | 8 档含 4 个 ElevenLabs 近重复档 | 用户明确列全，按「符合就上」并列；默认档显式指定，不依赖字典序 |
| 8 | 旧 ×500 积分的存量工具（rapper/tts 等） | 不在本批范围；如需统一 ×300 另开批次 |

---

| 9 | 富面板切换回归：一旦有 branding，工具从 CanvasDropdown 整体切 ModelPickerPanel（移动端/键盘/积分徽标随之变化） | 前端上线前自查 8 档分组/图标/移动端；只加 icon+vendor+eta，不引 i18n 文案 |
| 10 | 旧三档 410 alternatives 现指向待移除档 | 后端同批改指幸存档（§3 注） |
| 11 | 前端 remap target 指向被删档 → 画布 regenerate 400 NOT_IN_CATALOG | FT-B3 同步改指幸存档；上线后抽历史任务验证 |
| 12 | 移除 5 档的 i18n 死 key（gemini 30 音色） | 先确认无其他工具引用；不确认则保留（无用户可见影响） |

## 9. 任务分配

| 任务 | 负责人 | 依赖 |
|---|---|---|
| BT-A1～A5 | backend teammate | 用户批准 |
| FT-B1～B7 | frontend teammate | BT-A4（sync 成功） |
| CT-C1～C3 | Lead | FT-B7 后 |
| 每次 push 前 diff review / 工作区体检 | Lead | 全程 |

**纪律**：任务板 `[ab-team]` 前缀；`git add` 明确路径、禁 `-A`；里程碑即 commit；push = 立即上线，Lead 确认后推。
