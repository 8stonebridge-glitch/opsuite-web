#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const cliCommand = process.argv[2] ?? "health";
const cliArgs = process.argv.slice(3);

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
      env: process.env,
    });
    let stdout = "";
    let stderr = "";

    if (options.capture) {
      child.stdout?.on("data", (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
        return;
      }

      reject(
        new Error(
          stderr.trim() || `Command failed: ${command} ${args.join(" ")}`
        )
      );
    });
  });
}

await run("node", ["scripts/local-stack.mjs", "up"]);
await run("npm", ["run", "build"]);
await run("node", ["dist/cli/aes-platform.js", cliCommand, ...cliArgs]);
