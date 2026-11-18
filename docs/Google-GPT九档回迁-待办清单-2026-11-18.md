# Google/GPT 九档回迁(ai-text-to-image)· 检查结论与代办清单(2026-11-18)

> 依据:**2026-11-18 平台政策终版**(OR/Replicate 并用、OR 为主、Google/GPT 恢复候选)——见 18 档清单 §十四政策块。本文只列代办并分配,**不执行**。
> 先例与模板:18 档清单 §14.4 回迁预案 / §14.5 删除批执行终态。

## 一、检查结论(2026-11-18 09:0x,全只读)

1. **删除批终态复核**(image-workers):`b2d73eb`(标废)→ `a3b722d`(删目录,registry 1603→1594)→ `673aeea`(测试收缩)→ KV 9 孤儿 key 已清(deleted_ok=9)。与 §14.5 记录一致。
2. **被删 9 档清单**(`a3b722d` diff-filter=D 实拉):
   - nano-banana 系 5:`nano-banana-or` / `-2-or` / `-2-1-or` / `-2-lite-or` / `-pro-or`
   - gpt 系 4:`gpt-image-2-5-sunburst-or` / `gpt-image-2-5-flare` / `gpt-image-2-6-sunburst` / `gpt-image-2-6-flare`
   - 外加共享目录 `gpt-image-family`(9 档之外,回迁时一并 checkout)
3. **与预案假设的出入(重要)**:
   - §15 扩模 A 类**已执行**:qwen-image-3 / 3-pro、recraft-v4.1 / flash-v2 / vector 已上线,ai-text-to-image 现 15 档(flux×4 / grok / qwen×2 / recraft×3 / seedream×5,默认 klein)。回迁后 15→24 档,前端断言数以届时为准,不能照抄历史数字。
   - registry 基线已变:换源批 C/D 后 registry=1442,回迁后 1442+9=1451。
   - arui 已推进到批 D 收口(LEGACY 尾段 remap 表启用),回迁的 remap 触点落在**新表结构**上,不是删除批时的旧结构。
4. ~~**最大前置风险未消除**~~→**已探明并改道(见 §一.5)**:11-16 的 403 是 provider 中国区限制。
5. **✅ T1 探针终态(2026-11-18 09:13,Lead 执行,chat 通路最小调用)**:
   - `google/gemini-3.6-flash` → **HTTP 403**「violation of provider Terms of Service」(与 11-16 同款错误体)
   - `openai/gpt-4o-mini` → **HTTP 403**(同上)
   - 对照组 `deepseek/deepseek-chat`(DeepInfra)→ **200 正常**——key/账户无恙,封锁精确落在 Google/OpenAI 两家 provider。
   - **结论:OR 的 Google/GPT 通路仍被区域封锁。用户据此拍板路由细则:Google/GPT 系模型走 Replicate 上游,其余以 OR 为主。**
6. **Replicate 通路现状(可用性依据)**:REPLICATE_KEY 现役,id-photo / passport / headshot / photo-enhancer 等工具的 nano-banana / gpt-image Replicate 档一直在线服务——**模板 = 本仓现役 handler(id-photo 系现成可复制,含 gpt-image family 共享层)**,不需要从 git 历史 checkout。
7. **实测资产在档**:OR 时代 33 组定价实测表对 Replicate 档**不适用**(口径不同);Replicate 侧定价沿用现役档先例(gpt per quality、nano-banana perUnit(resolution) {1K:11,2K:16,4K:35} 等,见 id-photo 系 handler)。

## 二、决策点(D 组)——✅ 2026-11-18 09:1x 用户拍板「按建议」

| # | 项 | 拍板结果 |
|---|---|---|
| D-1 | id 策略 | **重建=新档**;且**上游改走 Replicate**(OR 通路 403 探针实证仍封锁,见 §一.5;Replicate google/gpt 档现役可用,§一.6)。旧 id 烧毁规则保持;命名不带 `-or`(非 OR 上游),细则 T2 开工时按家族规则定 |
| D-2 | LEGACY remap / 历史画布 | **维持现状**(指向 flux-3-image-or / seedream 同水位,不指回) |
| D-3 | 时序 | ~~探针先行~~ 探针已完成(403 实证→改道 Replicate,无需再探:REPLICATE_KEY 现役档即活体证据)→ T2/T3 并行备好 hold → arui 先行 push(#4) |
| D-4 | scope | **只回迁 9 档**;google/gpt 新候选扩充另立批次 |

## 三、任务分配(已上共享任务板,先不执行)

| 任务 | 负责 | 写域 | 依赖 |
|---|---|---|---|
| T1 探针:Google/OpenAI provider 通路验证 | Lead | —(已完成,§一.5) | ✅ 终态:403 仍在 → 改道 Replicate |
| T2 回迁 9 handler(**Replicate 上游**):以现役 id-photo 系 google/gpt Replicate handler 为模板(含 gpt-image family 共享层);按 D-1 定 id(不带 -or);定价沿用 Replicate 现役先例(gpt per quality / NB perUnit(resolution));handlerVersion v1;门禁全绿 → hold | backend(image-workers) | image-workers/src/models/** | D-1 已拍板,可开工 |
| T3 arui 触点:mapping 9 行、IMAGE_ASYNC_MODEL_IDS 9 行(P0 漏加=资损;Replicate 异步档同样适用)、TEXT_STRENGTH、canvas-tools、branding canonical 8 条核验(应仍在)、断言数按 24 档重算 → hold | frontend(arui) | arui/app/config/** | D-1 拍板(定 id 后开写) |
| T4 收口:双仓 push 后 KV snapshot 对账(1451/零孤儿)、本文档回填执行终态、踩坑集锦/CHANGELOG 视需要 | Lead | catalog-contracts/docs | T2+T3 |

## 四、波次(拍板后)

波0 探针(T1)→ 波1 拍板 D-1~D-4 → 波2 backend T2 + frontend T3 并行备好 hold → 波3 探针绿→ arui 先行 push(#4 时序)→ image-workers push(KV 自动翻转)→ 波4 Lead 收口 T4。

## 五、Replicate 改道版检查终态与执行清单(2026-11-18 09:1x,检查完毕,未执行)

> 用户指令:Google/GPT 用 Replicate 平台 → 本节为改道后的落地检查;§一~§四中与 OR 模板/实测表相关的条目以本节为准。

### 5.1 新增检查结论

1. **模板就在本仓现役**:id-photo / passport / headshot / photo-enhancer 系 30+ 档 google/gpt Replicate handler = 老 t2i Replicate 档的逐字移植,注释明写「复用 ai-text-to-image-xxx 的上游与参数契约」「积分与 ai-text-to-image-xxx 一致」——**上游 slug / version hash / 参数契约 / 计价数字全套现成**,无需从 git 历史 checkout。工厂:`createReplicateImageHandler`(`src/shared/replicate-image-handler.ts`)。
2. **9 档上游在 Replicate 全部可用**(API 实拉 2026-11-18 09:17,REPLICATE_KEY):
   - nano-banana 系 5:`google/nano-banana` / `-2` / `-2.1` / `-2-lite` / `-pro`(仓内现役引用 ×6)
   - gpt 系 4:`openai/gpt-image-2.5-flare` / `2.6-sunburst` / `2.6-flare` 均 **200**(仓内无先例,T2 需新拉 version hash + billingConfig);`gpt-image-2.5-sunburst` 现役 ×6
3. **branding canonical 前身条目确认仍在**(arui `model-branding.ts:299-350`:`arui-ai-text-to-image-nano-banana` 系 5 条 + gpt 系)——前端 branding 零新增,直接复用。
4. **命名空间**:t2i 的 google/gpt 旧 id 两代均已烧毁(Replicate 代 deleted 于换源批 C;`-or` 代 deleted 于 a3b722d)→ **9 档全部需要全新尾段**。仓内无 Replicate 换源后缀先例,新约定待定(建议 `-rp`,如 `nano-banana-2-1-rp` / `gpt-image-2-5-sunburst-rp`;点号→短横线照抄先例)。
5. **计价口径**:沿用 Replicate 现役先例(gpt perUnit(quality) 如 4/14/38;nano-banana-2-1 perUnit(resolution) {1K:12,2K:21,4K:48}——注意 id-photo 注释是 12/21/48,与 18 档清单旧引 11/16/35 不同版本,**以现役 handler 为准**);gpt 2.5-flare / 2.6 两对四档**无先例数字**,T2 必须先读 Replicate billingConfig(踩坑 #6 metric 准入)再定价。
6. **混合上游工具页**:ai-text-to-image 现为 OR 池工具,新 9 档是 Replicate 上游 → 前端池白名单 / model-selection 需确认能否挂 Replicate 档(84 工具 REPLICATE_TIER_TOOL_SLUGS 表不含 t2i),**这是本批最可能的前端结构风险点**。

### 5.2 执行清单(波次)

- **波1 backend(T2=task-3)**:9 档新 handler(模板 = 现役 id-photo 系同上游档;`createReplicateImageHandler`;新尾段按 N-1)→ gpt 2.5-flare/2.6×2 先拉 version+billingConfig 定价 → 门禁(registry 1442→1451 / guard / typecheck / tests)→ 本地 hold。
- **波2 frontend(T3=task-4)**:mapping 9 行 + branding 复用核验 + IMAGE_ASYNC_MODEL_IDS 9 行(P0) + TEXT_STRENGTH + canvas-tools + 池白名单/model-selection 挂载方案(§5.1.6) + 断言按 24 档重算 → hold。
- **波3**:arui 先行 push(#4 时序)→ image-workers push(KV 自动翻转)。
- **波4 Lead(T4=task-1)**:KV snapshot 对账(1451/零孤儿)+ 本文档回填终态 + 踩坑/CHANGELOG 视需要。

### 5.3 新决策点(N 组)

| # | 项 | 建议 |
|---|---|---|
| N-1 | 9 档新尾段命名 | 建议 `-rp` 后缀(与 `-or` 对称,一眼可辨上游);待拍板 |
| N-2 | gpt 2.5-flare / 2.6×2 计价 | T2 读 billingConfig 后按 ×300 换算,页价锚点缺失时标 `≈` 待首账单回填(#11) |
| N-3 | 混合上游挂载 | 若池白名单结构不允许,回退方案 = 显式表行(先例:数字段显式表) |

## 六、执行终态(2026-11-18 09:32,波1+波2 完成,**双仓本地 hold 未 push**)

| 项 | 结果 |
|---|---|
| N-1 拍板 | `-rp` 后缀 ✓ |
| 波1 backend | image-workers `bd15418`:9 档 `-rp` handler(模板 23c733a^ 逐字复用;NB×5 version hash 取现役 id-photo 档;gpt 2.5-flare/2.6×2 新拉 version+billingConfig,per-output-image 计费,积分 4/14/38/75/150 与 15/27/38/75/150,≈ 标注待 #11);门禁 registry 1442→1451 / guard / typecheck / 112 tests 全绿 |
| 波2 frontend | arui `58d312db7`:mapping 9 行 / IMAGE_ASYNC_MODEL_IDS 9 行(P0) / TEXT_STRENGTH +6(沿前身分;3 新档无证据不进榜) / canvas i18n 9 行(6 复用前身 key 零 locale,3 新 key ×32 locale) / branding 9 条 / verify 断言 32→38;typecheck+verify:branding/premium/brand-color/i18n 全绿 |
| 存量债(非本批) | arui `verify:model-selection` 在 buildComparisonAssignment 对空池工具崩溃——**HEAD 干净基线同样复现**,与本批无关,建议另立修复任务 |
| 待办 | ~~波3/波4~~ 已完成,见 §七 |

## 七、波3+波4 执行终态(2026-11-18 09:49,**全批完成上线**)

| 步骤 | 结果 |
|---|---|
| 时序修正 | 本批纯新增,arui verify CI 对 KV 硬校验 → **backend 先行**(「arui 先行」是删档批时序,新增批不适用) |
| image-workers push | `bd15418` → CI 44217495686 ✓ / Deploy 44217495515 ✓;`verify:catalog` **1451 entries 全 active** ✓ |
| arui push | `58d312db7` → verify-model-id-mapping 44217755048 ✓ / Build+deploy 44217754944 ✓ |
| 端到端探针 | `gpt-image-2-5-flare-rp` low/1K/1:1 真实生成 ✓:request 718a7754,status completed,1×PNG 落 R2(image.arui.ai);Replicate 通路+工厂+计费链路全通 |
| 小坑 | `/generate` 探针:IMAGE_WORKERS_URL 带尾斜杠会拼出 `//generate`,路由 regex `^\/generate$` 不匹配 → 无 `what` 字段的裸 NOT_FOUND(易误判为 modelId 不存在);排查时先查 URL 拼接 |
| 遗留 | ① 2.6 系两档积分 15/27/38/75/150 为页价换算(≈),**首账单回填(#11)**;② arui `verify:model-selection` 空池崩溃存量债(§六),另立修复;③ 3 个新 gpt 档 descriptionKey 暂复用家族键,本地化细化另批 |

---
*创建:Lead 2026-11-18 09:08;改道修订 09:13;落地检查 09:18;波1+2 hold 09:32;波3+4 上线 09:49。终态:9 档 -rp 全部上线,KV 1451,端到端实证。*
