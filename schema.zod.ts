// catalog-contracts / schema.zod.ts
// 与 schema.ts 对应的 zod runtime validator。
// CI 跑 sync-catalog.ts 时用 ModelCatalogEntrySchema.parse() 校验 describe() 输出。

import { z } from "zod";

export const CreditCostRuleSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("fixed"),
    amount: z.number().nonnegative(),
  }),
  z.object({
    type: z.literal("perUnit"),
    paramRef: z.string().min(1),
    table: z.record(z.string(), z.number().nonnegative()),
  }),
]);

const paramBase = {
  name: z.string().min(1),
  labelKey: z.string().min(1),
  required: z.boolean().optional(),
};

export const ParamSchema = z.discriminatedUnion("type", [
  z.object({
    ...paramBase,
    type: z.literal("enum"),
    options: z
      .array(
        z.object({
          value: z.string().min(1),
          labelKey: z.string().optional(),
          label: z.string().optional(),
        }),
      )
      .min(1),
    defaultValue: z.string().optional(),
  }),
  z.object({
    ...paramBase,
    type: z.literal("number"),
    min: z.number().optional(),
    max: z.number().optional(),
    step: z.number().positive().optional(),
    defaultValue: z.number().optional(),
  }),
  z.object({
    ...paramBase,
    type: z.literal("text"),
    defaultValue: z.string().optional(),
    placeholderKey: z.string().optional(),
  }),
  z.object({
    ...paramBase,
    type: z.literal("boolean"),
    defaultValue: z.boolean().optional(),
  }),
  z.object({
    ...paramBase,
    type: z.literal("file"),
    accept: z.string().optional(),
  }),
]);

export const ModelCatalogEntrySchema = z.object({
  modelId: z.string().min(1),
  toolSlug: z.string().min(1),
  tierId: z.string().min(1),
  workerKind: z.string().min(1),
  falModel: z.string().min(1),
  creditCost: CreditCostRuleSchema,
  params: z.array(ParamSchema),
  supportsReferenceImage: z.boolean().optional(),
  schemaVersion: z.string().regex(/^\d+\.\d+\.\d+$/, "must be semver"),
  handlerVersion: z.string().min(1),
  deprecated: z.boolean().optional(),
  deprecatedAlternatives: z.array(z.string()).optional(),
});

export const WorkerCatalogEntrySchema = z.object({
  endpoint: z.string().url(),
  authEnvKey: z.string().min(1),
});
