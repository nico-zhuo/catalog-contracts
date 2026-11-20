# id-photo-maker 的 seedream 换 OpenRouter 版 · 检查结论与待办清单（2026-11-20）

> 需求（用户）：**把 `/id-photo-maker` 的 seedream 模型全部替换为现在 OpenRouter 的 seedream 模型**（理由：OR 是最新版本）。**先检查、列待办、分配任务，先不执行。**
> 团队：ab-team（backend = image-workers、frontend = arui；契约仓只读）。侦察轮 backend task-14 / frontend task-15 均已完成、零写入。

## 一、现状（id-photo-maker）

- 共 **12 档 = 11 个 Replicate + 1 个 OpenRouter**（唯一 OR 档：`ai-id-photo-maker-flux-3-image-or`）。
- 其中 **4 个 seedream 档全部是 Replicate**（固定 version hash）：

| 现档 | 上游（Replicate） | 计价 | resolution | maxDim | 默认 |
|---|---|---|---|---|---|
| seedream-4（**工具默认档**） | `bytedance/seedream-4` | fixed **9** | 1K/2K/4K（size 2K） | 4096 | ✅ |
| seedream-4-5 | `bytedance/seedream-4.5` | fixed **12** | 2K/4K（size 2K） | 4096 | |
| seedream-5-lite | `bytedance/seedream-5-lite` | fixed **11** | 2K/3K（size 2K, png） | 3072 | |
| seedream-5-pro | `bytedance/seedream-5-pro` | perUnit {1K:14, 2K:28} | 1K/2K（size 1K, png） | 3024 | |

- 工具契约：单张参考图（`maxReferenceImages=1`）、**画幅锁 3:4（不暴露 aspect_ratio）**、无 prompt 参数、`attire` / `background_color` / `resolution`、缺图 422 REFERENCE_REQUIRED。

## 二、OR 侧 seedream 候选（backend 实拉 2026-11-20，全部 HTTP 200）

5 个 OR seedream 模型**全部在役**（无 deprecated），**全部支持 input_references（图生图）**、aspect_ratio 枚举**含 3:4**、provider 均为 Seed（bytedance-seed）：

| OR slug | 最新性 | resolution | input_references | 输出计价 | 输入图计价 | 积分换算（输出，×300 ceil） |
|---|---|---|---|---|---|---|
| **`bytedance-seed/seedream-5-5`** | **2026-11-12（最新）** | 1K/1.5K/2K | 0–10 | base $0.02 / high_res(2K) $0.035 | **$0.008/张** | base **6** / hi **11** / 输入 +3 |
| `bytedance-seed/seedream-5-0-pro` | 2026-08-12 | 1K/1.5K/2K | 0–14 | $0.045 / $0.09 | $0.003/张 | base 14 / hi 27 / 输入 +1 |
| `bytedance-seed/seedream-5-0-lite` | 2026-08-13 | 2K/4K | 0–14 | $0.035 一口价 | 0（免费） | **11** |
| `bytedance-seed/seedream-5-0-flash` | 2026-10-01 | 1K/1.5K/2K | 0–14 | $0.018 一口价 | 0（免费） | **6** |
| `bytedance-seed/seedream-4.5` | 2025-12-23 | 1K/2K/4K | 0–14 | $0.04 一口价 | 0（免费） | **12** |

- **通路已证**：这 5 档已在 100 个池工具 × 5 尾段 = 500 个现役 OR handler 跑 I2I（含 image_urls），非纸面能力；OR 账号正常，Seed provider 属「现存档无需探针」类（L-6），403 风险低。
- 参照契约：`ai-text-to-image-seedream-*` 5 档 handler 与 catalog-contracts《OpenRouter图像模型11档》同表（5-5 perUnit{1K:6,1.5K:6,2K:11}、5-pro-or {1K:14,2K:27}、5-lite-or fixed 11、5-0-flash fixed 6、4-5-or fixed 12）。

## 三、替换映射建议（4 → 4，registry 净 0）

| 旧 Replicate 档（价/能力） | 建议新 OR 档（新 modelId / 上游） | 价格对位 | 能力变化 |
|---|---|---|---|
| seedream-4（9；1K/2K/4K） | **`ai-id-photo-maker-seedream-5-5`**（最新版承载位） | 1K = 6+输入3 = **9 持平**；2K = 11+3 = **14（+5）** | **失去 4K**（5-5 最高 2K） |
| seedream-4-5（12；2K/4K） | `ai-id-photo-maker-seedream-4-5-or`（seedream-4.5） | **12 持平** | 保留 4K，+1K 档 |
| seedream-5-lite（11；2K/3K） | `ai-id-photo-maker-seedream-5-lite-or`（5-0-lite） | **11 持平** | 2K/4K（3K→4K） |
| seedream-5-pro（14/28；1K/2K） | `ai-id-photo-maker-seedream-5-pro-or`（5-0-pro） | **14/27**（2K −1） | 1.5K 上游有但按 canonical 只露 1K/2K |

- **不建议新增 5-0-flash 第 5 档**（fixed 6 虽便宜，但证件照主打身份保真、flash 未验证；如产品要低价档再议，届时 registry 1513、mapping 1651）。
- 若 **4K 是硬需求**：`seedream-4` 改映 `seedream-4-5-or`（保 4K，价 9→12），5-5 是否仍作为新顶档另定。
- 旧 id `ai-id-photo-maker-seedream-4 / -4-5 / -5-lite / -5-pro` 标废删除后**永久烧毁**，新 id 见上表（不复用旧 id）。
- 默认档：`canvas-tools` 现默认 `arui-ai-id-photo-maker-seedream-4` → 建议切 **`arui-ai-id-photo-maker-seedream-5-5`，默认分辨率 1K**（9 积分与现默认持平；若沿用旧默认 2K 则 14 积分 +5）。

## 四、技术可行性（backend：零共享文件改动）

- 现役 `ai-id-photo-maker-flux-3-image-or/handler.ts` 已证明 `createOpenRouterImageHandler` 能完整承载本工具契约（无 prompt → transformInput 拼固定基座 prompt；锁 3:4；attire/background_color 注入后 delete；单参考图 clamp；缺图 422 包装）。
- 新 4 档只需逐档单文件改字段：`model_id`/目录、`upstream_model`（OR slug，无 version/cancelAfter）、`param_mapping`（`image_urls→input_references`、`resolution→resolution`，旧档是 image_input/size）、`accepted_params`（image_urls/attire/background_color/resolution）、`defaults`（aspect_ratio 3:4、各档 resolution 默认、`n:1` 必须钉住）、`transformInput`（基座 prompt + attire/background token 逐字沿用旧档、input_references 包装 clamp≤1、比例回退 3:4）、catalog（toolSlug/tierId/falModel/params/sRI/mr1/maxDimension/handlerVersion v1/creditCost）。
- creditCost 建议：5-5 `perUnit {1K:9, 1.5K:9, 2K:14}`（输入 $0.008/张按「恒 1 张参考图」折进表——**不能**用 surcharges，契约要求 paramRef 必须在 catalog.params 而 id-photo 刻意不暴露 image_urls）；4-5-or `fixed 12`；5-lite-or `fixed 11`；5-pro-or `perUnit {1K:14, 2K:27}`（输入 $0.003 按 canonical 吸收；精确版 15/28 待拍板）。
- **零共享文件改动**：`shared/openrouter-image-handler.ts` / `src/openrouter.ts` / r2 / kv / index.ts 均不动（无需授权申请）。

## 五、前端触点（frontend 侦察，行号为当前 HEAD）

| # | 文件:行 | 改动 |
|---|---|---|
| 1 | `app/routes/api.ai.submit.bff/model-id-mapping.ts:982-985` | 删旧 4 映射 + 加新 4 映射（mapping 总数 1650 不变） |
| 2 | `app/config/canvas-tools.ts:109-112`（MODEL_I18N_KEY_MAP 4 条）+ `:1121`（defaultModelId） | 展示名 key 按新尾段改（复用既有 key，**locales 零改动**）+ 默认档切 `seedream-5-5` |
| 3 | `app/config/model-branding.ts:685-708` | 4 条 seedream 条目按新 modelId 重建（沿 id-photo 先例不挂 descriptionKey；icon/vendor 复用 seedream 品牌资产） |
| 4 | `app/lib/generation-queue.server.ts:221-235` | `IMAGE_ASYNC_MODEL_IDS` 新增 4 条（OR 同步但 id-photo 为显式登记，11min 阈值防僵尸误杀）；旧 4 条保留至 in-flight 排空后再删 |
| 5 | `app/config/replicate-tier-tools.ts:990-999` | legacy remap：旧烧毁 id 的 4 条 client + 4 条 catalog 形态映射改指新档（现 `standard→seedream-4` 目标须改） |
| 6 | `app/config/tools.ts:774` + 2 份 docs | 注释/文档表更新（非阻塞） |
| — | 零改动 | **locales（6 个展示名 key 32/32 齐）**、premium（旧/新均 premium）、TEXT_STRENGTH（新尾段已在榜）、池表、hero |

## 六、数字与门禁

| 项 | 现值 | 替换后（范围 A：仅 id-photo-maker） |
|---|---|---|
| image-workers registry | 1512 | → 1516（+4 新）→ 标废旧 4（verify 跳过 deprecated）→ 删旧目录 **1512** |
| guard tokens | 1567 | → 1571 → **1567** |
| KV | 1512 | sync 1516（4 片 500/500/500/16）→ 最终 1512 + **手删 4 个旧 KV key**（catalog 无 TTL） |
| tests | 118 | 118（+可选 1 个静态契约测试） |
| arui mapping / branding / premium / snapshot | 1650 / 1650 / 84 / 1650 | **全部不变** |
| `verify:catalog-mapping` | hard fail 0 / soft warn 45 | 窗口期 soft warn 45→**49**（非阻断），收口后回 45 |
| 范围 B（家族 5 工具 20 档） | — | registry 1512→1532→1512；guard 1567→1587→1567；前端触点 ×5 |

## 七、时序（§8.4，不可先删旧）

1. backend 新增 4 个 OR handler → 门禁 → push/Deploy + sync（KV 1516，软 warn 无害）。
2. frontend 单 commit：**删旧 4 映射 + 加新 4 映射 + 默认档切 5-5 + branding/async/remap** → CI（此时 mapping ⊆ KV ✓）。
3. backend 旧 4 档标 `deprecated` + `deprecated_alternatives`（指向新档）→ push/Deploy（verify 允许 deprecated 跳过）。
4. 等待旧档 in-flight 排空（沿用 b9c451489 先例：删档完成且排空后才移除前端阈值行）。
5. backend 删旧 4 目录 + KV `wrangler kv key delete` 清 4 个旧 key；frontend 移除旧 4 条 IMAGE_ASYNC 行 → 收口。

## 八、决策点（执行前需拍板）

| # | 项 | 建议 |
|---|---|---|
| **D1** | **范围**：仅 id-photo-maker（4 档）vs 家族 5 工具（id-photo / passport×2 / headshot / photo-enhancer，20 档） | **仅 id-photo-maker（用户原话范围）**；家族统一另立批次（否则家族内版本不一致，需产品接受） |
| **D2** | 默认档 / 默认分辨率 | `seedream-5-5` + 默认 **1K**（9 积分，与现默认价持平）；2K 则 14 积分 |
| **D3** | 4K 是否硬需求 | 若必须保 4K：`seedream-4` 改映 `seedream-4-5-or`（9→12 积分）；否则按建议映 5-5（丢 4K、默认价持平） |
| D4 | 是否新增 5-0-flash 低价档（fixed 6） | 不建议（证件照身份保真未验证）；要则 registry 1513 / mapping 1651 |
| D5 | 5-0-pro 积分口径 | `14/27`（按 canonical 吸收输入 $0.003）；精确含输入用 `15/28` |
| D6 | docs 落点 | `docs/id-photo-maker.md` + `docs/id-photo-maker 模型.md` 改 4 行；批次记录进 catalog-contracts |

## 九、风险

1. **质量风险**：OR seedream 支持 I2I 已证（endpoints + 500 现役 handler），但**证件照身份保真 / 3:4 构图质量未实测**——上线后需首单实拍核对（尤其 5-5 / flash）。
2. **4K 能力**：5-5 最高 2K，映 5-5 会丢 4K（D3）。
3. **计价**：5-5 输入 $0.008/张必须折进 creditCost（不能 surcharges，契约 refine 会拦）；误算会资损。
4. **异步阈值**：新 4 档必须登记 IMAGE_ASYNC（11min），否则 3min 僵尸先退款后出图（P0）。
5. **时序**：必须先加新再删旧（前端 mapping ⊆ KV 硬校验）；窗口期 soft warn 49 可接受。
6. **旧 id 烧毁**：旧 4 个 Replicate seedream modelId 删除后永久不可复用（历史画布走 legacy remap 到新档）。
7. 范围 B 家族统一会增加 20 档改动与 5 工具前端触点（D1）。

## 十、任务分配（先不执行；拍板后派发）

| 任务 | 负责 | 内容 | 依赖 |
|---|---|---|---|
| **T1**（task-16） | backend | 新建 4 个 OR seedream handler（按 §三/§四 契约，含 creditCost 折价、单参考图 clamp、锁 3:4、422 包装）；门禁 registry 1516；本地 hold | D1/D2/D3/D4/D5 拍板 |
| **T2**（task-17） | frontend | §五 触点：mapping −4/+4、默认档切 5-5、branding 4 条、IMAGE_ASYNC +4、legacy remap 8 条；单 commit | T1 上线（KV 1516）+ 拍板 |
| **T3**（task-18） | backend | 旧 4 档标废 → 排空 → 删目录 + 清 4 个 KV key | T2 CI 绿 + 排空 |
| **T4**（task-19） | frontend | 收口：移除旧 4 条 IMAGE_ASYNC、docs 更新、数字核对（mapping 1650 / registry 1512 / soft warn 回 45） | T3 |
| **T5**（Lead） | Lead | 时序放行 + CI 全绿 + 文档终态 + 首单实拍核对（需授权实测） | T1–T4 |

---
*创建：Lead 2026-11-20 12:0x；本轮只检查与分配，未执行任何改动。*
