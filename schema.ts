// catalog-contracts / schema.ts
// 跨 Worker catalog 契约的 TS 类型定义（单一 source of truth）。
// 对应 docs/架构.md v1.6 附录 B（§13.2）。
//
// schemaVersion: 1.0.0
// 任何结构性变更（删字段/改类型）必须 MAJOR bump + 更新 CHANGELOG.md + 通知前端 owner。

export type WorkerKind = string;
// 约定格式 "<type>-workers"，如 "image-workers" / "audio-workers"。
// 字符串而非字面量联合 —— §2.2 容量逃生阀允许 image-workers-2 等。

export type CreditCostRule =
  | { type: "fixed"; amount: number }
  | { type: "perUnit"; paramRef: string; table: Record<string, number> };

export type ParamSchema =
  | {
      name: string;
      type: "enum";
      labelKey: string;
      options: Array<{ value: string; labelKey?: string; label?: string }>;
      defaultValue?: string;
      required?: boolean;
    }
  | {
      name: string;
      type: "number";
      labelKey: string;
      min?: number;
      max?: number;
      step?: number;
      defaultValue?: number;
      required?: boolean;
    }
  | {
      name: string;
      type: "text";
      labelKey: string;
      defaultValue?: string;
      placeholderKey?: string;
      required?: boolean;
    }
  | {
      name: string;
      type: "boolean";
      labelKey: string;
      defaultValue?: boolean;
      required?: boolean;
    }
  | {
      name: string;
      type: "file";
      labelKey: string;
      accept?: string;
      required?: boolean;
    };

export interface ModelCatalogEntry {
  /** 稳定 ID，发布后永不变更（§13.3） */
  modelId: string;
  /** 归属工具 slug，BFF 用于反向聚合（不写 tool:<slug> KV，§3.6.5） */
  toolSlug: string;
  /** 档位标识，BFF 用于 UI 分组（如 "standard" / "pro" / "master"） */
  tierId: string;
  /** 路由到哪个 Worker，约定格式 "<type>-workers" */
  workerKind: string;
  /** 实际 fal 模型名（可换），与 handler 的 fal_endpoint 解耦 */
  falModel: string;
  /** 积分规则 */
  creditCost: CreditCostRule;
  /** 参数 schema 数组 */
  params: ParamSchema[];
  /** 是否支持参考图（image 类特有） */
  supportsReferenceImage?: boolean;
  /** 全局 schema 版本，semver（§13.4） */
  schemaVersion: string;
  /** 局部 handler 版本，自由格式（建议 git short SHA） */
  handlerVersion: string;
  /** 弃用标记（§8.4） */
  deprecated?: boolean;
  /** 弃用时的替代 modelId 列表 */
  deprecatedAlternatives?: string[];
}

/** BFF 写的 worker 元数据 entry（后端 handler 不写此项） */
export interface WorkerCatalogEntry {
  /** 公网 endpoint URL */
  endpoint: string;
  /** BFF 持有的 secret 环境变量名 */
  authEnvKey: string;
}

/** 当前 schema 版本，所有新 entry 必须用此值 */
export const CURRENT_SCHEMA_VERSION = "1.0.0";
