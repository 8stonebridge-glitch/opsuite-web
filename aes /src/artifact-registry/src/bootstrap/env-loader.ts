import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

export interface EnvFileLoadResult {
  loaded_files: string[];
}

export function loadBootstrapEnvFiles(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): EnvFileLoadResult {
  const loadedFiles: string[] = [];
  const preservedKeys = new Set(
    Object.keys(env).filter((key) => typeof env[key] === "string")
  );

  for (const relativePath of [".env", ".env.local"]) {
    const resolvedPath = path.resolve(cwd, relativePath);
    if (!existsSync(resolvedPath)) {
      continue;
    }

    const parsed = parse(readFileSync(resolvedPath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!preservedKeys.has(key)) {
        env[key] = value;
      }
    }

    loadedFiles.push(resolvedPath);
  }

  return {
    loaded_files: loadedFiles,
  };
}
