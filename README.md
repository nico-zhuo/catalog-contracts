# catalog-contracts

跨 Worker catalog 契约的单一 source of truth。所有 Worker 仓（image-workers / audio-workers / 3d-workers / compliance-workers）+ BFF 通过 git submodule 引入。

## 用法

```typescript
// 在 Worker handler 里：
import type { ModelCatalogEntry } from "../../vendor/catalog-contracts/schema";

describe(): ModelCatalogEntry {
  return { modelId: "...", /* ... */ };
}

// 在 CI 校验脚本里：
import { ModelCatalogEntrySchema } from "../../vendor/catalog-contracts/schema.zod";
ModelCatalogEntrySchema.parse(entry);  // 不通过 throw
```

## 文件

- `schema.ts` — TS 类型定义（`ModelCatalogEntry` / `WorkerCatalogEntry` / `ParamSchema` / `CreditCostRule`）
- `schema.zod.ts` — zod runtime validator
- `CHANGELOG.md` — schemaVersion 变更记录

## 维护责任

跨团队共享仓，schema 变更必须：
1. 改 `schema.ts` + `schema.zod.ts` 同步
2. 按以下规则 bump `CURRENT_SCHEMA_VERSION`：
   - MAJOR：删字段 / 改字段类型 / 改字段语义
   - MINOR：加可选字段 / 加 enum 成员
   - PATCH：文案 / 默认值 / 选项 labelKey
3. CHANGELOG.md 记录变更
4. 后端 + 前端 owner 共同 review

## 唯一非零接触边界

`ParamSchema.type` 是 discriminated union。**新增 type 成员**（如 `slider` / `tags`）必须：
1. 改 `schema.ts` + `schema.zod.ts`
2. `schemaVersion` MINOR bump
3. **通知前端 owner**（无法 CI 化）—— 前端在 `ParamForm` 组件的 exhaustive switch 加 case，`assertNever(default)` 编译期守卫

预估频率：≤ 2 种/年。
