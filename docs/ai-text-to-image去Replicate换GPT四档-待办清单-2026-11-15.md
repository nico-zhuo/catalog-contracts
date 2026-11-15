# ai-text-to-image 去 Replicate × GPT Image 四档（OpenRouter）— 待办清单 · 2026-11-15

> 来源：用户 2026-11-15 18:31 指令——「① text-to-image 工具页移除 replicate 平台的所有模型；② 新增 openrouter 模型（gpt-image-2.5-sunburst / 2.5-flare / 2.6-sunburst / 2.6-flare 四模型页为准）」。先检查、列代办清单、**先不执行**。
> 前置批次：同日 17:33 已上线 `ai-text-to-image-gpt-image-2-6-flare`（fcef057 / b32f4b7f7），本批第 4 档直接复用其模板。
> 团队：沿用本会话 ab-team（backend=image-workers / frontend=arui），两轮只读检查（task-10/11）已完成。

---

## 〇、四模型实拉事实（2026-11-15 18:31，`GET /api/v1/images/models/{slug}/endpoints`）

| | 2.5-sunburst | 2.5-flare | 2.6-sunburst | 2.6-flare（已上线） |
|---|---|---|---|---|
| 定位 | 精度档（上一代） | 速度档（上一代） | **精度旗舰**：dense compositions / text-heavy layouts / 编辑一致性 | 速度旗舰（比 2.5 快 50%） |
| aspect_ratio | 9 值 | 9 值 | 9 值 | 9 值 |
| quality | 6 档 | 6 档 | 6 档 | 6 档 |
| output_format | png/jpeg/webp | png/jpeg/webp | **+gif** | +gif |
| passthrough | moderation | moderation | **+complexity** | +complexity |
| 费率 per token | $8/$5/$30 | 同 | 同 | 同 |

- 四模型费率**完全一致**；fal 官方差异表：2.6 vs 2.5 在 low≈4.2× / medium≈3.3× / **high+ 相同** → quality 锁 high 后四模型成本表一致。
- 新 3 档积分表/md 直接复用已验证的 2.6-flare 值：perUnit(aspect_ratio) `{"1:1":17,"4:3":12,"3:4":12,"3:2":14,"2:3":14,"16:9":13,"9:16":13,"21:9":14}`、maxDimension 2240；**sunburst 两档无独立锚点，全表标 ≈** 待首账单按模型回填（2.5-flare 由差异表传导锚定）。

## 一、波A：移除 Replicate 14 档（仅 ai-text-to-image，其它工具 400+ 同尾段目录零影响）

**清单**（backend 逐一核实，零代码交叉引用；registry 1603−14+3=1592）：
flux-schnell、gpt-image-1-5、gpt-image-2、gpt-image-2-5-sunburst、grok-imagine-image-2、nano-banana、nano-banana-pro、nano-banana-2、nano-banana-2-lite、nano-banana-2-1、seedream-4、seedream-4-5、seedream-5-lite、seedream-5-pro。

**deprecated_alternatives 指向**（backend 建议，待拍板）：gpt 系→新 gpt 档直系继任（2-5-sunburst→[**2-5-sunburst-or**, 2-6-sunburst]；gpt-image-2→[2-6-flare, 2-6-sunburst]；1-5→[2-5-flare, 2-6-flare]）；flux-schnell→[klein, 3-image-or]；nano/seedream 系→[3-image-or, klein]（⚠️ 本工具 I2I 仅存 flux-3-image-or/klein，Google I2I+web search 能力在本工具消失——其它工具仍有）；grok→[2-6-flare, 2-pro-or]（无同厂继任）。

**前端关键联动**：
- **defaultModelId=flux-schnell 将被移除，必须同 commit 切档**（tiers[0] 兜底会落到字典序最贵档，不可常态）——候选见决策 D1。
- 14 条 branding 条目**保留加注记**（作 102 池工具扇出 canonical 源，删=大混组）；池键/TEXT_STRENGTH/NON_PREMIUM/locales 零删改（跨工具共享）。
- IMAGE_ASYNC_MODEL_IDS 14 行**本批保留**（保护 in-flight，后端删档完成后清理，b9c451489 先例）。
- 410→alternatives→画布「一键换档」链路已存在零改动。

## 二、波B：新增 3 档（第 4 档 2.6-flare 已上线）

| tierId（modelId） | upstream | 说明 |
|---|---|---|
| gpt-image-2-5-sunburst-**or** | openai/gpt-image-2.5-sunburst | **-or 必须带**：旧名被 Replicate 档占用且 modelId 永久稳定（即使同批删旧档也不可复用，flux-2-max 先例）；展示名复用既有 aruiGptImage25Sunburst key（换源零 locale） |
| gpt-image-2-5-flare | openai/gpt-image-2.5-flare | 干净名（无前身，klein 先例） |
| gpt-image-2-6-sunburst | openai/gpt-image-2.6-sunburst | 干净名 |

- backend：3 个 handler 与 2-6-flare 模板**逐字相同**（仅 model_id/upstream_model/文件头注记差异：2.5 系无 gif、passthrough 差异——均不暴露不传）；测试走 **family 单文件**（flux-2-pro-or-family 惯例）：逐档 payload toEqual + 13 隐藏字段排除 + describe() 自证，回退/502 用例各抽 1 档代表。
- frontend 8 处：+3 映射行 / +3 branding（openai.svg、eta 15-120s 推定、无 descriptionKey）/ canvas-tools +3（locale 仅 **2 新 key ×32**）/ TEXT_STRENGTH 三表 +3（2-5-sunburst-or 沿 93/strong，余沿 90）/ verify 断言 20→23 / **IMAGE_ASYNC_MODEL_IDS +3 显式行（P0 资损项）** / 归档白名单精确枚举 +3 / locales 2×32。
- premium/积分徽标/归档 UI/反向映射：自动覆盖零改动。

## 三、执行时序（#4/#10，决策 D5 随 D1 联动）

```
① backend T2-B1：+3 档 handler+family 测试 → push → CI → 新档落 KV（alternatives 指向必须已 active）
② frontend T2-F1：commit-A（波A：删 14 映射 + defaultModelId 切档 + remap 表）+ commit-B（波B：+3 档接入）同 push → CI 绿
③ backend T2-B2a：14 档 deprecated+alternatives → push → sync 落 tombstone（此刻前端映射已删 ✓）
④ 排空窗口 ≥15min（在途任务 /status 404→BFF 退款兜底，157 档批同日两连先例）
⑤ backend T2-B2b：删 14 目录 → registry 1592 → push
⑥ Lead/backend：wrangler 清 14 个孤儿 KV key（model:image:ai-text-to-image-{14 档}，TASK_STORE）
⑦ frontend T2-F3：IMAGE_ASYNC 14 行移除（+task-9 快照刷新网络恢复后一并）
```

## 四、决策点（全部有建议默认值，拍板后开工）

| # | 决策 | 建议 |
|---|---|---|
| D1 | defaultModelId 切换目标 | **flux-3-image-klein**（1K=3 分，继任 flux-schnell「全场最低价引流」定位，已上线故波A可独立先行；选 gpt 档则波A绑死波B KV） |
| D2 | LEGACY_CLIENT_REMAP_EXPLICIT 加 14 旧档→对位新档 | **加**（画布旧节点 regenerate 换同水位档而非跳默认，与 alternatives 同源；仅 14 行） |
| D3 | 归档白名单精确枚举 +3 | **是**（后缀通配过宽，#11 警告 grok 类失真；flux-2-pro-or 先例） |
| D4 | IMAGE_ASYNC 14 行本批保留 | **是**（保护 in-flight；后端删档完成后 T2-F3 清理） |
| D5 | alternatives 表 | **按 backend 建议采纳**（grok→[2-6-flare, 2-pro-or] 为产品决策点；I2I 能力降级已标注） |

## 五、任务板（全部 pending，拍板后执行）

- task-12 **T2-B1** backend：+3 档（handler×3 + family 测试 + registry 1606 + 门禁 + push + KV 验证）
- task-13 **T2-F1** frontend：commit-A 波A（14 映射删 + default 切档 + remap）+ commit-B 波B（8 处）+ verify 族 + push + CI
- task-14 **T2-B2** backend：deprecated+sync（a）→ 排空 → 删目录+registry 1592（b）→ 孤儿 key 14 个
- task-15 **T2-F3** frontend：IMAGE_ASYNC 14 行清理 + task-9 快照刷新合并执行（网络恢复后）
- 依赖：12 → 13 → 14 → 15；共享文件/契约 schema 零变更；不实测口径延续（fetch-stub 静态对账 + ≈ 标注待首账单）

## 六、检查记录（2026-11-15 18:31–19:00）

- T2-CHK-B（task-10 ✓）：14 档清单核实/零交叉引用、alternatives 建议表、命名冲突核对（-or 结论）、3 档差异表、计价口径评估、Phase 0-3 预案、共享文件零改动。
- T2-CHK-F（task-11 ✓）：defaultModelId 联动链（canvas-tools:349 前端权威 + 三级 fallback + 23 工具共享 flux-schnell 全局资产不可删）、波A/波B 文件级清单、410 链路确认、locales 影响面修正（2×32 非 3×32）、快照债叠加处置。
- Lead：四模型端点实拉（费率一致/2.6 系 gif+complexity/9 比例枚举）、fal 差异表传导、2.6-sunburst 页面定位确认（text-heavy 旗舰）。

## 七、执行记录（2026-11-15 18:46 授权 → 19:45 完成，全部已 push）

| 环节 | 交付 | 状态 |
|---|---|---|
| T2-B1 | image-workers `48195e9`：+3 档 handler（模板逐字复用，sunburst 全表 ≈）+ family 测试 9 用例 + registry 1606；门禁 90/90；[CI/Deploy ✓](https://github.com/nico-zhuo/image-workers/actions/runs/43705869452)；KV 3 entry+快照验证 ✓ | ✅ |
| T2-F1 | arui `3c7d5a38a`（波A：删 14 映射 + default→klein 同 commit + remap 表 +14 + branding 保留注记）+ `0d7b5b2f1`（波B：8 处接入，IMAGE_ASYNC +3 P0，locales 2×32）+ `b1b4a7972`（存量债：e820736f3 漏配 flux-2-pro-or/flux-3-image-or TEXT_STRENGTH，波A 删除显形，Lead 授权独立修复，断言 23→25）；[CI ✓](https://github.com/nico-zhuo/arui/actions/runs/43707071173) | ✅ |
| T2-B2 | image-workers `d1acc7d`（14 档 deprecated + D5 alternatives + handlerVersion 全 bump）→ 排空 19:15:44→19:30:47 ≥15min → `23c733a`（删 14 目录，registry 1592，[Deploy ✓](https://github.com/nico-zhuo/image-workers/actions/runs/43709290572)）→ 14 孤儿 KV key 规程清理（get 确认 tombstone→delete→404 复验，14/14）；快照 0 残留，工具页恰 8 active 档（4 flux + 4 gpt） | ✅ |
| T2-F3 | arui `9856a39fa`：IMAGE_ASYNC_MODEL_IDS 删 14 旧行（22 个其它工具前缀行不动）+ flux-2-max-or 注释债更正；[CI ✓](https://github.com/nico-zhuo/arui/actions/runs/43709938084) | ✅ |
| task-9 | 快照债：网络（workers.dev DNS 污染）未恢复，②分支挂起——CI 侧 snapshot&selection 已权威验证绿，仅本地刷新+补提交待网络 | ⏳ |

决策定稿：D1 默认档→flux-3-image-klein；D2 remap +14；D3 归档精确枚举；D4 阈值旧行批后清理（已执行）；D5 alternatives 按 backend 表。过程新增沉淀：踩坑集锦 #13（wrangler kv key delete 静默失败/404 误判三态规程）。

---

*本文档由 Lead 维护；§四 拍板回填后即为执行依据。*
