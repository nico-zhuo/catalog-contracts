/**
 * catalog-contracts/scripts/smoke-test.ts
 *
 * Smoke test:确保 schema.zod.ts 在 zod 3.x 和 4.x 下行为一致。
 *
 * 运行方式(本地 + CI matrix):
 *   pnpm test:smoke              # 用当前 node_modules 里的 zod 版本
 *
 * CI matrix 会在 node 24 × zod {3.23.8, 4.4.3} 各跑一次。
 *
 * 出错时 exit code 1,CI fail。
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  ModelCatalogEntrySchema,
  WorkerCatalogEntrySchema,
} from "../schema.zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "../fixtures");

async function loadJson<T>(file: string): Promise<T> {
  const raw = await readFile(path.join(fixturesDir, file), "utf-8");
  return JSON.parse(raw) as T;
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ❌ ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✅ ${msg}`);
  }
}

async function main() {
  console.log(`[smoke] node version = ${process.version}\n`);

  let pass = 0;
  let fail = 0;

  // === Case 1:合法 entry parse 通过 ===
  console.log("[1] 合法 ModelCatalogEntry 应 parse 通过:");
  try {
    const valid = await loadJson<any>("valid-entry.json");
    const parsed = ModelCatalogEntrySchema.parse(valid);
    assert(parsed.modelId === "kokoro-tts", "modelId 正确解析");
    assert(parsed.params.length === 5, "params 数组完整");
    assert(parsed.creditCost.type === "perUnit", "creditCost perUnit 正确");
    pass++;
  } catch (e) {
    console.error("  ❌ parse 抛错:", (e as Error).message);
    fail++;
  }

  // === Case 2:负向用例 ===
  console.log("\n[2] 负向用例应被拒绝:");
  const cases = await loadJson<Array<{ label: string; entry: any; expectPass: boolean }>>(
    "invalid-entries.json",
  );
  for (const c of cases) {
    let threw = false;
    try {
      ModelCatalogEntrySchema.parse(c.entry);
    } catch {
      threw = true;
    }
    if (c.expectPass) {
      if (!threw) {
        console.log(`  ✅ ${c.label}`);
        pass++;
      } else {
        console.error(`  ❌ ${c.label}(不应抛错却抛了)`);
        fail++;
      }
    } else {
      if (threw) {
        console.log(`  ✅ ${c.label}`);
        pass++;
      } else {
        console.error(`  ❌ ${c.label}(应拒绝却通过了)`);
        fail++;
      }
    }
  }

  // === Case 3:WorkerCatalogEntry 结构校验 ===
  console.log("\n[3] WorkerCatalogEntry:");
  try {
    WorkerCatalogEntrySchema.parse({
      endpoint: "https://audio-workers.fal.arui.ai",
      authEnvKey: "FAL_AUDIO_WORKERS_API_KEY",
    });
    console.log("  ✅ WorkerCatalogEntry parse 通过");
    pass++;
  } catch (e) {
    console.error("  ❌ WorkerCatalogEntry parse 失败:", (e as Error).message);
    fail++;
  }

  // 负向:endpoint 非 URL
  try {
    WorkerCatalogEntrySchema.parse({
      endpoint: "not-a-url",
      authEnvKey: "X",
    });
    console.error("  ❌ WorkerCatalogEntry endpoint 非 URL 应失败");
    fail++;
  } catch {
    console.log("  ✅ WorkerCatalogEntry endpoint 非 URL 被拒绝");
    pass++;
  }

  console.log(`\n[smoke] pass=${pass} fail=${fail}\n`);
  if (fail > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
