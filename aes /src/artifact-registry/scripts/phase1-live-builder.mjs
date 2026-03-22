#!/usr/bin/env node

/**
 * AES Phase 1 — Live Builder Test
 *
 * This script spawns Claude as the REAL builder.
 * It passes a bridge prompt and lets Claude write actual code.
 * Then it runs real tests and validates the output.
 *
 * Usage:
 *   node scripts/phase1-live-builder.mjs
 *
 * Requirements:
 *   - `claude` CLI must be on PATH
 *   - Working directory will be a temp workspace
 */

import { execSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";

const WORKSPACE = resolve(import.meta.dirname, "..", "tests", "phase1-live-workspace");
const TIMEOUT_MS = 120_000; // 2 minutes for Claude to build

// ─── Setup ───────────────────────────────────────────────────────────────────

function setup() {
  if (existsSync(WORKSPACE)) rmSync(WORKSPACE, { recursive: true });
  mkdirSync(join(WORKSPACE, "src"), { recursive: true });
  mkdirSync(join(WORKSPACE, "__tests__"), { recursive: true });

  // Write a minimal tsconfig for the workspace
  writeFileSync(join(WORKSPACE, "tsconfig.json"), JSON.stringify({
    compilerOptions: {
      target: "ES2022",
      module: "commonjs",
      strict: true,
      esModuleInterop: true,
      outDir: "./dist",
      rootDir: ".",
      declaration: true,
      resolveJsonModule: true,
    },
    include: ["src/**/*.ts", "__tests__/**/*.ts"],
  }, null, 2));

  // Write package.json so jest can find ts-jest
  writeFileSync(join(WORKSPACE, "package.json"), JSON.stringify({
    name: "aes-live-build-test",
    version: "0.0.1",
    private: true,
    scripts: {
      test: "jest --runInBand --no-cache",
    },
    devDependencies: {
      jest: "^29.0.0",
      "ts-jest": "^29.0.0",
      typescript: "^5.0.0",
      "@types/jest": "^29.0.0",
    },
  }, null, 2));

  console.log(`[AES] Workspace created: ${WORKSPACE}`);
}

// ─── Bridge ──────────────────────────────────────────────────────────────────

function buildBridgePrompt() {
  const bridge = {
    bridge_id: `BRG-LIVE-${Date.now()}`,
    build_id: `BLD-LIVE-${Date.now()}`,
    feature_id: "FEAT-TODO-LIVE-001",
    intent: "Build a todo CRUD service with create, read, update, delete, and list operations",
    write_scope: { paths: ["src/", "__tests__/"] },
    read_scope: { paths: ["src/", "__tests__/", "tsconfig.json", "package.json"] },
    constraints: [
      "Write TypeScript only",
      "Use in-memory storage (Map), no external database",
      "Validate inputs — reject empty titles, throw Error with descriptive messages",
      "All timestamps must be ISO 8601 strings",
      "Export a clearStore() function that resets all state (for test isolation)",
      "Each todo must have: id (string), title (string), completed (boolean), created_at (string), updated_at (string)",
    ],
    patterns: [
      "Service layer pattern — export pure functions, no classes",
      "Separate model types from service logic into different files",
    ],
    anti_patterns: [
      "Do NOT use classes — use exported functions",
      "Do NOT use external packages — only Node.js built-ins and TypeScript",
      "Do NOT create an HTTP server — this is a service layer only",
    ],
    acceptance_criteria: [
      { id: "ac-1", description: "createTodo(input) creates a todo with generated id, title, completed=false, timestamps", mandatory: true },
      { id: "ac-2", description: "getTodo(id) returns a todo by id or undefined if not found", mandatory: true },
      { id: "ac-3", description: "listTodos() returns all todos as an array", mandatory: true },
      { id: "ac-4", description: "updateTodo(id, input) updates title and/or completed, updates updated_at", mandatory: true },
      { id: "ac-5", description: "deleteTodo(id) removes a todo, returns boolean", mandatory: true },
      { id: "ac-6", description: "createTodo rejects empty or whitespace-only titles with an Error", mandatory: true },
      { id: "ac-7", description: "updateTodo throws Error when todo not found", mandatory: true },
    ],
    test_requirements: [
      "Write Jest tests using ts-jest",
      "Tests must import from '../src/todo-service' (relative path)",
      "Call clearStore() in beforeEach to reset state between tests",
      "Test file should be at __tests__/todo-service.test.ts",
      "Cover all 7 acceptance criteria above",
      "At least 7 test cases",
    ],
    file_structure: {
      "src/todo-model.ts": "TypeScript interfaces for Todo, CreateTodoInput, UpdateTodoInput",
      "src/todo-service.ts": "Service functions: createTodo, getTodo, listTodos, updateTodo, deleteTodo, clearStore",
      "__tests__/todo-service.test.ts": "Jest tests covering all acceptance criteria",
    },
  };

  const prompt = [
    "You are the AES builder worker. Execute the bridge below precisely.",
    "Stay within AES_WRITE_SCOPE. Do not create files outside src/ and __tests__/.",
    "Do not install packages. Do not create an HTTP server.",
    "Do not ask questions. Just write the files.",
    "",
    `Build ID: ${bridge.build_id}`,
    `Bridge ID: ${bridge.bridge_id}`,
    `Feature ID: ${bridge.feature_id}`,
    `Working directory: ${WORKSPACE}`,
    "",
    "Bridge JSON:",
    JSON.stringify(bridge, null, 2),
    "",
    "IMPORTANT: Write exactly these files:",
    "1. src/todo-model.ts — TypeScript interfaces",
    "2. src/todo-service.ts — Service implementation with all CRUD functions + clearStore",
    "3. __tests__/todo-service.test.ts — Jest tests with ts-jest, import from '../src/todo-service'",
    "",
    "After writing, finish with a concise summary of what you created.",
  ].join("\n");

  return { bridge, prompt };
}

// ─── Spawn Claude ────────────────────────────────────────────────────────────

function spawnClaude(prompt) {
  return new Promise((resolve, reject) => {
    console.log(`[AES] Spawning Claude builder...`);
    console.log(`[AES] CWD: ${WORKSPACE}`);
    console.log(`[AES] Timeout: ${TIMEOUT_MS / 1000}s`);

    const child = spawn("claude", ["-p", prompt, "--allowedTools", "Write,Edit,Read,Glob,Grep,Bash"], {
      cwd: WORKSPACE,
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        AES_SESSION_ROLE: "builder",
        AES_WRITE_SCOPE: JSON.stringify(["src/", "__tests__/"]),
        AES_READ_SCOPE: JSON.stringify(["src/", "__tests__/", "tsconfig.json", "package.json"]),
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
    });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Builder timed out after ${TIMEOUT_MS / 1000}s`));
    }, TIMEOUT_MS);

    child.on("close", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// ─── Capture Diff ────────────────────────────────────────────────────────────

function captureDiff() {
  const files = [];

  function scan(dir, prefix = "") {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist") {
        scan(join(dir, entry.name), rel);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const content = readFileSync(join(dir, entry.name), "utf-8");
        files.push({
          path: rel,
          lines: content.split("\n").length,
          content,
        });
      }
    }
  }

  scan(WORKSPACE);
  return files;
}

// ─── Run Tests ───────────────────────────────────────────────────────────────

function runTests() {
  // First install deps in the workspace (uses parent node_modules)
  try {
    // Use the parent project's jest and ts-jest
    const parentDir = resolve(WORKSPACE, "..", "..");
    const result = execSync(
      `npx jest --roots "${WORKSPACE}" --config '${JSON.stringify({
        preset: "ts-jest",
        testEnvironment: "node",
        roots: [WORKSPACE],
        modulePaths: [WORKSPACE],
      })}' --no-cache --runInBand 2>&1`,
      {
        cwd: parentDir,
        timeout: 30000,
        encoding: "utf-8",
      }
    );

    const passMatch = result.match(/Tests:\s+(\d+) passed/);
    const failMatch = result.match(/(\d+) failed/);

    return {
      success: !result.includes("FAIL"),
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
      output: result,
    };
  } catch (err) {
    const output = err.stdout?.toString() ?? err.message;
    const passMatch = output.match(/Tests:\s+(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);

    return {
      success: false,
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
      output,
    };
  }
}

// ─── Validate ────────────────────────────────────────────────────────────────

function validate(files, testResult, bridge) {
  const violations = [];
  const concerns = [];

  // Scope check
  for (const file of files) {
    const inScope = bridge.write_scope.paths.some(s => file.path.startsWith(s));
    if (!inScope) {
      violations.push(`File ${file.path} outside write_scope`);
    }
  }

  // Required files check
  const requiredFiles = Object.keys(bridge.file_structure);
  for (const req of requiredFiles) {
    if (!files.some(f => f.path === req)) {
      violations.push(`Missing required file: ${req}`);
    }
  }

  // Test results check
  if (!testResult.success) {
    violations.push(`Tests failed: ${testResult.failed} failures`);
  }

  if (testResult.passed < 7) {
    concerns.push(`Only ${testResult.passed} tests passed, expected at least 7`);
  }

  return {
    passed: violations.length === 0,
    violations,
    concerns,
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  AES Phase 1 — Live Builder (Claude as Builder)  ");
  console.log("═══════════════════════════════════════════════════\n");

  // Step 1: Setup
  setup();

  // Step 2: Build bridge prompt
  const { bridge, prompt } = buildBridgePrompt();
  console.log(`[AES] Bridge: ${bridge.bridge_id}`);
  console.log(`[AES] Feature: ${bridge.feature_id}`);
  console.log(`[AES] Intent: ${bridge.intent}\n`);

  // Step 3: Spawn Claude
  console.log("─── Builder Output ─────────────────────────────────\n");
  const builderResult = await spawnClaude(prompt);
  console.log("\n─── End Builder Output ─────────────────────────────\n");

  if (builderResult.code !== 0) {
    console.error(`[AES] Builder exited with code ${builderResult.code}`);
    if (builderResult.stderr) console.error(`[AES] stderr: ${builderResult.stderr}`);
  }

  // Step 4: Capture diff
  const files = captureDiff();
  console.log(`[AES] Files generated by Claude:`);
  for (const f of files) {
    console.log(`  ${f.path} (${f.lines} lines)`);
  }
  console.log();

  if (files.length === 0) {
    console.error("[AES] FATAL: Claude generated no files. Build failed.");
    process.exit(1);
  }

  // Step 5: Run real tests
  console.log("[AES] Running tests against Claude's code...\n");
  const testResult = runTests();
  console.log(`[AES] Tests: ${testResult.passed} passed, ${testResult.failed} failed`);
  console.log(`[AES] Success: ${testResult.success}\n`);

  // Step 6: Validate
  const validation = validate(files, testResult, bridge);
  console.log(`[AES] Validation: ${validation.passed ? "PASSED" : "FAILED"}`);
  if (validation.violations.length > 0) {
    console.log(`[AES] Violations:`);
    for (const v of validation.violations) console.log(`  - ${v}`);
  }
  if (validation.concerns.length > 0) {
    console.log(`[AES] Concerns:`);
    for (const c of validation.concerns) console.log(`  - ${c}`);
  }

  // Step 7: Summary
  console.log("\n═══════════════════════════════════════════════════");
  console.log("  RESULTS");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Bridge:      ${bridge.bridge_id}`);
  console.log(`  Builder:     claude (real AI)`);
  console.log(`  Files:       ${files.length} generated`);
  console.log(`  Lines:       ${files.reduce((sum, f) => sum + f.lines, 0)} total`);
  console.log(`  Tests:       ${testResult.passed} passed, ${testResult.failed} failed`);
  console.log(`  Validation:  ${validation.passed ? "PASSED ✓" : "FAILED ✗"}`);
  console.log(`  Violations:  ${validation.violations.length}`);
  console.log(`  Concerns:    ${validation.concerns.length}`);
  console.log("═══════════════════════════════════════════════════\n");

  // Write results to disk for the registry to ingest later
  const report = {
    timestamp: new Date().toISOString(),
    bridge,
    builder: "claude",
    files: files.map(f => ({ path: f.path, lines: f.lines })),
    test_result: {
      success: testResult.success,
      passed: testResult.passed,
      failed: testResult.failed,
    },
    validation,
  };

  writeFileSync(
    join(WORKSPACE, "build-report.json"),
    JSON.stringify(report, null, 2)
  );
  console.log(`[AES] Report written to ${join(WORKSPACE, "build-report.json")}`);

  process.exit(validation.passed ? 0 : 1);
}

main().catch((err) => {
  console.error("[AES] Fatal error:", err.message);
  process.exit(1);
});
