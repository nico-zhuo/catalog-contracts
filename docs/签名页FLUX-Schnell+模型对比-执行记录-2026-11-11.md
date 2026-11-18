# 签名页 FLUX Schnell + 模型对比表 B+ 批 · 执行记录（2026-11-11）

> 状态：**已执行、已 push、CI/Deploy 全绿**。
> arui 远端 HEAD：`03e34d226`（11 commits：`adbc1b72d`…`03e34d226`）；image-workers 未改动，仍为 `4c02b2a`。
> 契约仓零改动（schemaVersion 仍 1.7.0）；本文件不提交 catalog-contracts（该仓有进场前既有 dirty）。

## 一、本批范围（用户拍板）

1. 10 个签名工具页默认模型档 = FLUX Schnell、该档 3 积分（前一批已完成，`4c02b2a` / `4dcee21ee`）。
2. 全站取消高级模型门禁；积分不足弹窗 → Plan 卡片弹窗（前一批已完成）。
3. 定价页文案收尾 + 死 key 清理。
4. 工具页「Standard/Pro/Master 三档对比表」→ **B+ 数据驱动方案**（构建期 catalog 快照 + 按能力挑 3 档 + 模型目录 hub 页），覆盖**全部 128 个工具页**（不只签名页）。
5. 全量正文 P1「去档位化 / 去旧数字」；`models`/`comparison` 等死段一起删。
6. 全部完成后一次 push，不实测。

## 二、commit 清单（arui，均已 push）

| # | commit | 内容 |
|---|---|---|
| 1 | `adbc1b72d` | Phase 0：定价页 3 处文案 ×32 + 死 key（gate.title/description、credits.dialog.upgradeCta、errors.premiumPlanRequired）+ 弹窗去 reason |
| 2 | `64c50adde` | Phase 1：构建期 catalog 快照（1772 档 / 616KB）+ `pickComparisonTiers`/`getToolModelStats` + ns→toolSlug 映射 128/128 + CI 快照刷新/校验 step |
| 3 | `d6c874b4f` | Phase 2+3：`ModelTiersSection` 重写为快照驱动（128 路由零改动 + 补挂 10 个缺失页）+ `buildModelFacts` 生成 JSON-LD featureList；删旧 `modelTiers` 3776 条 / `featureList` 4096 条 |
| 4–8 | `9179cdfb5` `3763b8151` `707407de3` `db76b7381` `e9ba6d4cc` | Phase 4：正文去档位化/旧数字 5 波（features / faq / howToUse+useCases / hero+cta / 签名页上传可选化 + 本地化清理） |
| 9 | `d49f1b4bd` | Phase 4.5：中置信旧数字 300→0、签名 10 页工作流「可选上传」、`audit-stale-copy` 常驻 CI、回退损失修复 |
| 10 | `1880c4807` | Phase 5：模型目录 hub 页 `/models`（32 语 + ItemList/FAQ JSON-LD + footer/工具页双向内链 + sitemap/prerender） |
| 11 | `03e34d226` | Phase 6：死段清理（models 17 ns / comparison 未渲染 12 ns / heroComparison 3 / toolForm 26 / creditCost 16 / styles 7 / formFields 4 / socialPlatforms 4 / export 4 / brandColor 4，共 3,104 个本地化子树，JSON −1.66MB） |

## 三、上线结果

- push：`4dcee21ee..03e34d226 main -> main`（一次）。
- arui CI/Deploy run **42991997740** → **success**：i18n completeness → typecheck → Refresh model snapshot → Build（4,833 HTML）→ Verify model snapshot & selection → Audit stale tier copy → Verify catalog model-id mapping → Upload translations（4,231 文件，448.9s）→ Deploy（Version ID `2ef7deac-622c-42ea-9cd9-d8f6c8d4aa40`）。
- 线上抽查：`https://arui.ai/models` HTTP 200，静态 HTML `ItemList numberOfItems=74`。
- Lead 本地实跑门禁：typecheck / build / verify:model-snapshot / verify:model-selection / verify:branding / verify:premium / audit:stale-copy(check) / audit:unused-i18n / lint-i18n / i18n-completeness 全绿。

## 四、关键机制（后续维护）

1. **catalog 快照**：`app/data/model-snapshot.json`（1772 档，构建期基线）；CI 在 Build 前 `pnpm snapshot:models` 刷新（失败 fail-soft 用基线）；`verify:model-snapshot` 守卫覆盖/字段。
2. **对比表选档**：`app/config/model-selection.ts`（预算档 / 工具默认档 / 能力峰值档；能力峰值 image = 整工具 I2I 参考图优先，否则文字强度优先；video/audio/3D 各自规则）。
3. **hub 页**：`/models`（74 个展示模型，价格 `from` 口径 + 跨工具价差小字 + surcharge 单列 + PREMIUM 复用 `isPremiumTier` + 文字强度标签仅 image）。
4. **审计**：`audit-stale-copy --check`（高/中置信 0 命中，CI 硬 gate）；`audit-unused-i18n`（死段检测，非硬 gate）。
5. **i18n**：`I18N_VERSION = 2026-11-11-4`；新增 ns `model-copy`（含事实模板/通用句）、`model-catalog`（57 key ×32）。

## 五、遗留 / 交接

- **死组件清单（仅记录未删）**：20 个直连零引用组件 + `shared/model-selector.tsx`（barrel 死引用）+ `shared/option-chip.tsx`（连带）；见 Phase 6 汇报。
- **hreflang 渲染形态**：预渲染 HTML 输出为 `hrefLang`（camelCase），全站既有现象、非本批引入；浏览器按大小写不敏感解析，如需严格小写可另开小批。
- **音频同名模型**：hub 用「工具后缀」区分（未合并行）；如需合并可改 `model-catalog.ts` 分组键。
- **3D 工具**只有 2 个可见档，对比表显示 2 档（不充数）。
- **不实测**：真实生成、支付链路、移动端视觉验收需人工点验。
- **image-workers** 本批零改动；契约仓零改动。
