// catalog-contracts / schema.ts
//
// 跨 Worker catalog 契约的 TS 类型定义(单一 source of truth)。
// 对应 docs/架构.md v1.6 附录 B(§13.2)。
//
// 修改本文件必须同步:
//   1. 更新 schema.zod.ts(zod validator)
//   2. 更新 CHANGELOG.md(按 bump 规则记录 schemaVersion)
//   3. 通知前端 owner(若改了 ParamSchema 联合类型)

/** Worker 类型。约定格式 "<type>-workers",如 "image-workers" / "audio-workers"。 */
export type WorkerKind = string;

/**
 * 积分计费规则。
 *
 * - fixed:固定积分,如文生图 standard 档每次 10 积分
 * - perUnit:按某参数阶梯计费,如 TTS 按 charLimit:1000/2000/3000 三档
 *           perUnit 已覆盖原 perResolution 场景(paramRef 指向 "resolution" 即可)
 */
export type CreditCostRule =
  | { type: "fixed"; amount: number }
  | { type: "perUnit"; paramRef: string; table: Record<string, number> };

/**
 * 参数 schema —— discriminated union。
 *
 * 前端 ParamForm 渲染时按 type 分支,每个 case 拿到精确字段类型。
 * 新增 ParamType 时:
 *   1. 在此 union 加成员
 *   2. 在 schema.zod.ts 加对应 zod schema
 *   3. 同步通知前端 owner 补 ParamForm case(assertNever 编译期守卫会强制)
 *
 * 当前覆盖 5 种参数形态,预计 ≤ 2 种/年扩展(详见 README.md)。
 */
export type ParamSchema =
  | {
      name: string;
      type: "enum";
      labelKey: string;
      options: Array<{
        value: string;
        /** i18n key(优先,前端翻译文件维护) */
        labelKey?: string;
        /** 纯文本 fallback(无 i18n key 时用,如 "1:1") */
        label?: string;
      }>;
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
      /** MIME type 过滤,如 "image/*" */
      accept?: string;
      required?: boolean;
    };

/**
 * 单个 model 的 catalog entry。
 *
 * 物理位置:KV["model:<type>:<modelId>"],由后端 CI sync-catalog.ts 写入。
 *
 * 后端契约 3:一旦发布永不变更。底层 falModel 可换,modelId 是对客户端的稳定句柄。
 * 改名走 §8.4 弃用流程 6 步(新建新 ID + 旧 ID 标 deprecated + 等 KV 过期 + 删)。
 */
export interface ModelCatalogEntry {
  /**
   * 稳定 ID,如 "kokoro-tts"、"flux-1-schnell"。
   * 命名约定:全小写 + 连字符,不含版本号后缀,不含 worker 类型前缀。
   */
  modelId: string;

  /** 归属工具,如 "ai-character-voice"、"ai-text-to-image"。稳定。BFF 用于反向聚合。 */
  toolSlug: string;

  /** 档位,如 "standard" / "pro" / "master"。稳定。 */
  tierId: string;

  /** 路由到哪个 worker,如 "audio-workers"。BFF 通过此字段查 worker:<kind> 元数据。 */
  workerKind: WorkerKind;

  /** 实际 fal endpoint,如 "fal-ai/flux/schnell"。可换(同 modelId 换底层模型时改)。 */
  falModel: string;

  /**
   * 全局 schema 版本(语义化 semver),必须等于 CURRENT_SCHEMA_VERSION。
   *
   * bump 规则(详见 CHANGELOG.md):
   *   - MAJOR:删字段 / 改字段类型 / 改字段语义
   *   - MINOR:加可选字段 / 加 enum 成员
   *   - PATCH:文案 / 默认值 / 选项 labelKey
   *
   * BFF 拉到 entry 时检查 schemaVersion 是否在支持范围内,
   * 不在则该 model 标 unavailable,UI 灰显「该模型暂时不可用」。
   */
  schemaVersion: string;

  /**
   * 局部 handler 版本(建议 git short SHA)。
   *
   * 与 schemaVersion 解耦:handler config 改(如 param_mapping 调整)只 bump handlerVersion,
   * 不影响 schemaVersion。用于审计 / 排查 / 灰度。
   */
  handlerVersion: string;

  /** 积分规则。BFF 服务端权威计算(防篡改),前端显示用同函数。 */
  creditCost: CreditCostRule;

  /** 参数 schema 数组。前端 ParamForm 按 type 分支渲染。 */
  params: ParamSchema[];

  /** 是否支持参考图(I2I)。决定折叠态是否显示占位框。 */
  supportsReferenceImage?: boolean;

  /**
   * 弃用标记(§8.4 弃用流程第 1 步)。
   *
   * - true:BFF 在 /generate 路径返回 410 MODEL_DEPRECATED + body.alternatives
   * - true:前端 UI 灰显该档位 + 提示用户切换
   * - /status 仍服务在途请求(契约 3)
   */
  deprecated?: boolean;

  /** 弃用时的替代 modelId 列表。deprecated:true 时必填且非空。 */
  deprecatedAlternatives?: string[];
}

/**
 * Worker 元数据 entry。物理位置 KV["worker:<workerKind>"]。
 *
 * 由 BFF 部署时写一次(前端 owner 责任),后端完全不参与。
 * 后端 handler describe() 输出只含 workerKind,不含 endpoint / authEnvKey。
 */
export interface WorkerCatalogEntry {
  /** Worker 公网入口,如 "https://image-workers.fal.arui.ai"。 */
  endpoint: string;

  /** BFF 持有的 secret 环境变量名,BFF 自己拼装鉴权头。 */
  authEnvKey: string;
}

/** 当前 schema 版本,所有新 entry 必须用此值。 */
export const CURRENT_SCHEMA_VERSION = "1.0.0";
