# audio-workers 4 工具换型 · Replicate 候选模型表单

**状态**：只调研，**不执行**（未创建 handler、未改任何仓、未 commit）。等用户拍板后再开工。
**日期**：2026-11-06
**范围**：ai-voice-changer / ai-rapper-voice-generator / ai-text-to-music / ai-singing-generator
（ai-text-to-speech 不在本批，届时与 character-voice 八档一起做）

**用户硬条件**

1. Replicate 页面**带黑色对勾徽章** → 页面数据 `is_official: true`（官方模型）。
2. **计费不能是 token 计费** → 只接受 `character_input_count` / `audio_output_count` / `audio_output_duration_seconds`；`token_input_count` / `token_output_count` 一律排除。

**取证方式**：抓 `https://replicate.com/<owner>/<name>` 页面内 `is_official` 与 `billingConfig`；参数 schema 取 Replicate API `/v1/models/{owner}/{name}` 的 `latest_version.openapi_schema`。官方模型全集 = `/collections/official`（448 款）。2026-11-06 抓取，Lead 与 backend teammate 独立核对过一轮。

**积分口径**：`credits = ceil(上游 USD × 300)`（catalog-contracts 踩坑 #6）。

---

## 0. 结论速览

| 工具 | 官方 + 非 token 候选 | 建议 | 默认档建议 |
|---|---|---|---|
| `ai-voice-changer` | **0 款** | 官方没有单步 speech-to-speech / 变声模型 → 建议保留 fal 现状（§5） | — |
| `ai-rapper-voice-generator` | **6 款（+3 款可选补充）** | 说唱向字符计费 TTS，一模型一档 | `chatterbox-pro`（说唱情绪最贴）或 `elevenlabs-turbo-v2.5`（产品默认档惯性） |
| `ai-text-to-music` | **6 款** | 带人声歌曲为主 + 1 档按秒计费可调时长 | `minimax-music-1.5`（9 积分 / ≤4min / 歌词必填） |
| `ai-singing-generator` | **6 款** | 歌词驱动 + 翻唱 | `minimax-music-1.5` |

---

## 1. 判定口径与排除清单

**黑勾 = `is_official: true`**。取证例：`bytedance/seedream-4.5` → true（用户截图同款）；`meta/musicgen`、`zsxkib/*`、`pseudoram/rvc-v2` → false。

**被计费规则排除的官方模型（重要，避免后续误引）**

| 模型 | 官方 | billing metric | 排除原因 |
|---|---|---|---|
| `minimax/speech-2.6-hd` / `2.6-turbo` / `2.8-hd` / `2.8-turbo` | ✓ | `token_input_count` | token 计费 |
| `google/gemini-3.1-flash-tts` / `gemini-3.8-flash-tts` / `gemini-3.8-flash-lite-tts` | ✓ | `token_input_count` + `token_output_count` | token 计费 |
| `openai/gpt-4o-transcribe`（STT，两段式变声会用） | ✓ | token | token 计费 |
| `meta/musicgen` | ✗ | GPU 时长（无 billingConfig） | 非官方 |
| `resemble-ai/chatterbox-multilingual` | ✗ | GPU 时长 | 非官方（注意：同 org 的 chatterbox / -pro 是官方） |

---

## 2. ai-rapper-voice-generator（说唱人声 TTS）

命名：`modelId = ai-rapper-voice-generator-<tail>`，`tierId = <tail>`，client `modelId = arui-rapper-voice-generator-<tail>`（catalog modelId 的 `ai-` 前缀换成 `arui-`）。
计费：`perUnit / charLimit`，charLimit 档建议沿用 1000/2000/3000。

### 推荐档（6）

| # | tail | Replicate slug | 官方 | metric | 单价 | 积分 1K/2K/3K | 音色 | 可暴露参数 | 说唱差异化 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `chatterbox-pro` ★默认候选 | `resemble-ai/chatterbox-pro` | ✓ | character_input_count | $0.04 / 1K 字 | 12 / 24 / 36 | 9 预置 + pitch 5 档 | prompt, voice, pitch | `exaggeration` 隐藏默认 0.9（说唱强度），pitch 可压低 |
| 2 | `elevenlabs-v3` | `elevenlabs/v3` | ✓ | character_input_count | $0.10 / 1K 字 | 30 / 60 / 90 | 26 | prompt, voice, speed | 表现力最强；`style` 隐藏 0.9 + audio tags |
| 3 | `chatterbox` | `resemble-ai/chatterbox` | ✓ | character_input_count | $0.025 / 1K 字 | 8 / 15 / 23 | 默认 + `audio_prompt` 克隆 | prompt（克隆槽默认不暴露） | `exaggeration` 隐藏默认 0.9 |
| 4 | `inworld-realtime-tts-2` | `inworld/realtime-tts-2` | ✓ | character_input_count | $0.025 / 1K 字 | 8 / 15 / 23 | 4 预置（Ashley/Dennis/Alex/Darlene） | prompt(≤2000 字), voice | `text` 支持自然语言 steering（"rap delivery"） |
| 5 | `qwen3-tts` | `qwen/qwen3-tts` | ✓ | character_input_count | $0.02 / 1K 字 | 6 / 12 / 18 | 9 预置 | prompt, voice | 中文最强；`style_instruction` 隐藏写 "rapping, rhythmic" |
| 6 | `grok-tts` | `xai/grok-text-to-speech` | ✓ | character_input_count | $0.015 / 1K 字 | 5 / 9 / 14 | 5 | prompt(≤15000 字), voice | 最便宜；inline speech tags |

### 可选补充档（复用 character-voice 已有上游，零新增上游风险）

| tail | slug | 官方 | 单价 | 积分 1K/2K/3K | 说明 |
|---|---|---|---|---|---|
| `elevenlabs-turbo-v2.5` | `elevenlabs/turbo-v2.5` | ✓ | $0.05 / 1K 字 | 15 / 30 / 45 | 快、稳；backend 建议作为「产品默认档」（与 character-voice 默认档一致） |
| `elevenlabs-flash-v2.5` | `elevenlabs/flash-v2.5` | ✓ | $0.05 / 1K 字 | 15 / 30 / 45 | 更低延迟，与 turbo 同价 → 二选一即可 |
| `elevenlabs-v2-multilingual` | `elevenlabs/v2-multilingual` | ✓ | $0.10 / 1K 字 | 30 / 60 / 90 | 长文/多语种，与 v3 同价 → 优先级低 |

**技术同构性**：全部「文本 → 单文件音频」，6 款 `default_example.output` 均为单个 URL，可直接套 `createReplicateAudioHandler`（submit → poll → R2）。
**已排除**：`resemble-ai/chatterbox-turbo`（官方且便宜，但**单次 ≤500 字**，与 1000 字最低档冲突）、`playht/play-dialog`（按输出秒计费，无法预扣费，且是对话向）。

---

## 3. ai-text-to-music（文本/描述 → 带人声歌曲）

**先修一个契约不一致**：后端 catalog `toolSlug = "text-to-music"`，arui 页面 slug = `ai-text-to-music` → 线上 `/api/catalog/ai-text-to-music` 404（你说的「页面存在但没后端接入」即此）。建议**后端把 toolSlug 改成 `ai-text-to-music`**（toolSlug 不是 KV key，只影响分组；前端零改 slug），新 modelId 随之 `ai-text-to-music-<tail>`。

| # | tail | Replicate slug | 官方 | metric | 单价 | 积分 | 时长/人声 | 可暴露参数 |
|---|---|---|---|---|---|---|---|---|
| 1 | `minimax-music-1.5` ★默认 | `minimax/music-1.5` | ✓ | audio_output_count | $0.03/文件 | 9 | ≤4 min，自然 vocals；歌词必填 | prompt(风格 10–300 字), lyrics |
| 2 | `lyria-3-pro` | `google/lyria-3-pro` | ✓ | audio_output_count | $0.08/文件 | 24 | ≤3 min 歌曲；歌词写进 prompt（支持 [Verse]/[Chorus] 结构标记） | prompt（含歌词） |
| 3 | `minimax-music-2.6` | `minimax/music-2.6` | ✓ | audio_output_count | $0.15/文件 | 45 | 歌曲或**纯器乐**；可自动生成歌词 | prompt, lyrics, is_instrumental, lyrics_optimizer |
| 4 | `elevenlabs-music` | `elevenlabs/music` | ✓ | audio_output_duration_seconds | $8.30 / 1000 秒 | 25 / 75 / 150（10/30/60s） | `music_length_ms` 5–300s，**唯一时长可调**档；`force_instrumental` 默认 true 需置 false 才有 vocals | prompt, duration, instrumental |
| 5 | `lyria-3`（可选） | `google/lyria-3` | ✓ | audio_output_count | $0.04/文件 | 12 | 30 秒片段；人声需实测确认 | prompt |
| 6 | `stable-audio-2.5`（可选，器乐） | `stability-ai/stable-audio-2.5` | ✓ | audio_output_count | $0.20/文件 | 60 | 器乐/音效，`duration` 1–190s；无人声 | prompt, duration |

**不推荐**：`google/lyria-2`（$2/1000s，无歌词字段、时长不可控，fixed 估不准）；`minimax/music-2.5`（与 2.6 同价，但少 instrumental / lyrics_optimizer）；`minimax/music-01`（≤1min，更适合唱歌工具的「快速档」）。

---

## 4. ai-singing-generator（歌词 → 带人声歌曲）

命名：`ai-singing-generator-<tail>`。与 §3 共用上游但 modelId / toolSlug 独立（同 diffrhythm 先例）。

| # | tail | Replicate slug | 官方 | metric | 单价 | 积分 | 说明 |
|---|---|---|---|---|---|---|---|
| 1 | `minimax-music-1.5` ★默认 | `minimax/music-1.5` | ✓ | audio_output_count | $0.03 | 9 | 歌词必填（[Verse]/[Chorus] 标记），≤4 min |
| 2 | `minimax-music-01` | `minimax/music-01` | ✓ | audio_output_count | $0.035 | 11 | ≤1 min，快；支持参考歌曲 / 参考音色（file 参数，默认不暴露；将来可做「用 TA 的声音唱」） |
| 3 | `minimax-music-2.6` | `minimax/music-2.6` | ✓ | audio_output_count | $0.15 | 45 | 完整歌曲，可自动生成歌词 |
| 4 | `elevenlabs-music` | `elevenlabs/music` | ✓ | audio_output_duration_seconds | $8.30 / 1000 秒 | 25 / 75 / 150 | 唯一时长可调档（10/30/60s），歌词写 prompt |
| 5 | `lyria-3-pro`（可选） | `google/lyria-3-pro` | ✓ | audio_output_count | $0.08 | 24 | ≤3 min，歌词塞 prompt |
| 6 | `minimax-music-cover`（可选，翻唱） | `minimax/music-cover` | ✓ | audio_output_count | $0.30 | 90 | 上传原曲 + 目标风格，保旋律换音色/编曲（需 file 参数 `audio_url`） |

> backend 建议 `music-cover` 不进本批（audio→audio 翻唱，可另开「翻唱」工具）；若你想让唱歌工具支持翻唱，它是最贴的一档。

---

## 5. ai-voice-changer（audio→audio 变声）——**官方 0 候选**

**取证**：官方 448 款里，音频相关 org 全枚举，**没有任何单步 speech-to-speech / voice conversion**：
- `elevenlabs/*` 官方恰 7 款（v3 / turbo-v2.5 / flash-v2.5 / v2-multilingual / music / scribe-v2 / dubbing）；`elevenlabs/voice-changer`、`voice-conversion` 均 404。
- `minimax/voice-cloning` 官方，但它是**克隆声音建档**（generic_output_count，约 $3/次），只产 voice_id；其下游 minimax TTS 全 token 计费 → 两段式也不通。
- `resemble-ai/chatterbox*` 是 TTS + 音色克隆，不是语音转换。
- RVC 系（`zsxkib/realistic-voice-cloning`、`pseudoram/rvc-v2`、`lucataco/singing_voice_conversion`）**全部非官方**。
- 官方唯二 audio→audio 都不是语音变声：`elevenlabs/dubbing`（翻译向，$0.0367/s）、`minimax/music-cover`（翻唱）。

**可选出路（需拍板）**

| 方案 | 做法 | 代价 |
|---|---|---|
| A 保留现状 ★建议 | 继续用 fal `fal-ai/chatterbox/speech-to-speech`（单步 S2S，保韵律） | 不用 Replicate，但功能最对、零改造 |
| B 两段式 | 官方 STT → 官方 TTS 声音克隆 | 丢源音频韵律/情绪；两次上游调用；官方 STT 全是 token 计费 → **违反第 2 条硬条件** |
| C 停做 | 本工具本轮不换型 | 最省事但用户可选模型没增加 |

**结论**：同时满足「官方黑勾 + 非 token + 单步变声」的模型**不存在**。

---

## 6. 契约 / 命名 / 计费口径（两侧已对齐）

- `modelId = toolSlug + "-" + tail`；`tierId = tail`；client `modelId` = catalog modelId 的 `ai-` 前缀换成 `arui-`（image-workers 踩坑 #31 / audio 踩坑 #17）。
- 不再有 standard / pro / master：**一模型一档**，用户自选（character-voice v2 范本）。
- `credits = ceil(USD × 300)`；字符计费档 `perUnit / charLimit`；按文件计费档 `fixed`；按秒计费档 `perUnit / duration`（仅 elevenlabs/music）。
- **按文件计费的档必须删掉现有 `duration`(10/30/60) 参数**（否则是假成本杠杆）；只有 elevenlabs/music 保留 duration → perUnit。此改动会改变前端参数区，需前端确认。
- `catalog-contracts` 1.2.0 现有 schema 够用（fixed / perUnit 都在），**本批不用升 submodule**。
- 每档实现 = 复制 character-voice 一个 handler 目录 + 改 `model_id` / `catalog.toolSlug` / `catalog.tierId`，走 `createReplicateAudioHandler`；`cancelAfter` 按工具僵尸阈值成对设置（踩坑 #5）。
- 旧档处置顺序不可交换：后端 sync 新档 → 前端「删旧映射 + 加新映射」同一 commit → 后端再标 `deprecated` + `deprecated_alternatives`。

---

## 7. 用户拍板（2026-11-06，已授权执行）

1. **rapper**：符合的都上（7 档），**默认档 `elevenlabs-turbo-v2-5`**，可选补充档不加（不加 flash-v2.5 / v2-multilingual）。
   → `elevenlabs-turbo-v2-5`(默认) / `chatterbox-pro` / `elevenlabs-v3` / `chatterbox` / `inworld-realtime-tts-2` / `qwen3-tts` / `grok-tts`。
2. **text-to-music**：符合的都上（6 档），默认档由 Lead 定为 `minimax-music-1-5`。
3. **singing**：符合的都上（6 档），默认档由 Lead 定为 `minimax-music-1-5`。
4. **voice-changer**：**停做**，保留 fal 三档现状不动。
5. **toolSlug**：由前端确认（倾向后端改 `text-to-music` → `ai-text-to-music`）。
6. **duration**：按文件计费档移除 duration；只有 elevenlabs-music 保留 duration enum(10/30/60 → 25/75/150 积分)。

**本批执行范围**：19 档（rapper 7 + T2M 6 + singing 6），ai-text-to-speech 留待与 character-voice 八档同批。
