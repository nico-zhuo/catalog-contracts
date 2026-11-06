# ai-character-voice 模型对接文档（v2：Replicate 字符计费模型池 8 档）

> 2026-11-06 v2。`ai-character-voice` 采用 **Replicate 官方模型池，一模型一档，用户自选**；
> **准入规则：只上 Replicate billing metric = `character_input_count`（按输入字符计费）的模型**；
> token 计费（`token_input_count` / `token_input_count + token_output_count`）模型不上/已移除。
> **积分统一：`credits = ceil(上游 USD × 300)`**。旧 fal 三档与 v1 的 token 计费 5 档均已 `deprecated`（410 + alternatives，`/status` 仍服务在途）。
> 参数以 Replicate 模型页 Input schema 为准（2026-11-06 抓取），并以 worker 实际 `describe()` 输出校验。

**稳定契约**：`modelId` 发布后永久不变；`falModel` 字段语义为「底层模型」，填 Replicate slug，可随底层升级变化，不影响前端。

---

## 1. 八档总览

| # | catalog modelId | client modelId（前端） | 上游 Replicate slug | 定位 | 参数 | 音色数 | charLimit 档 | 积分（1000/2000/3000/4000/5000） |
|---|---|---|---|---|---|---|---|---|
| 1 | `ai-character-voice-elevenlabs-turbo-v2-5` | `arui-character-voice-elevenlabs-turbo-v2-5` | `elevenlabs/turbo-v2.5` | ElevenLabs Turbo v2.5：默认档：低延迟主力（32 语种 / 26 音色） | prompt,voice,speed,charLimit | 26 | 5 | 15/30/45/60/75 |
| 2 | `ai-character-voice-elevenlabs-flash-v2-5` | `arui-character-voice-elevenlabs-flash-v2-5` | `elevenlabs/flash-v2.5` | ElevenLabs Flash v2.5：极低延迟（32 语种 / 26 音色） | prompt,voice,speed,charLimit | 26 | 5 | 15/30/45/60/75 |
| 3 | `ai-character-voice-elevenlabs-v3` | `arui-character-voice-elevenlabs-v3` | `elevenlabs/v3` | ElevenLabs v3：表达力最强（alpha，70+ 语种 / 26 音色） | prompt,voice,speed,charLimit | 26 | 5 | 30/60/90/120/150 |
| 4 | `ai-character-voice-elevenlabs-v2-multilingual` | `arui-character-voice-elevenlabs-v2-multilingual` | `elevenlabs/v2-multilingual` | ElevenLabs Multilingual v2：长文/高保真（29 语种 / 26 音色） | prompt,voice,speed,charLimit | 26 | 5 | 30/60/90/120/150 |
| 5 | `ai-character-voice-qwen3-tts` | `arui-character-voice-qwen3-tts` | `qwen/qwen3-tts` | Qwen3 TTS：中文强 / 9 预置音色 / 10 语种 | prompt,voice,charLimit | 9 | 5 | 6/12/18/24/30 |
| 6 | `ai-character-voice-inworld-realtime-tts-2` | `arui-character-voice-inworld-realtime-tts-2` | `inworld/realtime-tts-2` | Inworld Realtime TTS 2：高表达（16+90 语种 / 4 音色） | prompt,voice,charLimit | 4 | 2 | 8/15 |
| 7 | `ai-character-voice-inworld-realtime-tts-1-5-max` | `arui-character-voice-inworld-realtime-tts-1-5-max` | `inworld/realtime-tts-1.5-max` | Inworld Realtime TTS 1.5 Max：1.5 旗舰（15 语种 / 4 音色） | prompt,voice,charLimit | 4 | 2 | 11/21 |
| 8 | `ai-character-voice-inworld-realtime-tts-1-5-mini` | `arui-character-voice-inworld-realtime-tts-1-5-mini` | `inworld/realtime-tts-1.5-mini` | Inworld Realtime TTS 1.5 Mini：最快/最便宜（15 语种 / 4 音色） | prompt,voice,charLimit | 4 | 2 | 5/9 |

- catalog `tierId` = modelId 尾段；`workerKind`=`audio-workers`；`schemaVersion`=`1.2.0`；`maxDimension`=1；`cancelAfter`=`4m`（< BFF TTS 僵尸阈值 5min，踩坑 #5）。
- **默认档（产品拍板 2026-11-06）**：`ai-character-voice-elevenlabs-turbo-v2-5`（15 积分/1K、26 音色、32 语种）。

---

## 2. 参数暴露总览

| 参数 | 含义 | 暴露档 |
|---|---|---|
| `prompt` | 待合成文本（必填） | 全 8 档 |
| `voice` | 音色 enum（26 / 4 / 9 个） | 全 8 档 |
| `speed` | 语速 | 仅 ElevenLabs 4 档（0.7–1.2）；qwen / inworld 不暴露 |
| `charLimit` | 计费套餐 enum（不转发上游） | 全 8 档（inworld 3 档仅 1000/2000） |

**隐藏参数（handler 写死进 defaults，UI 看不到、API 也传不进）**

- ElevenLabs ×4：`stability=0.5`、`similarity_boost=0.75`、`style=0`、`language_code`（handler 按字符集自动探测）
- Inworld Realtime TTS 2.0：`language=auto`、`temperature=0`、`audio_format=mp3`、`sample_rate=48000`、`text_normalization=auto`、`speaking_rate=0`
- Inworld Realtime TTS 1.5 Max/Mini：`temperature=0`、`audio_format=mp3`、`sample_rate=48000`、`text_normalization=auto`、`speaking_rate=0`（1.5 schema 无 language 入参）
- Qwen3 TTS：`mode=custom_voice`、`language=auto`、`style_instruction=""`；不接 `reference_audio` / `reference_text` / `voice_description`

**voice 白名单**：只接受 catalog enum 内音色；克隆 voice_id 不暴露（非法 voice → 上游 4xx → `UPSTREAM_4XX` 透传，不计费）。

---

## 3. 公共对接信息

- Base URL：`https://audio-workers.<your-domain>`（BFF 配置，前端不直连）
- Auth：`Authorization: Bearer <AUDIO_WORKERS_API_KEY>`
- Content-Type：`application/json`

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

**错误契约**：Replicate 4xx → 上游 status + `{ error:"UPSTREAM_4XX", upstream:"replicate", upstreamStatus, detail }`；token 缺失 → 502 `REPLICATE_AUTH`；5xx → 500 `INTERNAL`。

**轮询**：1–2s 间隔；上游 `Cancel-After=4m` < BFF TTS 僵尸 5min（踩坑 #5 成对约束）。完成后 `audio.url` 指向 R2 永久地址（Replicate 输出 URL 仅 24h）。

**catalog KV key**：`model:audio:<modelId>`（无 TTL，CI post-deploy sync）。BFF 直读 KV 聚合；跨账号 `GET /__catalog/read`。

---

## 4. 逐档参数与音色

### ElevenLabs Turbo v2.5

- catalog modelId：`ai-character-voice-elevenlabs-turbo-v2-5` / client modelId：`arui-character-voice-elevenlabs-turbo-v2-5` / tierId：`elevenlabs-turbo-v2-5`
- 上游：`elevenlabs/turbo-v2.5`；上游价：$0.05 / 1K 字符；语言：32；语速参数：0.7–1.2
- handlerVersion：`v1`；定位：默认档：低延迟主力（32 语种 / 26 音色）

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Rachel` | 26 个（见下） |
| `speed` | number | — | `1` | 0.7 ~ 1.2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000 |

**voice 清单（26）**

`Rachel` · `Drew` · `Clyde` · `Paul` · `Aria` · `Domi` · `Dave` · `Roger` · `Fin` · `Sarah` · `James` · `Jane` · `Juniper` · `Arabella` · `Hope` · `Bradford` · `Reginald` · `Gaming` · `Austin` · `Kuon` · `Blondie` · `Priyanka` · `Alexandra` · `Monika` · `Mark` · `Grimblewood`

**creditCost（perUnit / charLimit，×300 口径）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 15 | 30 | 45 | 60 | 75 |

- 不暴露参数：`stability=0.5`、`similarity_boost=0.75`、`style=0`、`language_code`（handler 按字符集自动探测）

---

### ElevenLabs Flash v2.5

- catalog modelId：`ai-character-voice-elevenlabs-flash-v2-5` / client modelId：`arui-character-voice-elevenlabs-flash-v2-5` / tierId：`elevenlabs-flash-v2-5`
- 上游：`elevenlabs/flash-v2.5`；上游价：$0.05 / 1K 字符；语言：32；语速参数：0.7–1.2
- handlerVersion：`v1`；定位：极低延迟（32 语种 / 26 音色）

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Rachel` | 26 个（见下） |
| `speed` | number | — | `1` | 0.7 ~ 1.2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000 |

**voice 清单（26）**

`Rachel` · `Drew` · `Clyde` · `Paul` · `Aria` · `Domi` · `Dave` · `Roger` · `Fin` · `Sarah` · `James` · `Jane` · `Juniper` · `Arabella` · `Hope` · `Bradford` · `Reginald` · `Gaming` · `Austin` · `Kuon` · `Blondie` · `Priyanka` · `Alexandra` · `Monika` · `Mark` · `Grimblewood`

**creditCost（perUnit / charLimit，×300 口径）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 15 | 30 | 45 | 60 | 75 |

- 不暴露参数：`stability=0.5`、`similarity_boost=0.75`、`style=0`、`language_code`（handler 按字符集自动探测）

---

### ElevenLabs v3

- catalog modelId：`ai-character-voice-elevenlabs-v3` / client modelId：`arui-character-voice-elevenlabs-v3` / tierId：`elevenlabs-v3`
- 上游：`elevenlabs/v3`；上游价：$0.10 / 1K 字符；语言：70+；语速参数：0.7–1.2
- handlerVersion：`v2`；定位：表达力最强（alpha，70+ 语种 / 26 音色）

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Rachel` | 26 个（见下） |
| `speed` | number | — | `1` | 0.7 ~ 1.2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000 |

**voice 清单（26）**

`Rachel` · `Drew` · `Clyde` · `Paul` · `Aria` · `Domi` · `Dave` · `Roger` · `Fin` · `Sarah` · `James` · `Jane` · `Juniper` · `Arabella` · `Hope` · `Bradford` · `Reginald` · `Gaming` · `Austin` · `Kuon` · `Blondie` · `Priyanka` · `Alexandra` · `Monika` · `Mark` · `Grimblewood`

**creditCost（perUnit / charLimit，×300 口径）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 30 | 60 | 90 | 120 | 150 |

- 不暴露参数：`stability=0.5`、`similarity_boost=0.75`、`style=0`、`language_code`（handler 按字符集自动探测）

---

### ElevenLabs Multilingual v2

- catalog modelId：`ai-character-voice-elevenlabs-v2-multilingual` / client modelId：`arui-character-voice-elevenlabs-v2-multilingual` / tierId：`elevenlabs-v2-multilingual`
- 上游：`elevenlabs/v2-multilingual`；上游价：$0.10 / 1K 字符；语言：29；语速参数：0.7–1.2
- handlerVersion：`v1`；定位：长文/高保真（29 语种 / 26 音色）

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Rachel` | 26 个（见下） |
| `speed` | number | — | `1` | 0.7 ~ 1.2, step 0.1 |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000 |

**voice 清单（26）**

`Rachel` · `Drew` · `Clyde` · `Paul` · `Aria` · `Domi` · `Dave` · `Roger` · `Fin` · `Sarah` · `James` · `Jane` · `Juniper` · `Arabella` · `Hope` · `Bradford` · `Reginald` · `Gaming` · `Austin` · `Kuon` · `Blondie` · `Priyanka` · `Alexandra` · `Monika` · `Mark` · `Grimblewood`

**creditCost（perUnit / charLimit，×300 口径）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 30 | 60 | 90 | 120 | 150 |

- 不暴露参数：`stability=0.5`、`similarity_boost=0.75`、`style=0`、`language_code`（handler 按字符集自动探测）

---

### Qwen3 TTS

- catalog modelId：`ai-character-voice-qwen3-tts` / client modelId：`arui-character-voice-qwen3-tts` / tierId：`qwen3-tts`
- 上游：`qwen/qwen3-tts`；上游价：$0.02 / 1K 字符；语言：10；语速参数：—
- handlerVersion：`v1`；定位：中文强 / 9 预置音色 / 10 语种

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Serena` | 9 个（见下） |
| `charLimit` | enum | — | `1000` | 1000 / 2000 / 3000 / 4000 / 5000 |

**voice 清单（9）**

`Aiden` · `Dylan` · `Eric` · `Ono_anna` · `Ryan` · `Serena` · `Sohee` · `Uncle_fu` · `Vivian`

**creditCost（perUnit / charLimit，×300 口径）**

| charLimit | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|
| credits | 6 | 12 | 18 | 24 | 30 |

- 不暴露参数：`mode=custom_voice`、`language=auto`、`style_instruction=""`；不接 `reference_audio` / `reference_text` / `voice_description`

---

### Inworld Realtime TTS 2

- catalog modelId：`ai-character-voice-inworld-realtime-tts-2` / client modelId：`arui-character-voice-inworld-realtime-tts-2` / tierId：`inworld-realtime-tts-2`
- 上游：`inworld/realtime-tts-2`；上游价：$0.025 / 1K 字符；语言：16+90；语速参数：—
- handlerVersion：`v2`；定位：高表达（16+90 语种 / 4 音色）

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Ashley` | 4 个（见下） |
| `charLimit` | enum | — | `1000` | 1000 / 2000 |

**voice 清单（4）**

`Ashley` · `Dennis` · `Alex` · `Darlene`

**creditCost（perUnit / charLimit，×300 口径）**

| charLimit | 1000 | 2000 |
|---|---|---|
| credits | 8 | 15 |

- 不暴露参数：`language=auto`、`temperature=0`、`audio_format=mp3`、`sample_rate=48000`、`text_normalization=auto`、`speaking_rate=0`

---

### Inworld Realtime TTS 1.5 Max

- catalog modelId：`ai-character-voice-inworld-realtime-tts-1-5-max` / client modelId：`arui-character-voice-inworld-realtime-tts-1-5-max` / tierId：`inworld-realtime-tts-1-5-max`
- 上游：`inworld/realtime-tts-1.5-max`；上游价：$0.035 / 1K 字符；语言：15；语速参数：—
- handlerVersion：`v1`；定位：1.5 旗舰（15 语种 / 4 音色）

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Ashley` | 4 个（见下） |
| `charLimit` | enum | — | `1000` | 1000 / 2000 |

**voice 清单（4）**

`Ashley` · `Dennis` · `Alex` · `Darlene`

**creditCost（perUnit / charLimit，×300 口径）**

| charLimit | 1000 | 2000 |
|---|---|---|
| credits | 11 | 21 |

- 不暴露参数：`temperature=0`、`audio_format=mp3`、`sample_rate=48000`、`text_normalization=auto`、`speaking_rate=0`（1.5 schema 无 language 入参）

---

### Inworld Realtime TTS 1.5 Mini

- catalog modelId：`ai-character-voice-inworld-realtime-tts-1-5-mini` / client modelId：`arui-character-voice-inworld-realtime-tts-1-5-mini` / tierId：`inworld-realtime-tts-1-5-mini`
- 上游：`inworld/realtime-tts-1.5-mini`；上游价：$0.015 / 1K 字符；语言：15；语速参数：—
- handlerVersion：`v1`；定位：最快/最便宜（15 语种 / 4 音色）

**参数 schema**

| name | type | 必填 | 默认 | 约束 |
|---|---|---|---|---|
| `prompt` | text | ✅ | `—` | 文本 |
| `voice` | enum | — | `Ashley` | 4 个（见下） |
| `charLimit` | enum | — | `1000` | 1000 / 2000 |

**voice 清单（4）**

`Ashley` · `Dennis` · `Alex` · `Darlene`

**creditCost（perUnit / charLimit，×300 口径）**

| charLimit | 1000 | 2000 |
|---|---|---|
| credits | 5 | 9 |

- 不暴露参数：`temperature=0`、`audio_format=mp3`、`sample_rate=48000`、`text_normalization=auto`、`speaking_rate=0`（1.5 schema 无 language 入参）

---

## 5. 积分换算口径（统一 ×300）

`credits = ceil(上游成本 USD × 300)`。TTS 按 1K 输入字符计费（`character_input_count`）→ 套餐表值 = `ceil(单价每 1K 字符 × 300 × 套餐千字符数)`。

| 档 | 上游单价 | 1000 | 2000 | 3000 | 4000 | 5000 |
|---|---|---|---|---|---|---|
| ElevenLabs Turbo v2.5 | $0.05 / 1K 字符 | 15 | 30 | 45 | 60 | 75 |
| ElevenLabs Flash v2.5 | $0.05 / 1K 字符 | 15 | 30 | 45 | 60 | 75 |
| ElevenLabs v3 | $0.10 / 1K 字符 | 30 | 60 | 90 | 120 | 150 |
| ElevenLabs Multilingual v2 | $0.10 / 1K 字符 | 30 | 60 | 90 | 120 | 150 |
| Qwen3 TTS | $0.02 / 1K 字符 | 6 | 12 | 18 | 24 | 30 |
| Inworld Realtime TTS 2 | $0.025 / 1K 字符 | 8 | 15 | — | — | — |
| Inworld Realtime TTS 1.5 Max | $0.035 / 1K 字符 | 11 | 21 | — | — | — |
| Inworld Realtime TTS 1.5 Mini | $0.015 / 1K 字符 | 5 | 9 | — | — | — |

> 取整规则 `ceil`（如 inworld-2 7.5→8、1.5-max 10.5→11、1.5-mini 4.5→5）。保留档本轮已同步改表 + `handlerVersion v2`。

---

## 6. 已移除 / 弃用档（§8.4）

| 旧 modelId | 移除原因 | deprecated_alternatives | 前端 remap |
|---|---|---|---|
| `gemini-3-8-flash-tts` | 输入+输出 token 双计费（成本随音频时长波动，非字符线性） | `ai-character-voice-elevenlabs-v3` | arui-character-voice-gemini-3-8-flash-tts → ...-elevenlabs-v3 |
| `minimax-speech-2-8-turbo` | `token_input_count` 计费（非字符） | `ai-character-voice-elevenlabs-turbo-v2-5` | ...-minimax-speech-2-8-turbo → ...-elevenlabs-turbo-v2-5 |
| `minimax-speech-2-8-hd` | 同上 | `ai-character-voice-elevenlabs-v2-multilingual` | ...-minimax-speech-2-8-hd → ...-elevenlabs-v2-multilingual |
| `minimax-speech-2-6-turbo` | 同上 | `ai-character-voice-elevenlabs-flash-v2-5` | ...-minimax-speech-2-6-turbo → ...-elevenlabs-flash-v2-5 |
| `minimax-speech-2-6-hd` | 同上 | `ai-character-voice-elevenlabs-v2-multilingual` | ...-minimax-speech-2-6-hd → ...-elevenlabs-v2-multilingual |
| `kokoro-tts-en-us` | v1 已弃用（fal 旧 standard） | `ai-character-voice-elevenlabs-v3` | arui-character-voice-standard → ...-elevenlabs-turbo-v2-5（remap 水位） |
| `elevenlabs-turbo` | v1 已弃用（fal 旧 pro） | `ai-character-voice-elevenlabs-turbo-v2-5` | arui-character-voice-pro → ...-elevenlabs-v3 |
| `minimax-speech-02-hd` | v1 已弃用（fal 旧 master） | `ai-character-voice-elevenlabs-v2-multilingual` | arui-character-voice-master → ...-elevenlabs-v2-multilingual |

- 8 个 deprecated 档 KV entry 保留（无 TTL），`/generate` 返 **410 `MODEL_DEPRECATED`** + alternatives；`/status` 仍服务在途。alternatives 全部指向本轮 active 8 档。

---

## 7. 部署与同步（v2）

- commit `f185b95`；Deploy run：https://github.com/nico-zhuo/audio-workers/actions/runs/42162021857
- sync：`[sync] expected 25 entries` → `written: 25 / 25` → `✅ …fingerprint✓`
- verify：`✅ catalog 校验通过(25 entries,8 deprecated skipped)`（25 = 17 active + 8 deprecated）
- 运行时 secret（人工）：`wrangler secret put REPLICATE_API_TOKEN`；缺失时 8 档 `/generate` 返 502 `REPLICATE_AUTH`（deploy/sync 不受影响）。

---

## 8. 前端消费说明

1. 档位列表 = BFF catalog（8 档 active，deprecated 自动过滤）；client modelId 经映射表暴露。
2. 默认档：`arui-character-voice-elevenlabs-turbo-v2-5`（`canvas-tools.ts` 显式配置，不依赖字典序）。
3. 显示名：`locales/<lang>/ai-canvas.json` → `models.<MODEL_I18N_KEY_MAP key>.name`；数字尾段必须显式映射。
4. 历史画布：旧 client/catalog modelId 经 `remapLegacyTierModelId` 落到同水位新档；410 alternatives 全部可解析。
5. 超时：前端 TTS 僵尸阈值 5min 不变（与后端 Cancel-After 4m 成对）。
6. **图标（本轮未做，后续批次）**：audio 档位在 `model-branding.ts` 无条目 → 面板走朴素 `CanvasDropdown`（无图标/供应商分组）。补 `public/brand/{elevenlabs,inworld,qwen}.svg` + 8 条 `{icon,vendor}` 即可切换富面板（见 `docs/ai-character-voice-代办清单-v2.md` §5）。

---

## 9. 风险 / 待收口

| # | 项 | 说明 |
|---|---|---|
| 1 | `REPLICATE_API_TOKEN` | 用户人工 `wrangler secret put`；配置前 8 档 502。 |
| 2 | qwen3 文本上限 | 上游页面未标注，先按 1000–5000 套餐；超限走 `UPSTREAM_4XX` 透传（不计费）。 |
| 3 | inworld 上限 2000 字 | charLimit 仅 1000/2000。 |
| 4 | 无服务端 charLimit enforce / voice 白名单 | 与旧档一致（BFF 计费权威；非法 voice 由上游 4xx 透传）；如需加固另开授权。 |
| 5 | 图标缺失 | 本轮按用户决定未做，见 §8.6。 |
| 6 | 页内营销文案 | `ModelTiersSection` / hero / FAQ / JSON-LD 仍为旧三档表述，后续文案批次同步。 |
