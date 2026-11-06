# ai-character-voice 模型对接文档（Replicate 模型池版）

> 2026-11-06 换型：`ai-character-voice` 从 fal 三档（kokoro / elevenlabs-turbo / minimax-speech-02-hd）
> 切换为 **Replicate 官方模型池 7 档并列**（一模型一档，用户自选）。旧三档已 `deprecated`（`/generate` 返 410 + alternatives，`/status` 仍服务在途）。
> 参数以 Replicate 模型页 Input schema 为准（2026-11-06 抓取），并以 worker 实际 `describe()` 输出校验。
> 关联：`docs/踩坑集锦.md` #4/#5、`docs/ai-character-voice-代办清单.md`、audio-workers `docs/踩坑集锦.md` #20/#23。

**稳定契约**：`modelId` 一旦发布永久不变（架构 §13.3）；`falModel` 字段语义为「底层模型」，本次填 Replicate slug，可随底层升级变化，不影响前端。

---

## 1. 七档总览

| # | catalog modelId | client modelId（前端） | 上游 Replicate slug | 定位 | 参数 | 音色数 | charLimit | Cancel-After |
|---|---|---|---|---|---|---|---|---|
| 1 | `ai-character-voice-gemini-3-8-flash-tts` | `arui-character-voice-gemini-3-8-flash-tts` | `google/gemini-3.8-flash-tts` | Google Gemini 3.8 Flash TTS：默认档：起步价最低 + 130+ 语种 + 30 音色 + 双人对话能力 | prompt, voice, charLimit | 30 | 5 档 | 4m |
| 2 | `ai-character-voice-elevenlabs-v3` | `arui-character-voice-elevenlabs-v3` | `elevenlabs/v3` | ElevenLabs v3：表达力最强（alpha）：70+ 语种 / 音频标签 / 多说话人 | prompt, voice, speed, charLimit | 26 | 5 档 | 4m |
| 3 | `ai-character-voice-minimax-speech-2-8-turbo` | `arui-character-voice-minimax-speech-2-8-turbo` | `minimax/speech-2.8-turbo` | MiniMax Speech 2.8 Turbo：低延迟主力档：40+ 语种 / 53 音色 / 情感自动 | prompt, voice, speed, charLimit | 53 | 5 档 | 4m |
| 4 | `ai-character-voice-minimax-speech-2-8-hd` | `arui-character-voice-minimax-speech-2-8-hd` | `minimax/speech-2.8-hd` | MiniMax Speech 2.8 HD：顶配音质档：32+ 语种 / 53 音色 / 情感自动 | prompt, voice, speed, charLimit | 53 | 5 档 | 4m |
| 5 | `ai-character-voice-minimax-speech-2-6-turbo` | `arui-character-voice-minimax-speech-2-6-turbo` | `minimax/speech-2.6-turbo` | MiniMax Speech 2.6 Turbo：上一代 turbo（留存对照，价格同 2.8 turbo） | prompt, voice, speed, charLimit | 53 | 5 档 | 4m |
| 6 | `ai-character-voice-minimax-speech-2-6-hd` | `arui-character-voice-minimax-speech-2-6-hd` | `minimax/speech-2.6-hd` | MiniMax Speech 2.6 HD：上一代 hd（留存对照，价格同 2.8 hd） | prompt, voice, speed, charLimit | 53 | 5 档 | 4m |
| 7 | `ai-character-voice-inworld-realtime-tts-2` | `arui-character-voice-inworld-realtime-tts-2` | `inworld/realtime-tts-2` | Inworld Realtime TTS 2：轻量低价档：16 生产语种（+90 实验）/ 4 音色 | prompt, voice, charLimit | 4 | 2 档 | 4m |

- catalog `tierId` = modelId 尾段；`workerKind` = `audio-workers`；`schemaVersion` = `1.2.0`；`handlerVersion` = `v1`；`maxDimension` = 1。
- **默认档（产品拍板）**：`ai-character-voice-gemini-3-8-flash-tts`（起步价最低 + 130+ 语种）。

---

## 2. 参数暴露总览（前端 / BFF 快速对齐）

每档只暴露 **终端用户业务决策参数**（Param Exposure Principle），所有新档统一为 `prompt` + `voice` (+ `speed`) + `charLimit` 形态：

| 参数 | 含义 | 暴露档 |
|---|---|---|
| `prompt` | 待合成文本（必填） | 全 7 档 |
| `voice` | 音色 enum | 全 7 档（30 / 26 / 53 / 4 个） |
| `speed` | 语速 | elevenlabs-v3（0.7–1.2）/ minimax ×4（0.5–2）；gemini、inworld 不暴露 |
| `charLimit` | 计费套餐 enum（不转发上游） | 全 7 档（inworld 仅 1000/2000） |

**不暴露（handler 写死进 defaults，UI 看不到、API 也传不进）**：

- **Google Gemini 3.8 Flash TTS**（`ai-character-voice-gemini-3-8-flash-tts`）：`style=""`、`second_voice="none"`、`output_format="mp3"`
- **ElevenLabs v3**（`ai-character-voice-elevenlabs-v3`）：`stability=0.5`、`similarity_boost=0.75`、`style=0`(exaggeration)、`language_code`(自动探测)
- **MiniMax Speech 2.8 Turbo**（`ai-character-voice-minimax-speech-2-8-turbo`）：`emotion=auto`、`pitch=0`、`volume=1`、`audio_format=mp3`、`sample_rate=32000`、`channel=mono`、`language_boost=Automatic`、`english_normalization=true`、`subtitle_enable=false`
- **MiniMax Speech 2.8 HD**（`ai-character-voice-minimax-speech-2-8-hd`）：同 2.8-turbo
- **MiniMax Speech 2.6 Turbo**（`ai-character-voice-minimax-speech-2-6-turbo`）：同 2.8-turbo
- **MiniMax Speech 2.6 HD**（`ai-character-voice-minimax-speech-2-6-hd`）：同 2.8-turbo
- **Inworld Realtime TTS 2**（`ai-character-voice-inworld-realtime-tts-2`）：`language=auto`、`temperature=0`、`audio_format=mp3`、`sample_rate=48000`、`text_normalization=auto`、`speaking_rate=0`(正常语速)

**voice 白名单**：handler 只接受 catalog enum 内的系统音色；克隆 `voice_id` 不暴露（非法 voice 由上游 422 → `UPSTREAM_4XX` 透传，不计费）。

---

## 3. 公共对接信息

### Worker 入口

- Base URL：`https://audio-workers.<your-domain>`（由 BFF 配置，前端不直连）
- Auth：`Authorization: Bearer <AUDIO_WORKERS_API_KEY>`（BFF 持有，前端无感知）
- Content-Type：`application/json`

### 请求 / 响应（7 档通用，与原三档完全一致）

**POST `/generate`**
```json
{
  "model": "ai-character-voice-<尾段>",
  "prompt": "要合成的文本",
  "voice": "<voice_id>",
  "speed": 1,
  "charLimit": 1000
}
```
→ 200 `{ "request_id": "<id>", "status": "pending" }`

**GET `/status/<request_id>`**
```json
// 进行中
{ "request_id": "<id>", "status": "pending" }

// 完成
{ "request_id": "<id>", "status": "completed", "audio": { "url": "https://audio.arui.ai/audio/generations/<date>/<id>.mp3" } }

// 失败
{ "request_id": "<id>", "status": "failed" }
```

### 上游错误契约

| 场景 | HTTP | body | 客户端建议 |
|---|---|---|---|
| Replicate 输入校验失败（如 voice 非法 / 文本超长） | 上游 4xx 透传 | `{ "error": "UPSTREAM_4XX", "upstream": "replicate", "upstreamStatus": <n>, "detail": ... }` | 从 `detail` 提取人话提示；不计费 |
| `REPLICATE_API_TOKEN` 未配置 | 502 | `{ "error": "REPLICATE_AUTH", "message": "REPLICATE_API_TOKEN is not configured" }` | 运维配置 secret 后重试 |
| 上游 5xx / 内部异常 | 500 | `{ "error": "INTERNAL" }` | 走 retry / 僵尸退款路径 |

### 轮询与超时

- 建议轮询间隔 **1–2s**；单次生成通常 < 120s。
- 上游 `Cancel-After = 4m`，必须 **< BFF TTS 僵尸阈值 5min**（踩坑 #5 成对不变式）：上游卡住先失败，BFF 轮询拿 failed 立即退款，杜绝「先退款后出音频」。
- 完成后 `audio.url` 指向 R2 永久回退地址（Replicate 输出 URL 仅 24h 有效，worker 已落 R2）。

### catalog KV key

- `model:audio:<modelId>`（无 TTL，CI post-deploy sync 写入）
- BFF 同账号直读 KV 聚合；跨账号走 `GET /__catalog/read`（audio key / catalog key 均可，踩坑 #15）

---

## 4. 逐档参数与音色

### Google Gemini 3.8 Flash TTS

- catalog modelId：`ai-character-voice-gemini-3-8-flash-tts` / client modelId：`arui-character-voice-gemini-3-8-flash-tts` / tierId：`gemini-3-8-flash-tts`
- 上游：`google/gemini-3.8-flash-tts`；定位：默认档：起步价最低 + 130+ 语种 + 30 音色 + 双人对话能力
- 语言：130+（模型自动检测，无需传语言）
- 上游价格：$0.50 / M 输入 token + $9 / M 输出 token（页面价；≈ $0.018/1K 字符量级，按音频 token 估算）
- 不暴露参数（defaults）：`style=""`、`second_voice="none"`、`output_format="mp3"`

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Kore` | 30 个（见下） |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000（5 档） |

**voice 清单（30）**

`Achernar`, `Achird`, `Algenib`, `Algieba`, `Alnilam`, `Aoede`, `Autonoe`, `Callirrhoe`, `Charon`, `Despina`, `Enceladus`, `Erinome`, `Fenrir`, `Gacrux`, `Iapetus`, `Kore`, `Laomedeia`, `Leda`, `Orus`, `Pulcherrima`, `Puck`, `Rasalgethi`, `Sadachbia`, `Sadaltager`, `Schedar`, `Sulafat`, `Umbriel`, `Vindemiatrix`, `Zephyr`, `Zubenelgenubi`

**creditCost（perUnit / charLimit）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 15 | 30 | 45 | 60 | 75 |

---

### ElevenLabs v3

- catalog modelId：`ai-character-voice-elevenlabs-v3` / client modelId：`arui-character-voice-elevenlabs-v3` / tierId：`elevenlabs-v3`
- 上游：`elevenlabs/v3`；定位：表达力最强（alpha）：70+ 语种 / 音频标签 / 多说话人
- 语言：70+（worker 按字符集自动探测 language_code：zh/ja/ko/ru/ar/hi/he…，其余回落 en）
- 上游价格：$0.10 / 1K 输入字符
- 不暴露参数（defaults）：`stability=0.5`、`similarity_boost=0.75`、`style=0`(exaggeration)、`language_code`(自动探测)

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Rachel` | 26 个（见下） |
| `speed` | number | — | `1` | 0.7 ~ 1.2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000（5 档） |

**voice 清单（26）**

`Rachel`, `Drew`, `Clyde`, `Paul`, `Aria`, `Domi`, `Dave`, `Roger`, `Fin`, `Sarah`, `James`, `Jane`, `Juniper`, `Arabella`, `Hope`, `Bradford`, `Reginald`, `Gaming`, `Austin`, `Kuon`, `Blondie`, `Priyanka`, `Alexandra`, `Monika`, `Mark`, `Grimblewood`

**creditCost（perUnit / charLimit）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 50 | 100 | 150 | 200 | 250 |

---

### MiniMax Speech 2.8 Turbo

- catalog modelId：`ai-character-voice-minimax-speech-2-8-turbo` / client modelId：`arui-character-voice-minimax-speech-2-8-turbo` / tierId：`minimax-speech-2-8-turbo`
- 上游：`minimax/speech-2.8-turbo`；定位：低延迟主力档：40+ 语种 / 53 音色 / 情感自动
- 语言：40+（language_boost=Automatic 自动）
- 上游价格：$0.06 / 1K 输入 token（≈ 1 token = 1 字符）
- 不暴露参数（defaults）：`emotion=auto`、`pitch=0`、`volume=1`、`audio_format=mp3`、`sample_rate=32000`、`channel=mono`、`language_boost=Automatic`、`english_normalization=true`、`subtitle_enable=false`

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `English_expressive_narrator` | 53 个（见下） |
| `speed` | number | — | `1` | 0.5 ~ 2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000（5 档） |

**voice 清单（53）**

`English_expressive_narrator` · `English_FriendlyPerson` · `English_ManWithDeepVoice` · `Chinese (Mandarin)_Wise_Women` · `Chinese (Mandarin)_News_Anchor` · `Chinese (Mandarin)_Warm_Girl`
`Japanese_ColdQueen` · `Japanese_GentleButler` · `Japanese_OptimisticYouth` · `Korean_WiseTeacher` · `Korean_GentleWoman` · `Korean_BraveYouth`
`Spanish_SereneWoman` · `Spanish_Narrator` · `Spanish_WiseScholar` · `Portuguese_SentimentalLady` · `Portuguese_Narrator` · `Portuguese_InspiringLady`
`Cantonese_ProfessionalHost (F)` · `Cantonese_ProfessionalHost (M)` · `French_MovieLeadFemale` · `French_MaleNarrator` · `Indonesian_SweetGirl` · `Indonesian_CalmWoman`
`German_FriendlyMan` · `German_SweetLady` · `Russian_ReliableMan` · `Russian_AmbitiousWoman` · `Italian_Narrator` · `Italian_BraveHeroine`
`Dutch_kindhearted_girl` · `Dutch_bossy_leader` · `Arabic_CalmWoman` · `Arabic_FriendlyGuy` · `Turkish_CalmWoman` · `Turkish_Trustworthyman`
`Ukrainian_CalmWoman` · `Ukrainian_WiseScholar` · `Thai_female_1_sample1` · `Thai_male_1_sample8` · `Polish_female_1_sample1` · `Polish_male_1_sample4`
`Romanian_male_1_sample2` · `Romanian_female_2_sample1` · `Greek_female_1_sample1` · `greek_male_1a_v1` · `czech_female_2_v2` · `czech_male_1_v1`
`finnish_male_3_v1` · `finnish_female_4_v1` · `hindi_male_1_v2` · `hindi_female_1_v2` · `Vietnamese_kindhearted_girl`

**creditCost（perUnit / charLimit）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 30 | 60 | 90 | 120 | 150 |

---

### MiniMax Speech 2.8 HD

- catalog modelId：`ai-character-voice-minimax-speech-2-8-hd` / client modelId：`arui-character-voice-minimax-speech-2-8-hd` / tierId：`minimax-speech-2-8-hd`
- 上游：`minimax/speech-2.8-hd`；定位：顶配音质档：32+ 语种 / 53 音色 / 情感自动
- 语言：32+（language_boost=Automatic 自动）
- 上游价格：$0.10 / 1K 输入 token
- 不暴露参数（defaults）：同 2.8-turbo

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `English_expressive_narrator` | 53 个（见下） |
| `speed` | number | — | `1` | 0.5 ~ 2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000（5 档） |

**voice 清单（53）**

`English_expressive_narrator` · `English_FriendlyPerson` · `English_ManWithDeepVoice` · `Chinese (Mandarin)_Wise_Women` · `Chinese (Mandarin)_News_Anchor` · `Chinese (Mandarin)_Warm_Girl`
`Japanese_ColdQueen` · `Japanese_GentleButler` · `Japanese_OptimisticYouth` · `Korean_WiseTeacher` · `Korean_GentleWoman` · `Korean_BraveYouth`
`Spanish_SereneWoman` · `Spanish_Narrator` · `Spanish_WiseScholar` · `Portuguese_SentimentalLady` · `Portuguese_Narrator` · `Portuguese_InspiringLady`
`Cantonese_ProfessionalHost (F)` · `Cantonese_ProfessionalHost (M)` · `French_MovieLeadFemale` · `French_MaleNarrator` · `Indonesian_SweetGirl` · `Indonesian_CalmWoman`
`German_FriendlyMan` · `German_SweetLady` · `Russian_ReliableMan` · `Russian_AmbitiousWoman` · `Italian_Narrator` · `Italian_BraveHeroine`
`Dutch_kindhearted_girl` · `Dutch_bossy_leader` · `Arabic_CalmWoman` · `Arabic_FriendlyGuy` · `Turkish_CalmWoman` · `Turkish_Trustworthyman`
`Ukrainian_CalmWoman` · `Ukrainian_WiseScholar` · `Thai_female_1_sample1` · `Thai_male_1_sample8` · `Polish_female_1_sample1` · `Polish_male_1_sample4`
`Romanian_male_1_sample2` · `Romanian_female_2_sample1` · `Greek_female_1_sample1` · `greek_male_1a_v1` · `czech_female_2_v2` · `czech_male_1_v1`
`finnish_male_3_v1` · `finnish_female_4_v1` · `hindi_male_1_v2` · `hindi_female_1_v2` · `Vietnamese_kindhearted_girl`

**creditCost（perUnit / charLimit）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 50 | 100 | 150 | 200 | 250 |

---

### MiniMax Speech 2.6 Turbo

- catalog modelId：`ai-character-voice-minimax-speech-2-6-turbo` / client modelId：`arui-character-voice-minimax-speech-2-6-turbo` / tierId：`minimax-speech-2-6-turbo`
- 上游：`minimax/speech-2.6-turbo`；定位：上一代 turbo（留存对照，价格同 2.8 turbo）
- 语言：40+（language_boost=Automatic 自动）
- 上游价格：$0.06 / 1K 输入 token
- 不暴露参数（defaults）：同 2.8-turbo

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `English_expressive_narrator` | 53 个（见下） |
| `speed` | number | — | `1` | 0.5 ~ 2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000（5 档） |

**voice 清单（53）**

`English_expressive_narrator` · `English_FriendlyPerson` · `English_ManWithDeepVoice` · `Chinese (Mandarin)_Wise_Women` · `Chinese (Mandarin)_News_Anchor` · `Chinese (Mandarin)_Warm_Girl`
`Japanese_ColdQueen` · `Japanese_GentleButler` · `Japanese_OptimisticYouth` · `Korean_WiseTeacher` · `Korean_GentleWoman` · `Korean_BraveYouth`
`Spanish_SereneWoman` · `Spanish_Narrator` · `Spanish_WiseScholar` · `Portuguese_SentimentalLady` · `Portuguese_Narrator` · `Portuguese_InspiringLady`
`Cantonese_ProfessionalHost (F)` · `Cantonese_ProfessionalHost (M)` · `French_MovieLeadFemale` · `French_MaleNarrator` · `Indonesian_SweetGirl` · `Indonesian_CalmWoman`
`German_FriendlyMan` · `German_SweetLady` · `Russian_ReliableMan` · `Russian_AmbitiousWoman` · `Italian_Narrator` · `Italian_BraveHeroine`
`Dutch_kindhearted_girl` · `Dutch_bossy_leader` · `Arabic_CalmWoman` · `Arabic_FriendlyGuy` · `Turkish_CalmWoman` · `Turkish_Trustworthyman`
`Ukrainian_CalmWoman` · `Ukrainian_WiseScholar` · `Thai_female_1_sample1` · `Thai_male_1_sample8` · `Polish_female_1_sample1` · `Polish_male_1_sample4`
`Romanian_male_1_sample2` · `Romanian_female_2_sample1` · `Greek_female_1_sample1` · `greek_male_1a_v1` · `czech_female_2_v2` · `czech_male_1_v1`
`finnish_male_3_v1` · `finnish_female_4_v1` · `hindi_male_1_v2` · `hindi_female_1_v2` · `Vietnamese_kindhearted_girl`

**creditCost（perUnit / charLimit）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 30 | 60 | 90 | 120 | 150 |

---

### MiniMax Speech 2.6 HD

- catalog modelId：`ai-character-voice-minimax-speech-2-6-hd` / client modelId：`arui-character-voice-minimax-speech-2-6-hd` / tierId：`minimax-speech-2-6-hd`
- 上游：`minimax/speech-2.6-hd`；定位：上一代 hd（留存对照，价格同 2.8 hd）
- 语言：40+（language_boost=Automatic 自动）
- 上游价格：$0.10 / 1K 输入 token
- 不暴露参数（defaults）：同 2.8-turbo

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `English_expressive_narrator` | 53 个（见下） |
| `speed` | number | — | `1` | 0.5 ~ 2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000（5 档） |

**voice 清单（53）**

`English_expressive_narrator` · `English_FriendlyPerson` · `English_ManWithDeepVoice` · `Chinese (Mandarin)_Wise_Women` · `Chinese (Mandarin)_News_Anchor` · `Chinese (Mandarin)_Warm_Girl`
`Japanese_ColdQueen` · `Japanese_GentleButler` · `Japanese_OptimisticYouth` · `Korean_WiseTeacher` · `Korean_GentleWoman` · `Korean_BraveYouth`
`Spanish_SereneWoman` · `Spanish_Narrator` · `Spanish_WiseScholar` · `Portuguese_SentimentalLady` · `Portuguese_Narrator` · `Portuguese_InspiringLady`
`Cantonese_ProfessionalHost (F)` · `Cantonese_ProfessionalHost (M)` · `French_MovieLeadFemale` · `French_MaleNarrator` · `Indonesian_SweetGirl` · `Indonesian_CalmWoman`
`German_FriendlyMan` · `German_SweetLady` · `Russian_ReliableMan` · `Russian_AmbitiousWoman` · `Italian_Narrator` · `Italian_BraveHeroine`
`Dutch_kindhearted_girl` · `Dutch_bossy_leader` · `Arabic_CalmWoman` · `Arabic_FriendlyGuy` · `Turkish_CalmWoman` · `Turkish_Trustworthyman`
`Ukrainian_CalmWoman` · `Ukrainian_WiseScholar` · `Thai_female_1_sample1` · `Thai_male_1_sample8` · `Polish_female_1_sample1` · `Polish_male_1_sample4`
`Romanian_male_1_sample2` · `Romanian_female_2_sample1` · `Greek_female_1_sample1` · `greek_male_1a_v1` · `czech_female_2_v2` · `czech_male_1_v1`
`finnish_male_3_v1` · `finnish_female_4_v1` · `hindi_male_1_v2` · `hindi_female_1_v2` · `Vietnamese_kindhearted_girl`

**creditCost（perUnit / charLimit）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 50 | 100 | 150 | 200 | 250 |

---

### Inworld Realtime TTS 2

- catalog modelId：`ai-character-voice-inworld-realtime-tts-2` / client modelId：`arui-character-voice-inworld-realtime-tts-2` / tierId：`inworld-realtime-tts-2`
- 上游：`inworld/realtime-tts-2`；定位：轻量低价档：16 生产语种（+90 实验）/ 4 音色
- 语言：16 生产语种（en/zh/ja/ko/ru/it/es/pt/fr/de/pl/nl/hi/he/ar）+ 90+ 实验（language=auto 自动检测）
- 上游价格：$0.025 / 1K 输入字符
- 不暴露参数（defaults）：`language=auto`、`temperature=0`、`audio_format=mp3`、`sample_rate=48000`、`text_normalization=auto`、`speaking_rate=0`(正常语速)

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Ashley` | 4 个（见下） |
| `charLimit` | enum | — | `1000` | 1000 / 2000（2 档） |

**voice 清单（4）**

`Ashley`, `Dennis`, `Alex`, `Darlene`

**creditCost（perUnit / charLimit）**

| charLimit | 1000 | 2000 |
|---|---|---|
| credits | 13 | 26 |

---

## 5. 积分规则汇总

统一按 `charLimit` 套餐扣费（BFF 服务端权威计算；前端用同函数展示）：

| charLimit | gemini-3-8-flash-tts | elevenlabs-v3 | minimax 2.8/2.6 turbo | minimax 2.8/2.6 hd | inworld |
|---|---|---|---|---|---|
| 1000 | 15 | 50 | 30 | 50 | 13 |
| 2000 | 30 | 100 | 60 | 100 | 26 |
| 3000 | 45 | 150 | 90 | 150 | — |
| 4000 | 60 | 200 | 120 | 200 | — |
| 5000 | 75 | 250 | 150 | 250 | — |

> gemini 按 token 计价（$0.5/M 入 + $9/M 出），credit 表为**保守估算**，待线上实测后校准。其余档按上游「字符/千 token」线性取整并沿用 ~2.5x 上游成本口径。

---

## 6. 旧三档弃用与迁移（§8.4）

| 旧 modelId | 上游（fal） | deprecated_alternatives（catalog modelId） | 前端 remap（client → client） |
|---|---|---|---|
| `kokoro-tts-en-us` | `fal-ai/kokoro/american-english` | `ai-character-voice-gemini-3-8-flash-tts` | `arui-character-voice-standard` → `arui-character-voice-gemini-3-8-flash-tts` |
| `elevenlabs-turbo` | `fal-ai/elevenlabs/tts/turbo-v2.5` | `ai-character-voice-elevenlabs-v3` | `arui-character-voice-pro` → `arui-character-voice-elevenlabs-v3` |
| `minimax-speech-02-hd` | `fal-ai/minimax/speech-02-hd` | `ai-character-voice-minimax-speech-2-8-hd` | `arui-character-voice-master` → `arui-character-voice-minimax-speech-2-8-hd` |

- 旧档 KV entry 保留（`deprecated: true`，无 TTL），`/generate` 返 **410 `MODEL_DEPRECATED`** + alternatives；`/status` 仍服务在途请求。
- 前端已删除旧 3 条正向映射并补齐 remap；历史画布 regenerate 自动落到同水位新档。

---

## 7. 部署与同步

`audio-workers` push `main` 自动触发 Deploy：`prebuild → wrangler deploy → sleep 5 → sync-catalog → verify-catalog`。

本次上线参考（2026-11-06）：

- Deploy run：https://github.com/nico-zhuo/audio-workers/actions/runs/42152353487
- sync：`[sync] expected 19 entries` → `written: 19 / 19` → `✅ catalog 同步完成(最终):written=19 / total=19,fingerprint✓`
- verify：`✅ catalog 校验通过(19 entries,3 deprecated skipped)`

**运行时 secret（人工）**：`wrangler secret put REPLICATE_API_TOKEN`（CI 不配置；缺失时新档 `/generate` 返回 502 `REPLICATE_AUTH`，deploy/sync 不受影响）。

---

## 8. 前端消费说明

1. **档位列表**：`/api/catalog/ai-character-voice` 由 BFF 从 audio-workers KV 聚合，`modelId` 反向映射成 client `arui-character-voice-*`；无映射的 entry 会被 filter（前端未产品化则不出现）。
2. **显示名**：`locales/<lang>/ai-canvas.json` → `models.<MODEL_I18N_KEY_MAP key>.name`；数字尾段必须显式映射（camelCase 派生不匹配数字，会显示裸 tierId）。
3. **参数 UI**：`ParamForm` 按 catalog `params` schema 渲染；voice / speed / charLimit 与旧三档同形，提交层白名单无需改。
4. **旧档隐藏**：后端 deprecated 后 BFF catalog 自然过滤，前端无需 OFFLINE 黑名单。
5. **画布回放**：旧 client modelId 经 `remapLegacyTierModelId` 换成新档；`charLimit` 回放缺口为存量缺陷（本轮不修）。
6. **超时**：前端 TTS 僵尸阈值 5min 不变（与后端 Cancel-After 4m 成对）。

---

## 9. 风险 / 待收口

| # | 项 | 说明 |
|---|---|---|
| 1 | `REPLICATE_API_TOKEN` 未配置 | 用户需人工 `wrangler secret put`；本地 `.dev.vars` 同步。配置前新档不可用（502）。 |
| 2 | gemini 计费估算 | token 计价 → credit 表保守估算，实测后校准。 |
| 3 | minimax 53 音色 | 沿用旧 master 档策展清单（Replicate schema 声明「任意 MiniMax 系统音色」）；非法 voice 走 4xx 透传。 |
| 4 | elevenlabs v3 语言 | worker 按字符集自动探测 `language_code`；如需用户手选语言，后续暴露 `language` enum。 |
| 5 | 页内营销文案 | `ModelTiersSection` 仍为旧三档 3 列文案（32 locale），本轮未改；hero/FAQ/JSON-LD 的「三档 / 53 voices」表述待后续文案批次同步。 |
| 6 | charLimit 服务端 enforce | 7 档均未做服务端 enforce（与旧三档一致，BFF 计费权威）；如需 wrapper enforce 另行授权。 |
| 7 | BFF 通用 prompt>2000 硬拒 | 存量缺陷（`api.ai.submit.tsx:806-809`），3000+ 套餐实际受限；非本批引入。 |
