// catalog-contracts / schema.zod.ts
//
// 与 schema.ts 对应的 zod runtime validator。
//
// 使用场景:
//   1. 后端 CI sync-catalog.ts:校验 handler describe() 输出
//   2. 后端 handler 内部:运行时校验用户提交的 params(后端 A3 要求)
//   3. BFF catalog-cache:解析 KV entry 时校验,graceful skip 不合法 entry
//
// 命名约定:所有 zod schema 用 XxxSchema 后缀(官方惯例),TS 类型同名不带后缀。
//
// zod 版本兼容:peerDep ^3.23.0 || ^4.0.0
//   - discriminatedUnion 的 case 必须是 plain ZodObject,不能 .refine() 包装
//     (zod 3.x 不支持,4.x 才支持)
//   - 跨字段 refine 已移到 ModelCatalogEntrySchema 顶层 superRefine()

import { z } from "zod";

export const CreditCostRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fixed"),
    amount: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("perUnit"),
    paramRef: z.string().min(1),
    table: z.record(z.string(), z.number().int().nonnegative()),
  }),
]);

/**
 * ParamOption —— enum case 的选项。
 * refine:labelKey 或 label 至少一项必填(refine #3)。
 */
export const ParamOptionSchema = z.object({
  value: z.string().min(1),
  labelKey: z.string().optional(),
  label: z.string().optional(),
}).refine(
  (v) => v.labelKey != null || v.label != null,
  { message: "ParamOption 必须有 labelKey 或 label 之一" },
);

/**
 * ParamSchema zod validator —— discriminated union。
 *
 * 注:case 内部不放 .refine()(zod 3.x 的 discriminatedUnion 不接受
 * ZodEffects 包装,会抛 "Cannot read properties of undefined")。
 * 跨字段 refine(min ≤ max)在 ModelCatalogEntrySchema 顶层 superRefine 处理。
 */
export const ParamSchemaSchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().min(1),
    type: z.literal("enum"),
    labelKey: z.string().min(1),
    options: z.array(ParamOptionSchema).min(1),
    defaultValue: z.string().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    name: z.string().min(1),
    type: z.literal("number"),
    labelKey: z.string().min(1),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    defaultValue: z.number().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    name: z.string().min(1),
    type: z.literal("text"),
    labelKey: z.string().min(1),
    defaultValue: z.string().optional(),
    placeholderKey: z.string().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    name: z.string().min(1),
    type: z.literal("boolean"),
    labelKey: z.string().min(1),
    defaultValue: z.boolean().optional(),
    required: z.boolean().optional(),
  }),
  z.object({
    name: z.string().min(1),
    type: z.literal("file"),
    labelKey: z.string().min(1),
    accept: z.string().optional(),
    required: z.boolean().optional(),
  }),
]);

/**
 * semver 简化校验(MAJOR.MINOR.PATCH),不强制预发布后缀。
 * 完整 semver 校验留给具体使用方,本契约只保证基本格式。
 */
const SemverSchema = z.string().regex(/^\d+\.\d+\.\d+$/, {
  message: "version 必须是 MAJOR.MINOR.PATCH 格式",
});

export const ModelCatalogEntrySchema = z.object({
  modelId: z.string().min(1),
  toolSlug: z.string().min(1),
  tierId: z.string().min(1),
  workerKind: z.string().min(1),
  falModel: z.string().min(1),
  schemaVersion: SemverSchema,
  handlerVersion: z.string().min(1),
  creditCost: CreditCostRuleSchema,
  params: z.array(ParamSchemaSchema),
  maxDimension: z.number().int().positive().optional(),
  supportsQueue: z.boolean().optional(),
  supportsReferenceImage: z.boolean().optional(),
  maxReferenceImages: z.number().int().positive().optional(),
  deprecated: z.boolean().optional(),
  deprecatedAlternatives: z.array(z.string().min(1)).optional(),
}).superRefine((v, ctx) => {
  // refine #4:deprecated → 必须带非空 deprecatedAlternatives
  if (v.deprecated && (v.deprecatedAlternatives == null || v.deprecatedAlternatives.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["deprecatedAlternatives"],
      message: "deprecated: true 时必须提供非空 deprecatedAlternatives",
    });
  }
  // refine #5:非 deprecated → maxDimension 必填
  // codify scripts/verify-catalog.ts 已有的程序化豁免：deprecated tombstone
  // 是 §8.4 历史 entry（handler 已删，describe() 不再写），其 maxDimension
  // 字段在 schema 加 required 前就缺失，强制必填会让 BFF safeParse 把整个
  // tombstone skip 掉，连累同 toolSlug 下其他 entry 的 catalog-cache。
  if (!v.deprecated && v.maxDimension == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxDimension"],
      message: "非 deprecated entry 必须提供 maxDimension（deprecated tombstone 豁免）",
    });
  }
  // refine #2:number case 的 min ≤ max(单边提供时不触发)
  v.params.forEach((p, i) => {
    if (p.type === "number" && p.min != null && p.max != null && p.min > p.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["params", i, "min"],
        message: "min 不能大于 max",
      });
    }
  });
});

export const WorkerCatalogEntrySchema = z.object({
  endpoint: z.string().url(),
  authEnvKey: z.string().min(1),
});
