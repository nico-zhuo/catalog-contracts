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
4. **最大前置风险未消除**:11-16 的 403 是 Google/OpenAI **provider 中国区限制**(非账户违禁)。回迁前必须先探针,否则 9 档上线即死档(生成 403→自动退款循环)。L-6 规则本就要求美系 vendor 上线前 1 次最小档探针。
5. **实测资产在档**:33 组定价实测三重留档(/tmp/live-matrix.tsv / 18 档清单 D1 / 历次汇报),回迁定价直接套用,≈ 全部可解除;9 handler 最终态代码在 `a3b722d^` 可整目录 checkout,零重写。

## 二、决策点(D 组,执行前必须拍板)

| # | 项 | 选项与建议 |
|---|---|---|
| D-1 | **id 策略:重建(新 id)vs 同 id 恢复** | a) **重建=新档**(预案口径:`*-or2` 等新命名,旧 id 烧毁规则不破)——**建议 a**,契约先例保持完整,成本差异仅命名与前端新行 b) 同 id 原样恢复(需用户显式豁免「删除 id 永不复活」先例;历史画布 remap 已指向 flux/seedream 需确认是否指回)。**待用户拍板** |
| D-2 | LEGACY_CLIENT_REMAP / 历史画布 replay | 若 D-1=a:8 行 remap **维持现状**(指向 flux-3-image-or/seedream 同水位),旧画布不重定向;若 D-1=b:讨论指回 |
| D-3 | 时序 | 探针先行(P0)→ 拍板 D-1 → backend 备好 hold → 探针绿则 push,走 #4 时序(arui 先行) |
| D-4 | scope | 本批只回迁 9 档;google/gpt 系**新候选**(§15 视角扩充)另立批次,不混入 |

## 三、任务分配(已上共享任务板,先不执行)

| 任务 | 负责 | 写域 | 依赖 |
|---|---|---|---|
| T1 探针:Google/OpenAI provider 通路验证(最小档 1 次真实调用,判定 403 是否仍在) | backend(image-workers) | image-workers(只读+一次上游调用) | 无,P0 |
| T2 回迁 9 handler(含 gpt-image-family 目录):`a3b722d^` checkout 模板、按 D-1 定 id、重拉 endpoints API 核对契约、定价套实测表、handlerVersion v1、门禁全绿 → 本地 hold | backend(image-workers) | image-workers/src/models/** | D-1 拍板;push 需 T1 绿 |
| T3 arui 触点:mapping 9 行、IMAGE_ASYNC_MODEL_IDS 9 行(P0 漏加=资损)、TEXT_STRENGTH、canvas-tools、branding canonical 8 条核验(应仍在)、断言数按 24 档重算 → hold | frontend(arui) | arui/app/config/** | D-1 拍板(定 id 后开写) |
| T4 收口:双仓 push 后 KV snapshot 对账(1451/零孤儿)、本文档回填执行终态、踩坑集锦/CHANGELOG 视需要 | Lead | catalog-contracts/docs | T1+T2+T3 |

## 四、波次(拍板后)

波0 探针(T1)→ 波1 拍板 D-1~D-4 → 波2 backend T2 + frontend T3 并行备好 hold → 波3 探针绿→ arui 先行 push(#4 时序)→ image-workers push(KV 自动翻转)→ 波4 Lead 收口 T4。

---
*创建:Lead 2026-11-18 09:08;状态:检查完毕,待 D 组拍板,未执行。*
