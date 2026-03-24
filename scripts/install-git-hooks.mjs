import { chmodSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const hooksDir = join(repoRoot, ".githooks");
const prePushHook = join(hooksDir, "pre-push");

function isGitRepo() {
  try {
    execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: repoRoot,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

if (!isGitRepo()) {
  console.log("[prepare] Skipping git hook install: not inside a git worktree.");
  process.exit(0);
}

if (!existsSync(prePushHook)) {
  console.log("[prepare] Skipping git hook install: .githooks/pre-push is missing.");
  process.exit(0);
}

chmodSync(prePushHook, 0o755);

execFileSync(
  "git",
  ["config", "--local", "core.hooksPath", relative(repoRoot, hooksDir) || ".githooks"],
  {
    cwd: repoRoot,
    stdio: "ignore",
  },
);

console.log("[prepare] Installed repo git hooks from .githooks.");
