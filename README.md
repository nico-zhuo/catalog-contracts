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

## Param Exposure Principle(参数暴露原则)

> **规则**:`ModelCatalogEntry.params` 只暴露**终端用户业务上应该决策的参数**。
> handler 作者认为"用户不需要操心"的参数,进 `defaults` 或 handler 内部常量,不进 catalog。

此原则是 **catalog 单一 source of truth 契约的补强**(架构 §3.6):前端 / BFF 拿到 `params` 后**无权再加过滤层**,直接渲染 / 透传。因此后端必须保证 `params` 里每一项都是"给用户看的"。

### 三类参数应进 `defaults`,不进 `catalog.params`

| 类别 | 例子 | 不暴露的理由 |
|---|---|---|
| **安全相关** | `enable_safety_checker`、`guidance_scale` 下限 | 终端用户不应能关闭安全机制 |
| **性能 / 成本相关** | `num_inference_steps`、`num_images`、`max_tokens` | 直接影响 GPU 用量与 fal 计费,若与 creditCost 不绑定,用户可烧 GPU 而不扣积分 |
| **技术细节** | `output_format`、`seed`、`sample_rate`、`response_format` | 用户无感知,改了多半是错误决策 |

### 决策流程(写 handler 时过一遍)

```
新参数 P 要暴露吗?
│
├─ P 是否影响用户业务结果(画面比例 / 音色 / 速度 / 风格)?
│  └─ 是 → 进 catalog.params
│
├─ P 关闭/调低是否产生安全或合规风险?
│  └─ 是 → 进 defaults(写死合理值,不接受客户端覆盖)
│
├─ P 增大是否显著抬高成本但 creditCost 规则不覆盖?
│  └─ 是 → 进 defaults;若想暴露,必须同时设计 creditCost 联动
│
└─ P 是 fal 技术参数,用户改了无业务感知?
   └─ 是 → 进 defaults
```

### 同时调整 `accepted_params`

`accepted_params`(或自写 handler 的等价白名单)**必须与 `catalog.params` 同步收紧**。否则:
- catalog 不暴露但 handler 仍接受 → 用 Postman 绕过 UI 仍能传 `enable_safety_checker=false`
- 这是**安全 illusion**:UI 看不到 ≠ API 调不到

正确做法:

```ts
// ❌ 反例
accepted_params: ["prompt", "aspect_ratio", "enable_safety_checker"],
defaults: { enable_safety_checker: true },
catalog: { params: [prompt, aspect_ratio] }  // 隐藏了,但 handler 仍接受

// ✅ 正例
accepted_params: ["prompt", "aspect_ratio"],  // ← 同步移除
defaults: { enable_safety_checker: true },     // ← handler 内部强行写入
catalog: { params: [prompt, aspect_ratio] }
```

### 工厂里的实现模式

走 `createStandardAudioHandler` / 类似工厂的模型,handler 作者需:

1. `accepted_params` 只列用户业务参数
2. `defaults` 写入所有应隐藏的 fal 参数
3. `catalog.params` 与 `accepted_params` 严格对齐(外加纯计费参数如 `charLimit`,handler 内部用作 creditCost 计算但不转发 fal)

自写 handler 同理,在 input 组装时显式写入 `defaults` 值,不从 body 取。

### 示例

**kokoro-tts(audio-workers):✅ 正例**
- `accepted_params`: `["prompt", "voice", "speed"]`
- `defaults`: `{ voice: "af_heart", speed: 1 }`
- `catalog.params`: `[prompt, voice, speed, charLimit]`
  - `charLimit` 在 catalog 但不在 `accepted_params` —— 纯计费参数,handler 内部用作 creditCost 查表,不转发 fal

**minimax-speech-02-hd(audio-workers):⚠️ 待复查**
- 当前 `catalog.params` 含 `vol` / `pitch` / `english_normalization` / `audio_sample_rate`
- 按本原则:`audio_sample_rate`(技术细节)应收进 `defaults`;`vol` / `pitch` / `english_normalization` 视工具定位决定(若定位是"高级用户调音台"可保留,若定位是"一键配音"应收默认值)

**hypothetical flux schnell(image-workers):❌ 反例**
- ❌ `catalog.params`: `[prompt, aspect_ratio, resolution, num_images, num_inference_steps, output_format, enable_safety_checker]`
- ✅ 应改为:
  ```ts
  accepted_params: ["prompt", "aspect_ratio", "resolution"],
  defaults: {
    num_images: 1,
    num_inference_steps: 4,        // schnell 模型步数固定
    output_format: "png",
    enable_safety_checker: true,   // 强制开
  },
  catalog: { params: [prompt, aspect_ratio, resolution] }
  ```

### 跨角色契约

- **后端 handler 作者**:遵守本原则。新增 handler PR 时 self-review 三类应隐藏参数。
- **catalog-contracts maintainer**:review handler PR 时按此原则把关(无法机械校验,语义判断)。
- **BFF / 前端**:拿到 `catalog.params` 后直接渲染,不加过滤层。若发现 params 异常过多,反向反馈给对应 worker 仓 owner,不在 BFF / 前端侧补过滤。
- **verify-catalog.ts**:不校验本原则(无法静态判断"业务上该不该暴露")。本原则靠 review + 跨团队共识执行。

### 何时修订本原则

- 前端出现"某些参数需要分场景暴露"的真实需求 → 考虑加 `visibility: "advanced"` 字段(bump MINOR `schemaVersion`)
- 出现"用户绕过 UI 传危险参数"事故 → 收紧原则或加运行时校验
