# 图表工具 FLUX Schnell 批 · 执行记录（2026-11-11）

> 状态：**已执行、已 push、两仓 CI/Deploy 全绿**。
> image-workers 远端 HEAD：`779250b`；arui 远端 HEAD：`d73b75e9d`。
> 契约仓零改动（schemaVersion 仍 1.7.0）；本文件不提交 catalog-contracts（该仓有进场前既有 dirty）。

## 一、需求（用户）

12 个图表工具页：默认模型档 = FLUX Schnell，且这些页面的 FLUX Schnell 档积分 = 3。

URL → toolSlug：Mind Map / Flow Chart / Org Chart / Venn / ER / UML / Sankey / Hierarchy / Architecture / Circuit / Data Flow / Spider Chart。

## 二、核查结论

- 9 个工具已有 flux-schnell handler（creditCost fixed 1、handlerVersion v1，params `prompt/style/aspect_ratio/resolution`）→ 只需改价 + bump 版本。
- 3 个缺失（Venn / Sankey / Circuit）：现有档全是 I2I（`accepted_params` 含 `image_urls`、`supportsReferenceImage:true`、前端 `needsImage` 硬拦）→ 需新增纯 T2I 档 + 前端白名单/上传槽/必传图处理。
- 9 个在 `ALL_17` 档组（flux-schnell 已映射）；Venn/Sankey 在 `I2I_12`、Circuit 在 `I2I_13`（排除 flux-schnell）→ 需 per-tool override。
- B+ 基础设施（快照/对比表/JSON-LD/hub）已就绪 → 本批零表格/JSON-LD/hub 代码改动，数据自动更新。

## 三、commit 清单

### image-workers
| commit | 内容 |
|---|---|
| `779250b` | 9 档 `creditCost fixed 1→3` + `handlerVersion v1→v2`；新增 `ai-venn-diagram-maker-flux-schnell`（prompt/style/aspect_ratio）、`ai-sankey-diagram-generator-flux-schnell`（+direction）、`ai-circuit-diagram-generator-flux-schnell`（纯 T2I、无 422 gate、prompt 前缀改纯文本）；`_registry.ts` 1598 → **1601** |

### arui
| commit | 内容 |
|---|---|
| `e64a60306` | （用户本人的 StartupRanking SEO 验证文件，随本批一并上线，无敏感内容） |
| `d3676a40c` | 12 页 `defaultModelId` → `arui-<tool>-flux-schnell`；`DIAGRAM_FLUX_SCHNELL_EXTRA_TOOLS`（Venn/Sankey/Circuit 仅追加 flux-schnell）；3 个 I2I 工具工具级 `supportsReferenceImage`→false；`needsImage` 3 个 flag 改档位感知 |
| `8e1dd05df`（amend 前 `fee11c046`） | Venn/Sankey/Circuit 三页上传文案改「可选（仅当所选模型支持参考图时生效）」×32 语 |
| `d73b75e9d` | progress.txt CI 记录 |

## 四、上线结果

- image-workers：CI `43001965396` ✅ / Deploy `43001965393` ✅；registry **1601**；sync `500/500/500/101` → written **1601/1601**；snapshot 2,929,774 bytes；verify `1601 entries / 0 deprecated` ✅；线上 KV 12 档核对通过（3 新档 fixed:3/v1，9 改价档 fixed:3/v2，全部 sRI=false/maxDimension=1024）。
- arui：CI `43002521329` ✅（16 步全绿）：快照刷新 **1775 档/613KB**、verify snapshot/selection 转绿、verify:catalog-mapping **BFF 映射 1775 / hard fails 0**、build 4832 HTML、翻译增量 96 文件、Deploy Version ID `90bb68f7-2713-469e-aa35-44eca140a7dd`。
- 线上抽查：12 个图表页均含 `FLUX Schnell` + `3 credits`；Venn/Sankey/Circuit 的 hero/features 含 optional 上传表述；hub `/models` FLUX Schnell 行自动更新为 `from 1 · Some tools up to 3 · 63 tools`（60→63，新增 3 个图表工具）。

## 五、维护要点

- 后续再加工具默认 FLUX Schnell：仅需 ①后端已有该 tool 的 flux-schnell 档（否则新建）；②前端 `canvas-tools.defaultModelId` + 若档组排除 flux-schnell 则加 per-tool override。
- 数据驱动部分（对比表/JSON-LD/hub）由 CI 快照刷新自动跟随，无需文案或组件改动。
- `audit-stale-copy --check` 仍为 CI 硬 gate；本批新增文案未引入旧档位词。

## 六、遗留 / 交接

- 不实测：真实生成、支付链路需人工点验；移动端视觉验收留人工。
- backend 偏离已接受：3 新档 aspect_ratio 只给 `[1:1,16:9,4:3]`（与同工具其它 diagram flux-schnell 档一致；venn/sankey 默认 16:9、circuit 1:1）。
- arui 本地 `progress.txt` 记录已随 `d73b75e9d` push（会触发一次仅文档的 deploy）。
- image-workers 仅本批 13 文件改动；arui 本批 97+3 文件；两仓工作区干净。
