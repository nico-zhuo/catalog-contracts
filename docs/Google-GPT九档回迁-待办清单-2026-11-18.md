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

---
*创建:Lead 2026-11-18 09:08;状态:检查完毕,待 D 组拍板,未执行。*
