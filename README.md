# catalog-contracts

跨 Worker catalog 契约的单一 source of truth。所有 Worker 仓(image-workers / audio-workers / 3d-workers / compliance-workers)+ BFF 通过 git submodule 引入。

## 用法

```typescript
// 在 Worker handler 里:
import type { ModelCatalogEntry } from "../../vendor/catalog-contracts/schema";

describe(): ModelCatalogEntry {
  return { modelId: "...", /* ... */ };
}

// 在 CI 校验脚本里:
import { ModelCatalogEntrySchema } from "../../vendor/catalog-contracts/schema.zod";
ModelCatalogEntrySchema.parse(entry);  // 不通过 throw
```

## 文件

```
catalog-contracts/
├── schema.ts            ← TS 类型定义(discriminated union)
├── schema.zod.ts        ← zod runtime validator
├── scripts/
│   └── smoke-test.ts    ← 跨 zod 版本 smoke test
├── fixtures/
│   ├── valid-entry.json ← 合法 entry 样本
│   └── invalid-entries.json ← 负向用例(覆盖 4 个 refine)
├── .github/workflows/
│   └── smoke.yml        ← CI matrix:node 24 × zod {3.23, 4.4}
├── CHANGELOG.md         ← schemaVersion 变更记录
├── README.md            ← 本文件
├── tsconfig.json
└── package.json
```

## 命名约定

所有 zod schema 用 `XxxSchema` 后缀(官方惯例),对应的 TS 类型同名不带后缀:

| TS 类型 | zod schema |
|---------|-----------|
| `ModelCatalogEntry` | `ModelCatalogEntrySchema` |
| `WorkerCatalogEntry` | `WorkerCatalogEntrySchema` |
| `ParamSchema` | `ParamSchemaSchema` |
| `CreditCostRule` | `CreditCostRuleSchema` |
| (`ParamOption`) | `ParamOptionSchema` |

## 维护责任

跨团队共享仓,schema 变更必须:
1. 改 `schema.ts` + `schema.zod.ts` 同步
2. 按以下规则 bump `CURRENT_SCHEMA_VERSION`:
   - MAJOR:删字段 / 改字段类型 / 改字段语义
   - MINOR:加可选字段 / 加 enum 成员
   - PATCH:文案 / 默认值 / 选项 labelKey
3. CHANGELOG.md 记录变更
4. 后端 + 前端 owner 共同 review(开 PR,不 force-push)

## zod 版本兼容性

`peerDependencies` 放宽到 `^3.23.0 || ^4.0.0`,前端用 4.x,后端用 3.x。

CI matrix(node 24 × zod {3.23.8, 4.4.3})对每条 PR 跑 smoke test,确保:
- schema.zod.ts 只用两个版本都稳定的 API 子集
- 4 个 refine 行为在两个版本下一致
- 任何误用 4.x 独有 API(如 `discriminatedUnion` 内部 `.refine()`)→ 3.23 fail,PR 拦

**已知陷阱**:zod 3.x 的 `discriminatedUnion` 不接受被 `.refine()` 包装的 case。跨字段 refine 必须放到顶层 `superRefine()` 处理。

## 4 个 refine

| # | 位置 | 触发条件 |
|---|------|---------|
| 1 | `ParamSchemaSchema` enum case | `options` 数组 < 1 个 |
| 2 | `ModelCatalogEntrySchema` 顶层 superRefine | number case `min > max`(两边都提供才触发) |
| 3 | `ParamOptionSchema` | 缺 `labelKey` 且缺 `label` |
| 4 | `ModelCatalogEntrySchema` 顶层 superRefine | `deprecated: true` 但 `deprecatedAlternatives` 缺失/空 |

## 唯一非零接触边界

`ParamSchema.type` 是 discriminated union。**新增 type 成员**(如 `slider` / `tags`)必须:
1. 改 `schema.ts` + `schema.zod.ts`
2. `schemaVersion` MINOR bump
3. **通知前端 owner**(无法 CI 化) —— 前端在 `ParamForm` 组件的 exhaustive switch 加 case,`assertNever(default)` 编译期守卫

预估频率:≤ 2 种/年。

## PR checklist

提交本仓 PR 时,描述里必须勾选以下项:

```
- [ ] schema.ts 与 schema.zod.ts 同步
- [ ] CHANGELOG.md 已记录本次变更
- [ ] CURRENT_SCHEMA_VERSION 按 bump 规则更新
- [ ] CI smoke test 在 zod 3.23 + 4.4 两个 matrix 都绿
- [ ] 是否动了 ParamSchema 联合类型?
      - 是 → 已通知前端 owner(@username)
      - 否 → 跳过
- [ ] 是否动了 ModelCatalogEntry 必填字段?
      - 是 → 已通知所有 worker 仓 owner
      - 否 → 跳过
```
