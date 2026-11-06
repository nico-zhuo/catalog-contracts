# ai-character-voice 换型（Replicate TTS 模型池）—— 检查结论与代办清单

> 2026-11-06。**当前只做只读检查，未执行任何改动**（两个仓工作区干净/仅他人 progress.txt 脏）。
> 口径：`ai-character-voice` **不再参考**现有 standard / pro / master 三档；以 Replicate 模型页信息为准，
> **符合「文本 → 角色语音」业务的模型全部并列上架**（一模型一档，用户自选），不符合的不上。
> 关联：`docs/踩坑集锦.md` #1/#4/#5、`audio-workers/docs/架构.md` §3.6/§8.4、image-workers 踩坑 #44/#46（显式模型叙事、不设档数配额、默认档显式配置）。

---

## 0. 结论摘要

1. **9 个候选 → 上 7 个，不上 2 个**（矩阵见 §2）。不上：`minimax/voice-cloning`（不是文本→语音，只吃音频、输出 voice_id）、
   `resemble-ai/chatterbox-turbo`（500 字符硬上限 < 工具最低 1000 字套餐；英语单语）。
2. **audio-workers 目前零 Replicate 能力**（12 个 handler 全 fal；无 `replicate.ts`、Env 无 token、wrangler 无 secret）。
   需新增 Replicate 客户端 + 新类型工厂；**路由/鉴权/KV/R2/catalog sync 全部无需改**（声明式，新 handler 自动进 REGISTRY）。
3. **契约仓零改动**：audio 子模块钉在 `07059e0`（catalog-contracts v1.2.0），`creditCost.type="perUnit"` 已够用；
   `schemaVersion` / zod / CHANGELOG / submodule pin 全部不动。
4. **前端改动面比想象小**：prompt bar 的档位列表/参数渲染**已经 catalog 驱动**（`unified-prompt-bar.tsx:601-607 / 2960-2968`），
   新档可见只需三件事：`model-id-mapping.ts` 映射 + `canvas-tools.ts` i18n key + 32 locale 的 `models.*.name`。
   **不需要**改 `tools.ts` 的 models 数组（死字段）；`defaultModelId` + 旧档隐藏需要改。
5. **纯新增参数不必动前端提交白名单**：本轮所有新档只暴露 `prompt / voice / speed / charLimit`（与原三档同形），
   `onSubmit` 具名白名单（`unified-prompt-bar.tsx:2328-2333`）已经覆盖，**无需改提交层**。
6. **部署时序硬约束**（踩坑 #4）：后端 push → deploy → sync-catalog 落 KV 成功 → 前端再加映射 push，反序 verify hard fail。
7. 旧三档本轮**保留 active + 前端 UI 隐藏**（映射保留，历史画布 regenerate 不 410）；标 deprecated 另起批次（§8.4 顺序）。
8. **`REPLICATE_API_TOKEN` 必须人工 `wrangler secret put`**（CI 不配；兄弟仓同为人工）。不影响本轮 deploy/sync（不实测），
   但线上调用前必须配，否则 `/generate` 返回 502 `REPLICATE_AUTH`。

---

## 1. 用户口径（执行边界）

1. **范围**：只做 `ai-character-voice` 一个工具；一模型一档并列，不做「档位配额」。
2. **模型选择依据**：Replicate 模型页的 Input/Output schema + README（2026-11-06 抓取）；业务判据 = 文本进、音频出、
   有可选音色、支持异步 prediction API。**不参考**旧三档的选型。
3. **不实测**：本轮不调真实 prediction；只做 typecheck / guard / registry / sync / verify 门禁 + 部署后 KV 对账。
4. **交付**：
   - `audio-workers`：新增 handler + sync 落 KV，push 触发 Deploy，产出 run URL + sync 日志；
   - `arui`：档位映射 / i18n / 默认档 / 旧档隐藏 / 模型文档更新，typecheck 绿后 push；
   - `catalog-contracts`：`docs/character-voice.md` 写全参数对接信息（本轮唯一新增文件，不碰 schema）。

---

## 2. 候选可行性矩阵（Replicate 页面为准，2026-11-06 抓取）

| # | Replicate slug | 输入 | 输出 | 语言 | 音色 | 上限 | 上游价 | 结论 | 理由 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `minimax/voice-cloning` | `voice_file`（必填，10s–5min 音频） | `{voice_id, preview, model}` | — | — | — | $3/次 | ❌ **不上** | 不是 TTS：没有文本输入，产出的是 voice_id/试听，无法完成「写台词 → 出角色语音」 |
| 2 | `google/gemini-3.8-flash-tts` | `text` | 音频 URL | 130+（自动检测） | 30（+second_voice 双人对话） | 未标 | $0.50/M 输入 token + $9/M 输出 token | ✅ 上 | 业务完全符合；表达力最强一档 |
| 3 | `elevenlabs/v3` | `prompt` | 音频 URL | 70+（`language_code` 默认 en） | 26 | 未标（按 5000 字套餐） | $0.10/1K 字符 | ✅ 上 | 表达力/音频标签最强；语言参数需处理（见 §3 D3） |
| 4 | `minimax/speech-2.8-turbo` | `text` | 音频 URL | 40+（`language_boost` 自动） | 300+（任意系统 voice_id） | 10,000 字 | $0.06/1K token（≈字符） | ✅ 上 | 低延迟主力档 |
| 5 | `minimax/speech-2.8-hd` | `text` | 音频 URL | 32+ | 同上 | 10,000 字 | $0.10/1K token | ✅ 上 | 顶配音质档 |
| 6 | `minimax/speech-2.6-turbo` | `text` | 音频 URL | 40+ | 同上 | 10,000 字 | $0.06/1K token | ✅ 上 | 上一代 turbo（留存对照/价格同档） |
| 7 | `minimax/speech-2.6-hd` | `text` | 音频 URL | 40+ | 同上 | 10,000 字 | $0.10/1K token | ✅ 上 | 上一代 hd |
| 8 | `resemble-ai/chatterbox-turbo` | `text`（**max 500 字符**）+ 可选 `reference_audio` | 音频 URL | 英语（README 未标多语种） | 20 | **500 字符** | $0.025/1K 字符 | ❌ **不上** | 500 字硬上限低于工具最低 1000 字套餐；且与 `ai-text-to-speech` 现有 chatterbox 档重复 |
| 9 | `inworld/realtime-tts-2` | `text`（**max 2,000 字符**） | 音频 URL | 16 生产语种 + 90 实验 | 4（Ashley/Dennis/Alex/Darlene） | **2,000 字符** | $0.025/1K 字符 | ✅ 上 | 异步 prediction 可用；有 1000/2000 两个现有套餐可承接 |

> 排除口径可被用户推翻（尤其 chatterbox）：如要上，需额外新增 500 字计费套餐 + i18n，工作量另计。

---

## 3. 最终档位设计（7 档，一模型一档）

### 3.1 命名契约（沿用 image/video 显式模型叙事）

- catalog `modelId` = `ai-character-voice-<尾段>`
- catalog `tierId` = `<尾段>`
- client `modelId` = `arui-character-voice-<尾段>`（BFF 反向映射只认映射表，`api.catalog.$toolSlug.tsx:108-140`）

| 尾段 | catalog modelId | client modelId | upstream slug | 定位 |
|---|---|---|---|---|
| `gemini-3-8-flash-tts` | `ai-character-voice-gemini-3-8-flash-tts` | `arui-character-voice-gemini-3-8-flash-tts` | `google/gemini-3.8-flash-tts` | 默认档（起步价最低 + 130 语种 + 30 音色） |
| `elevenlabs-v3` | `ai-character-voice-elevenlabs-v3` | `arui-character-voice-elevenlabs-v3` | `elevenlabs/v3` | 表达力 / 音频标签 |
| `minimax-speech-2-8-turbo` | `ai-character-voice-minimax-speech-2-8-turbo` | `arui-character-voice-minimax-speech-2-8-turbo` | `minimax/speech-2.8-turbo` | 低延迟主力 |
| `minimax-speech-2-8-hd` | `ai-character-voice-minimax-speech-2-8-hd` | `arui-character-voice-minimax-speech-2-8-hd` | `minimax/speech-2.8-hd` | 顶配音质 |
| `minimax-speech-2-6-turbo` | `ai-character-voice-minimax-speech-2-6-turbo` | `arui-character-voice-minimax-speech-2-6-turbo` | `minimax/speech-2.6-turbo` | 上一代 turbo |
| `minimax-speech-2-6-hd` | `ai-character-voice-minimax-speech-2-6-hd` | `arui-character-voice-minimax-speech-2-6-hd` | `minimax/speech-2.6-hd` | 上一代 hd |
| `inworld-realtime-tts-2` | `ai-character-voice-inworld-realtime-tts-2` | `arui-character-voice-inworld-realtime-tts-2` | `inworld/realtime-tts-2` | 轻量/低价档 |

> 数字尾段必须进前端 `MODEL_I18N_KEY_MAP` 显式表（camelCase 派生不匹配数字，会显示裸 tierId；先例 `canvas-tools.ts:122-145`）。

### 3.2 参数暴露矩阵（**统一 4 参数形态**，与原三档同形，前端提交层零改动）

| 参数 | gemini | elevenlabs-v3 | minimax ×4 | inworld |
|---|---|---|---|---|
| `prompt` (text) | ✅ | ✅ | ✅ | ✅ |
| `voice` (enum) | 30 | 26 | 复用现有 53 条 MiniMax 系统音色清单 | 4 |
| `speed` (number) | — | 0.7–1.2 | 0.5–2 | — |
| `charLimit` (enum) | 1000–5000 | 1000–5000 | 1000–5000 | **1000 / 2000** |

**不暴露（handler 内部写死，符合 Param Exposure Principle）**：
- minimax：`emotion=auto` / `pitch=0` / `volume=1` / `audio_format=mp3` / `sample_rate=32000` / `channel=mono` / `language_boost=Automatic` / `english_normalization=true` / `subtitle_enable=false`
- gemini：`style=""` / `second_voice=none` / `output_format=mp3`
- elevenlabs：`stability=0.5` / `similarity_boost=0.75` / `style=0`（style exaggeration）
- inworld：`language=auto` / `speaking_rate=0`（=1.0x，不暴露 speed）/ `audio_format=mp3` / `sample_rate=48000` / `text_normalization=auto` / `temperature=0`
- 所有档：不暴露 `seed` / 各类 output_format（技术细节）；不接受克隆 voice_id（仅 enum 白名单，防止跑飞）

**D3 elevenlabs v3 语言处理（决策：handler 自动探测）**：上游 `language_code` 默认 `en`，若原样透传则非英语文本会被当英文读。
本轮在 handler 内按字符集探测主语言（zh/ja/ko/ru/ar/hi/he 等）映射 `language_code`，其余回落 `en`；
**不新增前端参数**。若产品希望用户手选语言，再改为暴露 `language` enum（另做）。

### 3.3 计费（creditCost = perUnit / charLimit；折算口径 1 credit ≈ $0.005，沿用现有 ~2.5x 上游成本）

| 档 | charLimit 套餐 | 积分表 | 折算依据 |
|---|---|---|---|
| gemini-3-8-flash-tts | 1000/2000/3000/4000/5000 | 15 / 30 / 45 / 60 / 75 | 按 token 计价（$0.5/M 入 + $9/M 出）**保守估算**；实测后校准 |
| elevenlabs-v3 | 1000/2000/3000/4000/5000 | 50 / 100 / 150 / 200 / 250 | $0.10/1K 字符 |
| minimax-*-2-8/2-6-turbo | 1000/2000/3000/4000/5000 | 30 / 60 / 90 / 120 / 150 | $0.06/1K token |
| minimax-*-2-8/2-6-hd | 1000/2000/3000/4000/5000 | 50 / 100 / 150 / 200 / 250 | $0.10/1K token |
| inworld-realtime-tts-2 | 1000/2000 | 13 / 26 | $0.025/1K 字符 |

> 旧三档 `deprecated_alternatives`（下一批次标弃用时）指向：standard → gemini 档、pro → elevenlabs-v3、master → minimax-2-8-hd。

### 3.4 异步/超时（踩坑 #5 成对约束）

- 上游 `Cancel-After = 4m`：必须 **< 消费方僵尸阈值 5min**（`arui/app/lib/generation-queue.server.ts:226 TTS_ZOMBIE_MS=5min`），
  保证「上游先失败 → 轮询拿 failed → BFF 立即退款」，杜绝先退款后出音频。
- 前端本轮**不改**僵尸阈值（不需要成对上线，方向安全）。若实测发现长文本 >4min，再走「先抬前端阈值、后抬 Cancel-After」。

---

## 4. 架构方案（最小改动路径）

### 4.1 后端 audio-workers（新增 Replicate 接入）

新增（**均为共享文件/类型工厂，需后端授权** —— 用户批准本清单即视为授权）：

| 文件 | 动作 | 层 |
|---|---|---|
| `src/replicate.ts` | 新增：从 `video-workers/src/replicate.ts` 移植（官方 slug 路由 `POST /v1/models/<owner>/<name>/predictions` + `Cancel-After`），纯 HTTP、无模型字面量 | 第一层 |
| `src/shared/replicate-audio-handler.ts` | 新增类型工厂：submit→KV(`upstream_id`)→status 轮询→output 归一化单 URL→R2→`{audio:{url}}`；4xx→`UPSTREAM_4XX`；终态合并写（勿覆盖 `_input_snapshot`） | 第二层 |
| `src/shared/types.ts` | `Env` 加 `REPLICATE_API_TOKEN?: string` | 第一层 |
| `src/r2.ts` | `uploadFromUrl` 加可选 `contentTypeOverride`（修 octet-stream 落 `.bin` 的踩坑 #20，向后兼容） | 第一层 |
| `scripts/scan-shared.ts` | `SHARED_FILES` 加 `src/replicate.ts` | CI 脚本 |
| `scripts/extract-forbidden-tokens.ts` | 加 replicate slug 正则 + 协议词 `upstream_model` / `upstream_id` | CI 脚本 |
| `wrangler.toml` | secrets 注释补 `REPLICATE_API_TOKEN`（**人工** `wrangler secret put`，CI 不做） | 配置 |

新增模型（模型层，零授权）：7 × `src/models/ai-character-voice-<尾段>/handler.ts`（单文件，工厂配置 inline）。
**不改** `src/index.ts` / `auth.ts` / `fal.ts` / `_registry.ts`（自动生成）/ 现有 12 个 handler / catalog 子模块。

### 4.2 前端 arui

| # | 文件 | 动作 |
|---|---|---|
| FT1 | `app/routes/api.ai.submit.bff/model-id-mapping.ts` | 加 7 条 `arui-character-voice-<尾段>` → `ai-character-voice-<尾段>`；**旧三档 3 条保留**（历史画布 regenerate 不 410） |
| FT2 | `app/config/canvas-tools.ts` | `MODEL_I18N_KEY_MAP` 加 7 条显式 key；`defaultModelId` 改为 `arui-character-voice-gemini-3-8-flash-tts` |
| FT3 | `app/components/prompt-bar/unified-prompt-bar.tsx` | `OFFLINE_MODEL_IDS` 加旧三档 client modelId（UI 隐藏，映射保留）；**不改** speed/charLimit 门控（新档区间都在 0.5–2 / 1000–5000 内） |
| FT4 | `locales/*/ai-canvas.json`（32 个） | 加 7 条 `models.<Key>.name`（品牌名，同值）；加 56 条新音色 `toolbar.voice.<slug>`（gemini 30 / elevenlabs 新增 22 / inworld 4；minimax 复用现有 53 条） —— 脚本生成，en 值作基准 |
| FT5 | `app/config/replicate-tier-tools.ts`（或新增 `audio-tier-tools.ts`） | 旧三档 → 新档 remap 表（standard→gemini / pro→elevenlabs-v3 / master→minimax-2-8-hd），供画布 regenerate / deprecated-alternatives 用 |
| FT6 | `docs/模型信息/ai-character-voice模型.md` | 按同仓已换型范本（`cartoon-video-generator模型.md`）重构为 7 档 replicate 模型池文档 |
| FT7 | 门禁 | `pnpm typecheck` + `pnpm lint`（不实测） |

**不改**：`tools.ts` 的 models 数组（死字段）、BFF 转发/组包逻辑（catalog 驱动已通用）、轮询/播放/画布 hydrate 逻辑。

### 4.3 契约仓 catalog-contracts

- **schema 零改动**（perUnit 已支持；不 bump schemaVersion、不改 CHANGELOG、不动 submodule pin）。
- 新增 `docs/character-voice.md`：7 档完整参数对接信息（modelId / upstream / params / voice 清单 / 计费 / Cancel-After / 错误契约 / KV key）。
- 本清单 `docs/ai-character-voice-代办清单.md`（仅本地文档，是否入库由用户定）。

---

## 5. 待办清单（按执行顺序，**未开始**）

### A. 后端 audio-workers（backend teammate）

- [ ] **BT0 授权确认 + 工作区体检**：确认共享文件授权范围；`git status` 干净；Node 24 / pre-commit hooks 可用。
- [ ] **BT1 Replicate 基础设施**：`src/replicate.ts` + `src/shared/replicate-audio-handler.ts` + `Env` + `r2.ts` contentType override + 两个 guard 脚本 + wrangler 注释；跑 `npm run prebuild` 验证守卫不误伤。
- [ ] **BT2 7 个 handler**：`ai-character-voice-<尾段>/handler.ts` ×7（参数/音色/计费/`Cancel-After=4m`/`describe()` 全按 §3）。
- [ ] **BT3 本地门禁**：`npm run typecheck` + `npm run prebuild`（guard + registry `--check`）+ `npm test`；`node scripts/generate-registry.ts` 后 `git add` 生成文件。
- [ ] **BT4 提交 + 推送**：明确路径 add（禁 `-A`）→ commit → push main → **Deploy run**（deploy → sleep 5 → sync-catalog → verify-catalog）。
- [ ] **BT5 同步对账**：记录 run URL + Sync catalog 日志（期望 `written` 含 19 档）+ verify 绿；`describe()` 输出 JSON 存档给 Lead 写文档。
- [ ] **BT6 回报**：部署结果 / KV 写入数 / 剩余风险 / `REPLICATE_API_TOKEN` 配置提醒。

### B. 前端 arui（frontend teammate，**依赖 BT5 成功**）

- [ ] **FT1–FT5 代码改动**见 §4.2（映射 / i18n / 默认档 / 旧档隐藏 / remap）。
- [ ] **FT6 文档重写**：`docs/模型信息/ai-character-voice模型.md`。
- [ ] **FT7 门禁**：`pnpm typecheck` + `pnpm lint` + `pnpm i18n:verify`（如可用）；**不实测**。
- [ ] **FT8 提交 + 推送**：明确路径 add → commit → push main → 记录前端 Deploy/verify 结果。

### C. Lead（契约仓 + 总控）

- [ ] **CT0** 复核契约零改动（schema / zod / CHANGELOG / submodule pin）。
- [ ] **CT1** 写 `docs/character-voice.md`（以 BT2 实际 `describe()` 为准，逐档参数全表）。
- [ ] **CT2** 工作区体检 + 两仓最终 diff review（确认无越界改动、无敏感信息）。
- [ ] **CT3** 汇报：后端 Deploy run URL + sync 日志 + 前端 deploy 结果 + 剩余决策/风险。
- [ ] **CT4**（可选，用户定）把本清单 + 踩坑沉淀入库。

---

## 6. 部署时序（不可交换）

1. 后端 push main → Deploy（wrangler deploy → sleep 5 → **sync-catalog** 写 `model:audio:*` → verify-catalog 对账）。
2. 确认 sync `written` 含 19 档 + verify 绿（失败则回滚后端 commit）。
3. 前端 push → 前端 Deploy（typecheck/build → **verify:catalog-mapping**（映射 ⊆ KV active）→ 部署）。
4. 生效延迟：catalog KV（BFF 内存 5min + 客户端 5min）≈ 10min。
5. **旧三档弃用**另起批次：前端先删/改映射 → CI 绿 → 后端再标 `deprecated`（踩坑 #4）。

**回滚**：后端 `git revert <sha>` → push → 自动重部署 + sync（KV 原子覆盖）；前端同理。

---

## 7. 风险与决策点

| # | 风险 / 决策 | 处理 |
|---|---|---|
| R1 | **部署时序**：前端先加映射 → verify hard fail（KV 无 entry） | 强制「后端 sync 成功后再推前端」 |
| R2 | **`REPLICATE_API_TOKEN` 未配** → 线上 502 `REPLICATE_AUTH` | 用户人工 `wrangler secret put`；本轮不实测不受阻 |
| R3 | gemini 计费按 token（非字符），15 积分/1K 字为估算 | 记入文档「待实测校准」；可先按保守值 |
| R4 | minimax 53 音色复用旧清单，未在 2.8/2.6 页面逐条核对（页面只列 17 个 highlights，schema 明确「任意 MiniMax 系统音色」） | 接受；若上游 400 `INVALID_VOICE` 由 `UPSTREAM_4XX` 透传给客户端 |
| R5 | elevenlabs v3 语言自动探测为启发式 | 记入文档；可选后续改成暴露 `language` 参数 |
| R6 | 页内营销 `ModelTiersSection` 仍是 3 列 standard/pro/master（组件/i18n 写死） | **本轮不改**（用户只要求更新模型文档）；新档与旧文案并存，建议后续单开文案批次 |
| R7 | hero / FAQ / JSON-LD 含「三档 / 53 voices」旧表述 | 同上，本轮不改 |
| R8 | BFF `prompt.length > 2000` 通用硬拒（`api.ai.submit.tsx:806-809`）使 3000+ 套餐既有失效（存量缺陷，非本批引入） | 本轮不修；记入风险，如需修另开 |
| R9 | 画布「重新编辑」不回收 `charLimit`（prefill 缺字段） | 存量缺陷；新档参数集相同，不放大问题；本轮不改 |
| R10 | 旧三档本轮保留 active（仅 UI 隐藏），API 仍可调 | 主动决策：避免跨仓 verify 死锁；下一批次按 §8.4 标弃用 |

---

## 8. 任务分配

| 任务 | 负责人 | 依赖 |
|---|---|---|
| BT0–BT6 | backend teammate | 用户批准本清单 |
| FT1–FT8 | frontend teammate | BT5（sync 成功） |
| CT0–CT4 | Lead | 全程总控；文档以 BT2 结果为准 |
| 每批 diff review / 工作区体检 / 推送闸门 | Lead | 每次 push 前 |

**纪律**（`docs/踩坑集锦.md` #1/#4/#5）：任务板标题带 `[ab-team]` 前缀；`git add` 只用明确路径、禁 `-A`；
里程碑即 commit；push = 立即上线，必须 Lead 确认后再推；teammate 停止后 Lead 立即工作区体检。
