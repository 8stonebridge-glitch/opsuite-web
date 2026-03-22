#!/usr/bin/env node

/**
 * AES Phase 1 — Batch Runner
 *
 * Runs the live builder test N times and reports success rate.
 * Each run gets a clean workspace, a fresh Claude spawn, real tests, real validation.
 */

import { execSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const RUNS = 10;
const TIMEOUT_MS = 120_000;
const BASE_DIR = resolve(import.meta.dirname, "..", "tests");

// ─── Bridge (same every run for consistency) ─────────────────────────────────

function buildBridgePrompt(workspace, runId) {
  const bridge = {
    bridge_id: `BRG-BATCH-${runId}-${Date.now()}`,
    build_id: `BLD-BATCH-${runId}-${Date.now()}`,
    feature_id: `FEAT-TODO-BATCH-${runId}`,
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
    `Working directory: ${workspace}`,
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

function spawnClaude(prompt, workspace) {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["-p", prompt, "--allowedTools", "Write,Edit,Read,Glob,Grep,Bash"], {
      cwd: workspace,
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

    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("timeout"));
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

// ─── Scan Files ──────────────────────────────────────────────────────────────

function scanFiles(workspace) {
  const files = [];
  function walk(dir, prefix = "") {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist") {
        walk(join(dir, entry.name), rel);
      } else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const content = readFileSync(join(dir, entry.name), "utf-8");
        files.push({ path: rel, lines: content.split("\n").length });
      }
    }
  }
  walk(workspace);
  return files;
}

// ─── Run Tests ───────────────────────────────────────────────────────────────

function runTests(workspace) {
  try {
    const parentDir = resolve(workspace, "..", "..");
    const result = execSync(
      `npx jest --roots "${workspace}" --config '${JSON.stringify({
        preset: "ts-jest",
        testEnvironment: "node",
        roots: [workspace],
        modulePaths: [workspace],
      })}' --no-cache --runInBand 2>&1`,
      { cwd: parentDir, timeout: 30000, encoding: "utf-8" }
    );
    const passMatch = result.match(/Tests:\s+(\d+) passed/);
    const failMatch = result.match(/(\d+) failed/);
    return {
      success: !result.includes("FAIL"),
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
    };
  } catch (err) {
    const output = err.stdout?.toString() ?? err.message;
    const passMatch = output.match(/Tests:\s+(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    return {
      success: false,
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
    };
  }
}

// ─── Validate ────────────────────────────────────────────────────────────────

function validate(files, testResult, bridge) {
  const violations = [];
  for (const file of files) {
    const inScope = bridge.write_scope.paths.some(s => file.path.startsWith(s));
    if (!inScope) violations.push(`Scope: ${file.path}`);
  }
  for (const req of Object.keys(bridge.file_structure)) {
    if (!files.some(f => f.path === req)) violations.push(`Missing: ${req}`);
  }
  if (!testResult.success) violations.push(`Tests failed: ${testResult.failed}`);
  return { passed: violations.length === 0, violations };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  AES Phase 1 — Batch Runner (${RUNS} runs)`);
  console.log("═══════════════════════════════════════════════════════════\n");

  const results = [];

  for (let i = 1; i <= RUNS; i++) {
    const workspace = join(BASE_DIR, `phase1-batch-${i}`);
    console.log(`─── Run ${i}/${RUNS} ─────────────────────────────────────────`);

    // Clean workspace
    if (existsSync(workspace)) rmSync(workspace, { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });
    mkdirSync(join(workspace, "__tests__"), { recursive: true });
    writeFileSync(join(workspace, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "commonjs", strict: true, esModuleInterop: true, outDir: "./dist", rootDir: "." },
      include: ["src/**/*.ts", "__tests__/**/*.ts"],
    }, null, 2));
    writeFileSync(join(workspace, "package.json"), JSON.stringify({
      name: `aes-batch-${i}`, version: "0.0.1", private: true,
    }, null, 2));

    const startTime = Date.now();
    const { bridge, prompt } = buildBridgePrompt(workspace, i);

    let result = { run: i, bridge_id: bridge.bridge_id, success: false, files: 0, lines: 0, tests_passed: 0, tests_failed: 0, violations: [], duration_s: 0, error: null };

    try {
      // Build
      const builderResult = await spawnClaude(prompt, workspace);
      if (builderResult.code !== 0) {
        result.error = `Builder exit code ${builderResult.code}`;
        console.log(`  Builder: FAILED (exit ${builderResult.code})`);
      } else {
        // Scan
        const files = scanFiles(workspace);
        result.files = files.length;
        result.lines = files.reduce((s, f) => s + f.lines, 0);

        if (files.length === 0) {
          result.error = "No files generated";
          console.log(`  Builder: No files generated`);
        } else {
          // Test
          const testResult = runTests(workspace);
          result.tests_passed = testResult.passed;
          result.tests_failed = testResult.failed;

          // Validate
          const validation = validate(files, testResult, bridge);
          result.success = validation.passed;
          result.violations = validation.violations;

          console.log(`  Files: ${files.length} (${result.lines} lines) | Tests: ${testResult.passed}/${testResult.passed + testResult.failed} | ${validation.passed ? "PASSED ✓" : "FAILED ✗"}`);
          if (validation.violations.length > 0) {
            for (const v of validation.violations) console.log(`    - ${v}`);
          }
        }
      }
    } catch (err) {
      result.error = err.message;
      console.log(`  Error: ${err.message}`);
    }

    result.duration_s = Math.round((Date.now() - startTime) / 1000);
    console.log(`  Duration: ${result.duration_s}s\n`);
    results.push(result);

    // Cleanup workspace
    if (existsSync(workspace)) rmSync(workspace, { recursive: true });
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = Math.round(results.reduce((s, r) => s + r.duration_s, 0) / RUNS);
  const avgTests = Math.round(results.reduce((s, r) => s + r.tests_passed, 0) / RUNS);
  const avgLines = Math.round(results.reduce((s, r) => s + r.lines, 0) / RUNS);

  console.log("═══════════════════════════════════════════════════════════");
  console.log("  BATCH RESULTS");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Total runs:     ${RUNS}`);
  console.log(`  Passed:         ${passed} (${Math.round(passed / RUNS * 100)}%)`);
  console.log(`  Failed:         ${failed} (${Math.round(failed / RUNS * 100)}%)`);
  console.log(`  Avg duration:   ${avgDuration}s`);
  console.log(`  Avg tests:      ${avgTests} per run`);
  console.log(`  Avg lines:      ${avgLines} per run`);
  console.log("═══════════════════════════════════════════════════════════");

  if (failed > 0) {
    console.log("\n  FAILURES:");
    for (const r of results.filter(r => !r.success)) {
      console.log(`  Run ${r.run}: ${r.error || r.violations.join(", ")}`);
    }
  }

  console.log("\n  PER-RUN DETAIL:");
  for (const r of results) {
    console.log(`  ${r.run}. ${r.success ? "✓" : "✗"} | ${r.files} files, ${r.lines} lines | ${r.tests_passed}p/${r.tests_failed}f | ${r.duration_s}s${r.error ? ` | ${r.error}` : ""}`);
  }

  // Save report
  const reportPath = join(BASE_DIR, "batch-report.json");
  writeFileSync(reportPath, JSON.stringify({ runs: results, summary: { total: RUNS, passed, failed, avg_duration_s: avgDuration, avg_tests: avgTests, avg_lines: avgLines } }, null, 2));
  console.log(`\n  Report: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[AES] Fatal:", err.message);
  process.exit(1);
});
