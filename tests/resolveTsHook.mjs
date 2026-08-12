import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    // 확장자 없는 상대 경로면 .ts / .tsx 를 붙여 다시 찾는다
    if (specifier.startsWith(".") && context.parentURL) {
      for (const ext of [".ts", ".tsx", "/index.ts"]) {
        const candidate = new URL(specifier + ext, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) {
          return nextResolve(specifier + ext, context);
        }
      }
    }
    throw err;
  }
}
