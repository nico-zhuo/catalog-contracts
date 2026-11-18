# 聚合页 SEO 主推 · 待办清单（ai-image-generator / ai-video-generator）

> 状态：**审计完成（含 2026-11-10 晚 VPN 恢复后的第二轮复跑），未执行任何修复**。本文件只列待办与分配，等用户逐批授权后再动手。
> 来源：ab-team 审计（2026-11-10，Lead + frontend + backend；两轮：第一轮无网/第二轮 VPN 恢复）。
> 审计期间 arui / image-workers 全程 `git status` clean，无 commit/push/deploy；video-workers 有 17 处**历史** docs 未提交改动（非本次审计产生）。

---

## 一、结论摘要

1. **技术底子健康，不存在结构性 P0 阻塞**：两页 200、prerender 字节级生效（线上 HTML = 构建产物）、canonical 自指、hreflang 33 条互指自洽、JSON-LD 经 schema.org 官方校验器 **0 error / 0 warning**、`index,follow`、robots/llms.txt 正常、Googlebot/Bingbot/YandexBot UA 均 200 且无挑战页、sitemap 内 4768 URL 全 200、0 僵尸 URL；catalog 四方一致（image 1592 / video 149），BFF 映射 HARD FAIL = 0。
2. **排名瓶颈不在「能不能收录」，在内容独特性 + 外链结构 + 多语言承接 + CTR/性能**：
   - 工具卡描述与工具页正文逐字重复（≈6KB×N），聚合页独有内容薄（en 可见正文 ≈2.3K / 1.5K 词）。
   - 外链 44 条提交 / 11 条生效：锚文本几乎全品牌词，落点首页 13、深链仅 1 条（且是顺带提及），与自家计划「深链 40-50%、关键词锚文本 ≤20%」背离。
   - meta title 28 字符、H1 是分类名；移动端 Lighthouse lab：image 页 **Perf 53 / LCP 5.2s**、video 页 81 / 3.2s。
3. **第二轮（VPN 后）新增两类确定性缺陷**：① 大小写变体 URL 全部 200 且是「i18n key 裸露的薄副本」（`/AI-Image-Generator` 返回 39 处 raw key，P1，根因已定位）；② 两页共同存在 **React hydration error #418**（console error，P1）。
4. **两个 1 行 / 1 小时级修复建议立即做**：sitemap 漏收录 `/ai-video-generator/text-to-video`（32 locale 全 200、hub 有入口、生成器里 priority 0.9 都写好了）；视频页 4 张工具卡 webp 回退 404。

---

## 二、审计基线（实测数据，2026-11-10）

| 项目 | 实测值 |
|---|---|
| sitemap.xml | 18,346,625 B（gzip 149 KB / 1.8 s）、**<loc>=4768**（149 页 × 32 locale）、xhtml:link=157,344（每条 URL 恰好 33 个）、**lastmod=0**、无 image/news 扩展、单文件无 sitemapindex、XML well-formed、`content-type: application/xml`、`cache-control: max-age=3600` |
| sitemap 可抓取性 | image 家族 1024 + video 家族 480 = **1504/1504 全部 200**；sitemap 149 个页面路径 149/149 200；其它分类抽样 30 条全 200；**0 条 3xx/404/410/5xx、0 僵尸 URL** |
| 两聚合页响应 | 200、gzip、`cf-cache-status: HIT`、`cache-control: public, max-age=0, must-revalidate`、**无 ETag / Last-Modified / Vary**；TTFB 0.68-0.70s |
| 爬虫可达性 | Googlebot / Bingbot / YandexBot UA → **200、完整 HTML、无 challenge**（Cloudflare 未误伤） |
| hreflang | 33 条（32 locale + x-default），self-reference 正确，0 组不完整，0 悬空；32 个 hreflang 目标 URL **32/32 200**；属性名为 React 的 `hrefLang`（HTML 属性名大小写不敏感，无害） |
| 结构化数据 | BreadcrumbList(2 级) + CollectionPage + ItemList(31/15) + FAQPage(8 Q/A)；**schema.org 官方校验器：0 error / 0 warning**；inLanguage 正确；**url/item 未本地化**（见 A3） |
| 索引范围 | 两页 **64/64 locale 变体全 200**；46 个已发布工具页 **46/46 200**；46 张聚合页卡片的 catalog 供给无缺口 |
| 内容量 | en 可见正文：image ≈2,349 词 / video ≈1,486 词；H2=4、H3=43 / 26；FAQ 8 条；<picture> 35 个、img 37 个 |
| 多语言 | 32/32 locale key 与 en 完全一致；`lint:i18n:quick` 通过；32 locale 全部 prerender 且内容完整 |
| catalog 供给 | image 家族 31 toolSlug / 493 档、video 家族 15 toolSlug / 148 档；0 deprecated；`/api/catalog` 逐页档数 mismatch=0；页面有入口但无档 0 |
| 线上 catalog 校验 | image `verify:catalog` **PASS 1592**（schemaVersion 100% **1.6.0**）；video `verify:catalog` **PASS 149**（100% **1.7.0**）；read=snapshot=逐条 KV=registry 四方一致、byte-diff=0、0 孤儿 key |
| 映射完整性 | `verify:catalog-mapping` **PASS（exit 0）**：entries 1775（image 1592 / audio 28 / 3d 6 / video 149），BFF 映射 1766，**HARD FAIL=0，SOFT WARN=9**（3 个未产品化工具 × 3 档，预期内） |
| 外链 | 跟踪表 44 条：11 条生效；锚文本品牌词 11 / 裸 URL 2 / 关键词 1；落点首页 13、深链 1（仅 /ai-image-generator 顺带提及） |
| 移动端 Lighthouse lab（VPN 环境，本地 Chrome） | **image**：Perf 53 / SEO 92 / BP 75，FCP=LCP 5.2s，TBT 560ms，CLS 0，TTI 7.9s，总量 1,124 KiB；**video**：Perf 81 / SEO 92 / BP 75，FCP 3.0s / LCP 3.2s，TBT 230ms，CLS 0，总量 847 KiB |
| 资源构成 | Script **560 KB / 57 请求**（其中 GTM 177 KB）、Image 435 KB（image 页，其中 299 KB 超尺寸）/ 163 KB、Font 47.5 KB、Document 27.6 KB |
| GSC 验证 | DNS TXT 有 **2 条 `google-site-verification`** → 站点归属已验证；缺的是**账号数据访问权限** |
| PSI / CrUX | PSI 匿名配额已耗尽（429，project 583797351490）；CrUX 需 API key → 用本地 Lighthouse lab 替代，字段数据仍缺 |

---

## 三、待办清单

优先级口径：**P0** = 1 小时内、无争议、确定性收益；**P1** = 1-2 周内、直接影响排名/点击/收录/性能；**P2** = 2-4 周；**P3** = 观察/未来。
归属：前端 / 内容（文案+翻译）/ Lead / 用户 / 后端。

### A. 技术面（前端可落地）

| ID | 优先级 | 问题 | 证据 | 动作 | 归属 | 预估 | 验收标准 |
|---|---|---|---|---|---|---|---|
| A1 | **P0** | sitemap 漏收录 `/ai-video-generator/text-to-video` | `sitemap[.]xml.tsx` INDEXABLE_PAGES 未列；同文件 getPriority(:186)=0.9、getChangeFreq(:335)=weekly 成死分支；该页 32 locale 全 200、hub 有入口、prerender 有；VPN 后复测仍漏（video 子页 sitemap=448=14×32，应 480） | INDEXABLE_PAGES 补 1 行 | 前端 | 0.2h | sitemap 出现该页 32 条 `<loc>`；线上复测 |
| A2 | **P0** | 视频页 4 张工具卡 webp 回退 404 | 卡片组件把 `.avif` 硬替换成 `.webp` 作 `<img src>`；tool-video-upscaler / tool-audio-to-video / tool-logo-video-maker / tool-video-enhancer 只有 avif（VPN 后复测仍 404，avif 200） | 补 4 个 webp 资产，或改 `<picture>` 去掉隐式依赖 | 前端 | 1h | 4 个 URL 200；非 AVIF 浏览器不破图 |
| A3 | **P1** | 结构化数据 URL 未本地化（两页 × 32 locale） | de/ja 页 CollectionPage.url、ItemList 项、Breadcrumb item 全指 en URL，与 canonical `/de/…` 冲突；根因 `app/lib/seo/meta.ts:102-105 generatePageUrl` 无 locale 参数，调用点各 4 处 | `generatePageUrl(path, locale)` + 改调用；回归 32 locale | 前端 | 2h + 回归 2h | de/ja 页 JSON-LD 的 url/item 全部带对应 locale 前缀 |
| A4 | **P1** | meta title 仅 28 字符（规范 50-65） | en json metadata.title（两页均 28） | 扩到 50-65 含利益词/第二关键词；32 locale 同步（先 en + de/ja/ko/zh/es 试点） | 前端 + 内容 | 0.5h + 翻译 3h | 两页 title 长度达标且含核心词 |
| A5 | **P1** | imageAlt 缺失/无效 + 4 张分类卡无 alt 属性 | ① 工具卡：image 31 条仅 2 条有 imageAlt，组件用标题当 alt；video 0/15；② **relatedCategories 分类卡 4 张（image）/ 3 张（video）完全没有 alt 属性** → Lighthouse SEO 唯一失败项 `image-alt` | 组件优先读 `imageAlt`、缺省回退 description 首句；补 31+15 条 alt；分类卡补 alt；翻译同步 | 前端 + 内容 | 交互 2h + 翻译 1-2 人日 | 线上每张卡 alt ≠ 标题；Lighthouse `image-alt` 转 PASS |
| A6 | **P1** | 英文残句（删 free 词后残留） | image `cta.subtitle`="credits are available at signup. Type a description…"（句首小写、缺主语）；FAQ A1 同型 | 文案修正 → 翻译同步（en 定稿→翻译→组件） | 内容 + 前端 | 0.5h + 翻译 2h | 两页 en 文案全句语法完整 |
| A10 | **P1** | 大小写变体 URL = 200 薄副本（i18n key 裸露） | `/AI-Image-Generator`、`/AI-Video-Generator`、`/ai-image-GENERATOR` 等全 200：H1 渲染成 `hero.title`、FAQ JSON-LD name=`faq.items.0.question`、ItemList=[]、全页 39 处 raw key、`index,follow`、canonical 指向小写。根因：`app/lib/ns-resolver.server.ts` 按 pathname 段名精确大小写匹配 namespace + `worker/index.ts` 只有旧 URL/尾斜杠 301，无大小写归一 | worker 层对已知路由白名单做 lowercase 301；`ns-resolver` 防御性 `toLowerCase()` 兜底 | 前端 | 2h + 回归 | 大写/混合大小写 301 → 小写；不产生 indexable 副本 |
| A20 | **P1** | 移动端性能（Lighthouse lab：image Perf 53 / LCP 5.2s；video 81 / 3.2s） | 总量 1.12 MB / 0.85 MB；Script 560 KB / 57 请求（GTM 177 KB）；未用 JS 174 KB；图片超尺寸可省 299 KB（image）/ 109 KB（video）；mainthread 工作 2.0s / 1.5s；TTI 7.9s / 6.1s | ① 首屏 JS 拆包/按需（未用 JS 174KB）；② GTM/Clarity 延后（`LazyOnload`/交互后注入）；③ 工具卡图加 `srcset`/合适尺寸（现有 1200×900 塞进 ~380×285 槽）；④ 首屏关键 CSS 内联；⑤ 缓存头配合 A8 | 前端 | 2-3 人日 | mobile lab Perf ≥90、LCP <2.5s、TBT <200ms、图片总重 <250KB；PSI 恢复配额后复测 |
| A21 | **P1** | React hydration error #418（两页均报） | Lighthouse `errors-in-console`：`Minified React error #418`（hydration text mismatch），两页各 1 条；同时 BP 分数 75 | 用 dev 环境复现定位不一致节点（疑似 i18n 文本/时间/随机值/用户态 SSR-CSR 差异），修复后回归两页 32 locale | 前端 | 0.5-1 人日（定位后） | 两页 console 0 error；BP 回升 |
| A7 | P2 | sitemap 0 个 lastmod | 4768/4768 缺失；changefreq/priority 已被 Google 忽略 | 构建时写真实 lastmod，**避免全站同一时间戳** | 前端 | 0.5-1 天 | 抽样含 lastmod 且分布合理 |
| A8 | P2 | HTML 无 ETag/Last-Modified 且 `max-age=0, must-revalidate` | 两页响应头；CF 侧 HIT 但仍全量重传 | 加 ETag 或 `s-maxage=60`；按 locale 加 `Vary` | 前端 | 2-4h | 响应头有校验器；重复请求 304 |
| A9 | P2 | sitemap 无 `image:image` | 31+15 张工具卡图未被图片 sitemap 收录 | 生成器加 image 扩展 | 前端 | 2h | 图片搜索可发现 |
| A11 | P2 | relatedCategories 有重复目标 | image 页 4 条里 2 条都指 /ai-video-generator（有效目标仅 3）；video 页同型 | 第二条改指真实不同聚合页或删并 | 前端 + 内容 | 1h + 翻译 3h | 4-8 条、无重复、全部 200 |
| A12 | P2 | Hero 间距偏大 | `hero-prompt-section.tsx:190` `py-20`，规范 `py-12 md:py-20` | 改 class | 前端 | 0.2h | 节奏一致 |
| A14 | P2 | og:image:alt / twitter:image:alt = 标题 | 两页线上 meta | 改描述性 alt | 前端 | 0.3h | 语义化 |
| A15 | P2 | 两页卡片网格/样式不一致 | image `md:grid-cols-2` vs video `lg:grid-cols-3`，shadow/border 写法不同 | 统一设计 token | 前端 | 2h | 视觉一致 |
| A16 | P2 | `/api/catalog/*` 无缓存头 | 响应头无 cache-control/etag | 加 `Cache-Control: public, max-age=300` | 前端 | 0.5h | 响应头可见；robots 保持 `Disallow: /api/` |
| A22 | P2 | 未接 IndexNow（Bing/Yandex 即时收录） | `public/` 无 indexnow key 文件、仓库 0 命中 indexnow；Bing 索引无法用抓取确认 | 部署流程加 IndexNow 提交（key 文件 + 变更时 ping） | 前端 | 2-3h | key 文件可访问；提交返回 200/202 |
| A23 | P2 | toolSlug 命名三种规则并存 | `ai-ai-drawing-generator`（双前缀历史）/ `product-image-generator`、`art-ai-generator`（无前缀）/ 其余 `ai-*`；本轮前端因猜 slug 误报 3 个 NO_TIERS | 加一份「route slug → catalog toolSlug」对照表（或脚本自动导出），供映射/核对用 | 前端/Lead | 1h | 对照表入库；核对脚本改用它 |
| A24 | P2 | 路由文件头注释过期 | video-upscaler / video-enhancer 注释写「三档 standard/pro/master 36/100/1300 积分」，实际 catalog 各 2 档 | 更新注释 | 前端 | 0.2h | 注释与 catalog 一致 |
| A17 | P3 | sitemap 单文件 18.3MB / 4768 URL | gzip 149 KB、未超 50MB/5 万上限 | 逼近 4 万 URL 前上 sitemapindex | 前端 | 1 天 | 预留 |
| A18 | P3 | 5 个页面 priority 落默认 0.5 | 含 `/ai-video-generator/video-script-generator` | getPriority 补该页 | 前端 | 0.2h | priority 合理（Google 实际忽略） |

### B. 内容与多语言（打包排名的主战场）

| ID | 优先级 | 事项 | 现状/证据 | 动作 | 归属 | 预估 | 验收标准 |
|---|---|---|---|---|---|---|---|
| B1 | **P1** | 聚合页独有内容块 | 卡片描述与工具页正文逐字重复（≈6KB×N）；聚合页独有信息少 | 加 2-3 个聚合页专属 section（选型对比表 / 价格与积分怎么算 / 场景与工作流入口），文案不可复用工具页 | 内容 + 前端 | 3-5 人日 + 翻译 | 独有正文 ≥800 词/语言；重复率显著下降 |
| B2 | P2 | GEO 量化锚点弱 | image 有单工具数字但无分类规模锚点；video 更弱 | hero/工具区加「31 image tools / 15 video tools」类数字，统一单一数据源（`app/config/stats.ts` 目前不存在） | 内容 + 前端 | 0.5h + 翻译 | 数字出现且与页面一致 |
| B3 | **P1** | 32 locale 关键词承接矩阵 | 无词表；locale 是低竞争杠杆 | 出「head/long-tail/locale 词 × 承接页（聚合页 vs 工具页）× 落地位置（title/H1/H2/FAQ）」矩阵，防 cannibalization | Lead + 内容 | 1-2 人日 | 覆盖两页全部 32 locale top 词 |
| B4 | P1（待决策） | H1 利益导向 | 两页 H1=分类名，与「H1 利益导向 3-8 词」规则冲突 | 改兼顾型 或 明确豁免 | 产品 → 前端 | 0.5h + 翻译 | 决策留痕；H1 唯一性不变 |
| B5 | P2 | cta credits 口径 | video `cta.subtitle`="Credits land in your account every morning."（暗示每日赠送） | 产品/合规确认后统一两页 | 产品 → 内容 | 0.5h + 翻译 | 口径一致合规 |

### C. 外链（当前最大缺口，Lead 统筹 + 用户配合）

| ID | 优先级 | 事项 | 现状/证据 | 动作 | 归属 | 预估 |
|---|---|---|---|---|---|---|
| C1 | **P1** | 两页定向 deep-link 建设 | 44 条提交 / 11 条生效；落点首页 13、深链仅 1、`/ai-video-generator` = 0 | 4 周内两页各建 8-15 条 deep link：支持深链的目录站 + 内容型外链（Medium/Dev.to/Hashnode 教程落聚合页）+ 互惠反链换锚文本 | Lead + 用户 | 4 周 |
| C2 | **P1** | 锚文本结构校正 | 现状品牌词约 100%、关键词锚 ≈0（计划要求 60/20/20） | 新链接按 60/20/20 配比；两页各配 2-3 个关键词锚变体 | Lead | 持续 |
| C3 | P2 | 跟踪表补两页维度 | 无「落点=两聚合页」视图 | 加落点/锚文本类型筛选，周报输出两页增量 | Lead | 0.5h + 每周 |
| C4 | P2 | 外链素材包补两页专属文案 | 素材包面向首页/工具页 | 两页各出 3 版 description 变体 | 内容 | 1 人日 |
| C5 | P3 | 数字 PR / HARO 类机会 | 计划第四梯队 | 机会驱动 | Lead | 按机会 |

### D. 度量与验证

| ID | 优先级 | 事项 | 第二轮更新 | 归属 | 预估 |
|---|---|---|---|---|---|
| D1 | **P1** | GSC 数据与提交 | **验证方式已查明**：DNS TXT 两条 `google-site-verification` → 站点归属已验证，缺**账号数据访问权限**。仍需：确认 sitemap 已提交、拉索引覆盖率与查询表现基线 | 用户（账号） | 0.5h |
| D2 | **P1** | 关键词排名基线表 | 仍缺（无 GSC 数据、SERP 抓取被 JS/挑战页挡） | 按 B3 矩阵记录两页 × 目标词排名，每周复测 | Lead | 1h + 每周 |
| D3 | P2 | CWV 字段数据 | PSI 429（匿名配额耗尽）→ 已改用本地 Lighthouse lab 基线（见基线表）；**VPN 环境 lab 值可能偏高**，需非 VPN/PSI 恢复后复测；CrUX 需 API key | 用户/Lead | 0.5h |
| D4 | P2 | 索引量与收录速度监控 | 抓取式 `site:` 查询被 JS/挑战页阻挡，不可靠；需 Bing Webmaster/GSC | Lead | 每周 0.5h |
| D5 | ✅ | `verify:catalog-mapping` | **已跑通：PASS（HARD 0 / 1766 映射 vs 1775 entries，SOFT WARN 9 条为未产品化工具，预期内）** | 前端已验 | — |
| D6 | ✅ | 线上 catalog 校验 | **已跑通：image PASS 1592（1.6.0）、video PASS 149（1.7.0），四方一致** | 后端已验 | — |

### E. 需用户/产品决策

| ID | 事项 | 选项 | 第二轮更新 |
|---|---|---|---|
| E1 | 3 个 toolSlug / 9 档未产品化（discord-message / facebook-post / text-message generator） | ① 前端补映射+页面（新增 3 个可 SEO 工具页）；② 后端按 §8.4 弃用 | `verify:catalog-mapping` 已把 9 条标为 SOFT WARN（预期内，不阻断）；arui 无路由无 tools 条目 |
| E2 | H1 是否改利益导向（B4） | ① 改兼顾型；② 豁免规则 | 不变 |
| E3 | 契约版本漂移：image-workers pin **1.6.0**，video-workers / arui **1.7.0** | 授权后对齐（须走契约仓） | 线上实测确认：image 快照 100% 1.6.0、video 100% 1.7.0；BFF 1.7.0 zod 可兼容，**当前未阻塞** |

### F. 后端顺带发现（非 SEO，网络恢复后才可见，只报不改）

| ID | 优先级 | 问题 | 证据 | 动作 | 归属 |
|---|---|---|---|---|---|
| F1 | P2 | `/__catalog/read` 返回形状跨仓不一致 | image 返 `{entries:[{modelId,entry}]}`；video 返扁平 `{entries:[entry]}`（各自 verify 脚本各自适配） | 统一 envelope 契约（需授权，两仓都改） | 后端 |
| F2 | P3 | video 的 read 路由 `list({prefix})` 无分页 | video-workers `src/index.ts:175` 单次 list；image 侧已分页+快照优先 | video registry >1000 时会静默截断 → 后续对齐 image 实现 | 后端（video 只读） |

---

## 四、建议执行批次（每批完成后再找用户确认，不自动串联）

| 批次 | 内容 | 预计 | 说明 |
|---|---|---|---|
| 批次 0 | A1 + A2（两个 P0） | 1 天 | 纯前端、无翻译、低风险 |
| 批次 1 | A3 + A4 + A5 + A6 + A10（5 个 P1 技术/CTR/一致性项） | 4-5 天（含翻译） | 按「en 文案定稿 → 翻译 → 组件」强顺序；与批次 0 可合并 deploy |
| 批次 2 | A20 + A21（性能 + hydration） | 3-4 天 | 先定位 hydration #418，再做拆包/图片 srcset/第三方延后；完成后重跑 Lighthouse 对比基线 |
| 批次 3 | B1 + B2 + B3（聚合页独有内容 + GEO + locale 矩阵） | 1-2 周 | 内容团队主导 |
| 批次 4 | C1 + C2 + D1 + D2（外链定向 + 度量基线） | 4 周并行 | 外链是最大杠杆；度量先建基线 |
| 批次 5 | A7-A24 其余 P2 + F1/F2 | 2-3 周 | 技术债与一致性 |
| 待决策 | E1/E2/E3 | — | 不定则对应批次不开工 |

---

## 五、顺序与跨仓约束（踩坑 #4 / #5 同源）

1. **文案强顺序**：en 文案定稿 → 32 locale 翻译 → 组件页面。
2. **契约变更顺序**（涉 E3 等）：catalog-contracts 改 + CHANGELOG + smoke-test → image-workers pin/sync（KV + 快照）→ arui 子模块 bump + 映射 → deploy；不可交换。**注意**：手工只跑 `/__catalog/sync` 不重建快照 = 「单条新、快照旧」。
3. **sitemap 与页面同批**：A1 改完须与批次 1 同批 deploy 后复测线上 sitemap。
4. **外链增速红线**：日增 3-8 条、关键词锚文本 ≤20%、深链 40-50%。
5. **`git add` 只用明确路径**；本 workspace 多会话共用，禁止 `git add -A`。

---

## 六、本次审计未覆盖 / 仍不可验证

1. **GSC 查询数据与索引覆盖率**：站点归属已验证（DNS TXT），但无账号权限 → 需用户拉取。
2. **PSI / CrUX 字段数据**：PSI 匿名配额耗尽（429）、CrUX 需 API key → 现有 CWV 只是本地 lab，非真实用户字段数据。
3. **Google/Bing 索引量**：抓取式 `site:` 查询被 JS 重定向/挑战页阻挡，Bing 结果也不可信 → 需 GSC/Bing Webmaster 账号数据。
4. **`pnpm build`**：审计铁律未跑；prerender 有效性以「线上 HTML 与构建产物逐字节相同」替代（两轮均验证）。
5. **Lighthouse lab 口径**：VPN 环境下网络 RTT 偏高（origin RTT 457ms），绝对分数偏悲观；两页相对差距仍可信，正式基线需非 VPN 复测。

---

## 七、网络恢复后复跑记录（2026-11-10 21:16-21:35）

**环境**：VPN 开启。Google 200、`*.workers.dev` 可达（根路径 404 正常）、Googlebot/Bingbot/YandexBot UA 均 200。

**已解除阻塞（原来标「不可验证」）**
1. arui `verify:catalog-mapping` → **PASS**（1775 entries / 1766 映射 / HARD 0 / SOFT 9）。
2. image-workers 线上 `verify:catalog` → **PASS 1592**；每页 read/snapshot/逐条 KV/registry 四方一致、byte-diff=0、0 孤儿 key。
3. video-workers 线上 `verify:catalog` → **PASS 149**（schemaVersion 1.7.0）。
4. image 家族 31 toolSlug / 493 档、video 家族 15 toolSlug / 148 档（135 在 video 侧 14 slug + 13 在 image 侧 photo-to-animation）→ 全在线核对。
5. 两页 64/64 locale、46 工具页、32 hreflang 目标 → 全 200。
6. 结构化数据 → schema.org 官方校验器 **0 error / 0 warning**。
7. 爬虫 UA 无挑战页；sitemap XML well-formed、4768 URL。

**新增待办（本轮新发现）**
1. **A10 大小写薄副本**（升级为 P1，含根因与复现）。
2. **A20 移动端性能**（LCP 5.2s / JS 560KB / 图片超尺寸 299KB）。
3. **A21 React hydration #418**（两页 console error）。
4. **A22 IndexNow 缺失**、**A23 toolSlug 命名三规则**、**A24 路由注释过期**、**F1/F2 后端 read 路由形状与分页**。
5. A5 补强：relatedCategories 分类卡 4/3 张**完全没有 alt 属性**（Lighthouse SEO 唯一失败项）。

**结论未变（网络恢复未改变）**：视频 4 个 webp 仍 404、sitemap 仍漏 text-to-video、sitemap 0 lastmod、Schema URL 未本地化、title 28 字符、H1 非利益导向。

---

## 八、GSC 基线（D2，2026-11-12 拉取，GSC API，窗口 2026-08-13 ~ 2026-11-11）

> 作用：衡量批次 0/1（title/keywords/free 簇重做，2026-11-12 上线）与后续批次的对照组。建议 4-8 周后同口径复拉。

| 维度 | 基线值 |
|---|---|
| /ai-image-generator 全家族（含 32 locale 子页） | 月均 clicks ≈ 120-130、impressions ≈ 5.3K→8.5K（三个月逐月上升）、平均位置 15-27 |
| 设备 | mobile clicks 占 2/3；desktop 曝光更高但 CTR 低 |
| en hub 页本身 | 非品牌词曝光几乎为 0（仅 brand 词 arui.ai/arui ai 有点击）→ en 主战场尚未参战，free 簇重做正是打这里 |
| 流量担当页（90d clicks） | hr/caricature-maker 253、bg/photo-to-cartoon 218、lt/caricature-maker 81、fr/photo-comic 77、face-generator 74 |
| 高价值查询（位置 ≤6 且有量） | 保加利亚/克罗地亚语 caricature 簇（pos 4-5）、arabic 图片上色簇、random face generator（pos 9.2 / impr 1335） |
| 佐证 B3（locale 词矩阵） | 前 20 查询全部是非英语长尾 locale 词——低竞争 locale 杠杆已验证有效，en 是下一增量 |
| 品牌混淆 | "aria image generator"（impr 88+21+9）——用户把 Arui 记成 Aria，可考虑 FAQ/文案容纳该误拼 |

## 九、审计方法留痕

- 审计基准：`arui/.claude/页面验收规范说明.md` + `arui/.claude/juheyejiancha.json`（聚合页 9 Task checks，check-only）+ `arui/docs/核心公式.md`（未读全文）。
- 证据采集：线上 curl（grep 管道，未读整页 HTML）、构建产物字节对比、32 locale key/路径对账脚本、sitemap 全量下载 + 1504 条 URL 状态巡检、`/api/catalog` 46 页双口径对账、image/video registry 对账、本地 Lighthouse（mobile）、schema.org 官方校验器 POST、爬虫 UA 复测、DNS TXT 查询。
- 期间四个仓 `git status` 无本次审计产生的改动（video-workers 的 17 处为历史未提交 docs 改动）。
