# Changelog

schemaVersion 变更记录。所有版本号遵循 [semver](https://semver.org/)。

后端 handler 写 KV 时,`schemaVersion` 字段必须与 `CURRENT_SCHEMA_VERSION` 一致(或 BFF 支持范围内)。

---

## [1.2.0] - 2026-07-31

### 变更类型：MINOR（在 1.1.0 基础上加两个前向兼容字段）

承接 v1.1.0（maxReferenceImages，3d-workers 用）继续 MINOR。image-workers 全切方案落地。

#### 加字段

| 字段 | 必填 | 语义 |
|---|---|---|
| `maxDimension: number` | ✅ required | handler 实际允许的最大长边像素。A 类 SIZE_TABLE 锁长边（如 flux-2-pro=1024）；B 类 enum 里允许的最大档对应像素（如 nano-banana-pro 4K=4096）。前端用于参考图尺寸 clamp + UI 提示。 |
| `supportsQueue?: boolean` | ❌ optional（默认 true） | 是否走异步队列。vendor-agnostic 功能性字段，替代原方案的 `provider: "fal"\|"modal"`（拒绝 vendor 耦合，详见 `image-workers/docs/全切方案.md` §2.3）。前端 `shouldQueue = (catalogEntry.supportsQueue ?? true) && isCanvasFlow`。 |

#### 设计理由（catalog 表达「能力」不表达「实现」）

- `maxDimension` 进 catalog：是模型的物理/功能属性，换 vendor 时仍成立
- `supportsQueue` 进 catalog：是功能性字段（异步 vs 同步），换 vendor 时 handler 内部改 submit 实现，catalog schema 零改动
- 拒绝 `provider: "fal"|"modal"`：实现细节，换 vendor 时连锁改 schema 枚举 + 所有 handler describe() + BFF/前端分支，违反「catalog 永久稳定」契约

#### 字段筛选决策框架（供其他 worker 仓借鉴）

详见 `image-workers/docs/全切方案.md` §5.1 三问：
1. 物理/功能属性？→ 进 catalog
2. 实现细节？→ 不进
3. 换 vendor 时需要改吗？→ 改的不进，不改的进

#### 兼容性

- `maxDimension` 理论上是 required，但 v1.1.0 老 entry 在 KV 里不带头部 → sync-catalog 跑完前 BFF 可能读到无该字段的 entry。BFF 侧需要 `?? fallback` 或强制 sync-catalog 后再升前端。**部署顺序：先升后端 handler + sync-catalog，再升前端。**
- `supportsQueue` optional，老 entry 不带 = 默认 true（与现有 fal 全异步一致）

---

## [1.1.0] - 2026-07-24

### 变更类型：MINOR（加 optional 字段，向后兼容）

#### 加字段

| 字段 | 必填 | 语义 |
|---|---|---|
| `maxReferenceImages?: number` | ❌ optional（缺省 = 1 张） | 参考图最大张数。3d-workers 用，前端据此渲染上传槽位数，worker 侧 standard-3d-handler 据此做 server-side 校验。body 契约 `image_urls: string[]`，长度 ≤ maxReferenceImages。 |

---

## [1.0.0] - 2026-07-20 ✅ Review Passed (merge)

### 变更类型：MINOR（加两个可选/前向兼容字段，老 handler 零回测）

#### 加字段

| 字段 | 必填 | 语义 |
|---|---|---|
| `maxDimension: number` | ✅ required | handler 实际允许的最大长边像素。A 类 SIZE_TABLE 锁长边（如 flux-2-pro=1024）；B 类 enum 里允许的最大档对应像素（如 nano-banana-pro 4K=4096）。前端用于参考图尺寸 clamp + UI 提示。 |
| `supportsQueue?: boolean` | ❌ optional（默认 true） | 是否走异步队列。vendor-agnostic 功能性字段，替代原方案的 `provider: "fal"\|"modal"`（拒绝 vendor 耦合，详见 `image-workers/docs/全切方案.md` §2.3）。前端 `shouldQueue = (catalogEntry.supportsQueue ?? true) && isCanvasFlow`。 |

#### 设计理由（catalog 表达「能力」不表达「实现」）

- `maxDimension` 进 catalog：是模型的物理/功能属性，换 vendor 时仍成立
- `supportsQueue` 进 catalog：是功能性字段（异步 vs 同步），换 vendor 时 handler 内部改 submit 实现，catalog schema 零改动
- 拒绝 `provider: "fal"|"modal"`：实现细节，换 vendor 时连锁改 schema 枚举 + 所有 handler describe() + BFF/前端分支，违反「catalog 永久稳定」契约

#### 字段筛选决策框架（供其他 worker 仓借鉴）

详见 `image-workers/docs/全切方案.md` §5.1 三问：
1. 物理/功能属性？→ 进 catalog
2. 实现细节？→ 不进
3. 换 vendor 时需要改吗？→ 改的不进，不改的进

#### 兼容性

- `maxDimension` 理论上是 required，但 v1.0.0 老 entry 在 KV 里不带头部 → sync-catalog 跑完前 BFF 可能读到无该字段的 entry。BFF 侧需要 `?? fallback` 或强制 sync-catalog 后再升前端。**部署顺序：先升后端 handler + sync-catalog，再升前端。**
- `supportsQueue` optional，老 entry 不带 = 默认 true（与现有 fal 全异步一致）

---

## [1.0.0] - 2026-07-20 ✅ Review Passed (merge)

前后端 merge 后的 v1.0.0 最终版。基于:
- 后端 baseline commit `51f2452`(初始版本)
- 前端 review 通过版本(4 refine + smoke test)
- 后端 5 项 merge 决策(B.1 全收 baseline / B.2 收 refine+smoke+scope,缓 CatalogSnapshot / B.3.1 WorkerCatalogEntry 简单版 / B.3.2 zod XxxSchema 后缀 / B.3.3 scope 待确认)

### 后端 Review 结论

- **6 条契约 + 4 处 redline 合规检查:全过**
  - ✅ perResolution 已删(只剩 fixed / perUnit)
  - ✅ WorkerKind: string
  - ✅ ParamSchema 用 discriminated union
  - ✅ schemaVersion + handlerVersion 双字段拆分
- **4 个 refine 全部接受**(无 redline):
  - #1 enum options ≥ 1
  - #2 number min ≤ max(只在两边都提供时触发,单边不误伤)
  - #3 ParamOption labelKey 或 label 至少一项
  - #4 deprecated:true 必须带非空 deprecatedAlternatives
- **Q1**:用现有 repo `github.com/nico-zhuo/catalog-contracts.git`(不新开 org)
- **Q2**:`peerDependencies` 放宽到 `^3.23.0 || ^4.0.0`,前端 4.x / 后端 3.x

### Merge 决策落实

| 决策 | 落实 |
|------|------|
| B.1 copy baseline 4 项 | ✅ `CURRENT_SCHEMA_VERSION` / `tsconfig.json` / `type: "module"` / `peerDependenciesMeta.zod.optional` 全部保留 |
| B.2 收 refine + smoke test | ✅ 4 个 refine + smoke test 脚本 + fixtures + CI matrix 全收 |
| B.2 缓 CatalogSnapshot | ✅ v1.0.0 不引入,BFF 冷启动 fallback 走业务代码 |
| B.3.1 WorkerCatalogEntry 简单版 | ✅ 用 `{ endpoint, authEnvKey }`,不引入 authStrategy discriminated union |
| B.3.2 zod XxxSchema 后缀 | ✅ `ParamSchema` (zod) → `ParamSchemaSchema`,与 `ModelCatalogEntrySchema` / `WorkerCatalogEntrySchema` 统一 |
| B.3.3 scope 名字 | ⏸ 暂不加 `@arui/` scope,等双方确认共识后再 MINOR bump |

### 兼容性修复(smoke test 发现)

**zod 3.x 与 4.x 的真实差异**:3.x 的 `z.discriminatedUnion("type", [...])` 要求每个 case 是 plain `ZodObject`,不接受 `.refine()` 包装(返回 `ZodEffects`,discriminator 取不到 shape,直接抛 `Cannot read properties of undefined`)。4.x 改进了这点。

**修复**:把 `ParamSchema` number case 内部的 `min ≤ max` refine 移到 `ModelCatalogEntrySchema` 的顶层 `superRefine()` 中,与原有 `deprecated → alternatives` 校验合并。两个版本的 zod 都能跑同一份 schema.zod.ts。

**本地验证**:
- node 22 × zod 3.23.8 → 9/9 通过
- node 22 × zod 4.4.3 → 9/9 通过

### 与后端架构.md v1.6 的对齐

- `KV["model:<type>:<modelId>"]` —— 单 model schema,无 TTL,§8.4 弃用流程清理
- `KV["worker:<kind>]` —— BFF 部署时写,后端 handler 不参与
- 不写 `KV["tool:<slug>]` —— BFF 通过 `KV.list({ prefix: "model:" })` 反向聚合
- catalog sync 用独立 `CATALOG_SYNC_KEY`(与 `FAL_WORKERS_API_KEY` 隔离,后端 A1)

### BFF 兼容性承诺

- BFF v1.0.0 支持 schemaVersion `^1.0.0`
- 不在支持范围内的 entry → BFF 标 unavailable,UI 灰显「该模型暂时不可用」(不崩溃)

### 后续可能变更

| 变更类型 | 预计版本 | 触发条件 |
|---|---|---|
| 加 `@arui/` scope 包名 | MINOR(1.1.0) | 双方确认 scope 名共识后 |
| 加 `CatalogSnapshot` 类型(R2 fallback) | MINOR | BFF 冷启动 fallback 需要类型化时 |
| WorkerCatalogEntry 引入 authStrategy | MINOR | 多 worker 鉴权机制分化时 |
| 加 `ParamSchema` 新类型(如 tags / image / colorPicker) | MINOR | 后端有新参数形态需求 |
| 加 `CreditCostRule` 新类型 | MINOR | 后端有新计费场景 |
| 重命名字段(如 `toolSlug` → `tool`) | MAJOR(2.0.0) | 极少,需前后端协同发版 |

---

## 版本兼容矩阵(BFF 维护)

| BFF 版本 | 支持 schemaVersion |
|---|---|
| v1.0.0 | ^1.0.0 |
| v1.1.0 | ^1.0.0 \|\| ^1.1.0 |
| v1.2.0 | ^1.0.0 \|\| ^1.1.0 \|\| ^1.2.0 |

> BFF owner 升级时,在此表加一行。
