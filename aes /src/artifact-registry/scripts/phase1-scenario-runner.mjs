#!/usr/bin/env node

/**
 * AES Phase 1 — Multi-Scenario Runner
 *
 * Runs different feature types through the real Claude builder.
 * Each scenario has different complexity, patterns, and risk profiles.
 */

import { execSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const TIMEOUT_MS = 120_000;
const BASE_DIR = resolve(import.meta.dirname, "..", "tests");

// ─── Scenario Definitions ────────────────────────────────────────────────────

const SCENARIOS = [
  {
    id: "auth-service",
    name: "Authentication Service",
    risk: "high",
    feature_type: "backend_platform",
    bridge: {
      intent: "Build a user authentication service with register, login, logout, and session validation",
      constraints: [
        "Write TypeScript only",
        "In-memory storage using Map, no external database",
        "Passwords must be hashed using crypto.createHash (not bcrypt — no external deps)",
        "Sessions are random tokens stored in a Map with expiry timestamps",
        "Export all functions, no classes",
        "Export a clearStore() function that resets all state",
      ],
      acceptance_criteria: [
        { id: "ac-1", description: "register(email, password) creates a user, returns user object without password", mandatory: true },
        { id: "ac-2", description: "register rejects duplicate email with Error", mandatory: true },
        { id: "ac-3", description: "login(email, password) returns a session token string", mandatory: true },
        { id: "ac-4", description: "login rejects wrong password with Error", mandatory: true },
        { id: "ac-5", description: "login rejects unknown email with Error", mandatory: true },
        { id: "ac-6", description: "validateSession(token) returns the user if session is valid", mandatory: true },
        { id: "ac-7", description: "validateSession returns null for invalid or expired tokens", mandatory: true },
        { id: "ac-8", description: "logout(token) invalidates the session", mandatory: true },
      ],
      file_structure: {
        "src/auth-types.ts": "TypeScript interfaces for User, Session, RegisterInput, LoginInput",
        "src/auth-service.ts": "Service functions: register, login, logout, validateSession, clearStore",
        "__tests__/auth-service.test.ts": "Jest tests covering all acceptance criteria",
      },
    },
  },
  {
    id: "event-emitter",
    name: "Event Emitter / Pub-Sub",
    risk: "medium",
    feature_type: "collaboration_layer",
    bridge: {
      intent: "Build a typed event emitter with subscribe, unsubscribe, emit, and once support",
      constraints: [
        "Write TypeScript only, no external deps",
        "Generic typed events using TypeScript generics",
        "Support wildcard '*' subscriptions that receive all events",
        "once() listeners auto-remove after first call",
        "Export a class EventEmitter<T> where T is a record of event names to payload types",
      ],
      acceptance_criteria: [
        { id: "ac-1", description: "on(event, handler) subscribes to an event, returns unsubscribe function", mandatory: true },
        { id: "ac-2", description: "emit(event, payload) calls all handlers for that event", mandatory: true },
        { id: "ac-3", description: "off(event, handler) removes a specific handler", mandatory: true },
        { id: "ac-4", description: "once(event, handler) fires handler only once then auto-removes", mandatory: true },
        { id: "ac-5", description: "wildcard '*' handler receives all events with event name and payload", mandatory: true },
        { id: "ac-6", description: "emit returns the number of handlers called", mandatory: true },
        { id: "ac-7", description: "removeAllListeners(event?) clears handlers for one or all events", mandatory: true },
      ],
      file_structure: {
        "src/event-emitter.ts": "EventEmitter class with generic typing",
        "__tests__/event-emitter.test.ts": "Jest tests covering all acceptance criteria",
      },
    },
  },
  {
    id: "rate-limiter",
    name: "Rate Limiter (Sliding Window)",
    risk: "medium",
    feature_type: "backend_platform",
    bridge: {
      intent: "Build a sliding window rate limiter that tracks requests per key with configurable limits and windows",
      constraints: [
        "Write TypeScript only, no external deps",
        "Use sliding window algorithm (not fixed window)",
        "Time-based expiry using Date.now()",
        "Support configurable max requests and window size in milliseconds",
        "Export functions, no classes",
        "Export a clearStore() and a _setNow(fn) for testing time control",
      ],
      acceptance_criteria: [
        { id: "ac-1", description: "createLimiter(config) returns a limiter with check and reset functions", mandatory: true },
        { id: "ac-2", description: "check(key) returns { allowed: true, remaining, resetAt } when under limit", mandatory: true },
        { id: "ac-3", description: "check(key) returns { allowed: false, remaining: 0, resetAt } when at limit", mandatory: true },
        { id: "ac-4", description: "requests outside the window are not counted", mandatory: true },
        { id: "ac-5", description: "reset(key) clears the history for that key", mandatory: true },
        { id: "ac-6", description: "different keys are tracked independently", mandatory: true },
      ],
      file_structure: {
        "src/rate-limiter-types.ts": "TypeScript interfaces for RateLimiterConfig, CheckResult, RateLimiter",
        "src/rate-limiter.ts": "createLimiter function with sliding window implementation",
        "__tests__/rate-limiter.test.ts": "Jest tests with time mocking covering all criteria",
      },
    },
  },
  {
    id: "state-machine",
    name: "Finite State Machine",
    risk: "medium",
    feature_type: "workflow_orchestration",
    bridge: {
      intent: "Build a typed finite state machine with states, transitions, guards, and lifecycle hooks",
      constraints: [
        "Write TypeScript only, no external deps",
        "Generic typed states and events",
        "Guards can prevent transitions by returning false",
        "onEnter/onExit hooks fire during transitions",
        "Throw Error on invalid transitions",
        "Export a createMachine function",
      ],
      acceptance_criteria: [
        { id: "ac-1", description: "createMachine(config) creates a machine in the initial state", mandatory: true },
        { id: "ac-2", description: "send(event) transitions to the correct next state", mandatory: true },
        { id: "ac-3", description: "send(event) throws if no transition defined for current state + event", mandatory: true },
        { id: "ac-4", description: "guards can block transitions — send returns false, state unchanged", mandatory: true },
        { id: "ac-5", description: "onEnter fires when entering a state", mandatory: true },
        { id: "ac-6", description: "onExit fires when leaving a state", mandatory: true },
        { id: "ac-7", description: "getState() returns current state", mandatory: true },
        { id: "ac-8", description: "history tracks all past transitions", mandatory: true },
      ],
      file_structure: {
        "src/state-machine-types.ts": "TypeScript interfaces for MachineConfig, Transition, Machine",
        "src/state-machine.ts": "createMachine function with guards and hooks",
        "__tests__/state-machine.test.ts": "Jest tests modeling a real workflow (e.g. order fulfillment)",
      },
    },
  },
  {
    id: "markdown-parser",
    name: "Markdown to HTML Parser",
    risk: "low",
    feature_type: "frontend_shell",
    bridge: {
      intent: "Build a simple markdown to HTML converter supporting headings, bold, italic, links, code blocks, and lists",
      constraints: [
        "Write TypeScript only, no external deps",
        "Use regex-based parsing, not a full AST",
        "Support: # headings (h1-h3), **bold**, *italic*, [links](url), `inline code`, ```code blocks```, - unordered lists",
        "Export a single parse(markdown: string): string function",
        "Output valid HTML strings",
      ],
      acceptance_criteria: [
        { id: "ac-1", description: "parse converts # headings to <h1>, ## to <h2>, ### to <h3>", mandatory: true },
        { id: "ac-2", description: "parse converts **bold** to <strong>", mandatory: true },
        { id: "ac-3", description: "parse converts *italic* to <em>", mandatory: true },
        { id: "ac-4", description: "parse converts [text](url) to <a href='url'>text</a>", mandatory: true },
        { id: "ac-5", description: "parse converts `code` to <code>", mandatory: true },
        { id: "ac-6", description: "parse converts ```blocks``` to <pre><code>", mandatory: true },
        { id: "ac-7", description: "parse converts - items to <ul><li>", mandatory: true },
        { id: "ac-8", description: "parse handles empty string input", mandatory: true },
      ],
      file_structure: {
        "src/markdown-parser.ts": "parse function with regex-based markdown to HTML conversion",
        "__tests__/markdown-parser.test.ts": "Jest tests covering all supported syntax",
      },
    },
  },
  {
    id: "job-queue",
    name: "In-Memory Job Queue",
    risk: "high",
    feature_type: "backend_platform",
    bridge: {
      intent: "Build an async job queue with enqueue, process, retry, and status tracking",
      constraints: [
        "Write TypeScript only, no external deps",
        "Async/await based — job handlers are async functions",
        "Support max retries with exponential backoff (simulated, not real delays)",
        "Jobs have statuses: PENDING, RUNNING, COMPLETED, FAILED, RETRYING",
        "Export functions, no classes",
        "Export clearQueue() for test isolation",
      ],
      acceptance_criteria: [
        { id: "ac-1", description: "enqueue(name, payload, handler) adds a job with PENDING status", mandatory: true },
        { id: "ac-2", description: "processNext() picks the oldest PENDING job, runs its handler, marks COMPLETED", mandatory: true },
        { id: "ac-3", description: "processNext() marks job FAILED if handler throws and retries exhausted", mandatory: true },
        { id: "ac-4", description: "failed jobs retry up to maxRetries times with RETRYING status", mandatory: true },
        { id: "ac-5", description: "getJob(id) returns job with current status and attempt count", mandatory: true },
        { id: "ac-6", description: "listJobs(status?) returns jobs filtered by status", mandatory: true },
        { id: "ac-7", description: "processAll() processes all pending jobs in order", mandatory: true },
      ],
      file_structure: {
        "src/job-queue-types.ts": "TypeScript interfaces for Job, JobStatus, QueueConfig",
        "src/job-queue.ts": "Queue functions: enqueue, processNext, processAll, getJob, listJobs, clearQueue",
        "__tests__/job-queue.test.ts": "Jest tests with async handlers covering all criteria",
      },
    },
  },
];

// ─── Build Prompt ────────────────────────────────────────────────────────────

function buildPrompt(scenario, workspace) {
  const bridge = {
    bridge_id: `BRG-${scenario.id.toUpperCase()}-${Date.now()}`,
    build_id: `BLD-${scenario.id.toUpperCase()}-${Date.now()}`,
    feature_id: `FEAT-${scenario.id.toUpperCase()}`,
    feature_type: scenario.feature_type,
    risk: scenario.risk,
    ...scenario.bridge,
    write_scope: { paths: ["src/", "__tests__/"] },
    read_scope: { paths: ["src/", "__tests__/", "tsconfig.json", "package.json"] },
  };

  const prompt = [
    "You are the AES builder worker. Execute the bridge below precisely.",
    "Stay within AES_WRITE_SCOPE. Do not create files outside src/ and __tests__/.",
    "Do not install packages. Do not ask questions. Just write the files.",
    "",
    `Build ID: ${bridge.build_id}`,
    `Feature: ${scenario.name}`,
    `Risk: ${scenario.risk}`,
    `Working directory: ${workspace}`,
    "",
    "Bridge JSON:",
    JSON.stringify(bridge, null, 2),
    "",
    "IMPORTANT:",
    "1. Write ONLY the files listed in file_structure",
    "2. Use ts-jest for tests, import from relative paths (e.g. '../src/...')",
    "3. Meet ALL acceptance criteria",
    "4. Finish with a summary of what you created",
  ].join("\n");

  return { bridge, prompt };
}

// ─── Spawn Claude ────────────────────────────────────────────────────────────

function spawnClaude(prompt, workspace) {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["-p", prompt, "--allowedTools", "Write,Edit,Read,Glob,Grep,Bash"], {
      cwd: workspace,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, AES_SESSION_ROLE: "builder" },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => { stdout += c.toString(); });
    child.stderr.on("data", (c) => { stderr += c.toString(); });

    const timeout = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("timeout")); }, TIMEOUT_MS);

    child.on("close", (code) => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
    child.on("error", (err) => { clearTimeout(timeout); reject(err); });
  });
}

// ─── Scan + Test + Validate ──────────────────────────────────────────────────

function scanFiles(workspace) {
  const files = [];
  function walk(dir, prefix = "") {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
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

function runTests(workspace) {
  try {
    const parentDir = resolve(workspace, "..", "..");
    const result = execSync(
      `npx jest --roots "${workspace}" --config '${JSON.stringify({
        preset: "ts-jest", testEnvironment: "node", roots: [workspace], modulePaths: [workspace],
      })}' --no-cache --runInBand 2>&1`,
      { cwd: parentDir, timeout: 30000, encoding: "utf-8" }
    );
    const passMatch = result.match(/Tests:\s+(\d+) passed/);
    const failMatch = result.match(/(\d+) failed/);
    return { success: !result.includes("FAIL"), passed: passMatch ? parseInt(passMatch[1]) : 0, failed: failMatch ? parseInt(failMatch[1]) : 0, output: result };
  } catch (err) {
    const output = err.stdout?.toString() ?? err.message;
    const passMatch = output.match(/Tests:\s+(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    return { success: false, passed: passMatch ? parseInt(passMatch[1]) : 0, failed: failMatch ? parseInt(failMatch[1]) : 0, output };
  }
}

function validate(files, testResult, bridge) {
  const violations = [];
  for (const file of files) {
    const inScope = bridge.write_scope.paths.some(s => file.path.startsWith(s));
    if (!inScope) violations.push(`Scope: ${file.path}`);
  }
  for (const req of Object.keys(bridge.file_structure)) {
    if (!files.some(f => f.path === req)) violations.push(`Missing: ${req}`);
  }
  if (!testResult.success) violations.push(`Tests: ${testResult.failed} failed`);
  return { passed: violations.length === 0, violations };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log(`  AES Phase 1 — Multi-Scenario Runner (${SCENARIOS.length} scenarios)`);
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const results = [];

  for (const scenario of SCENARIOS) {
    const workspace = join(BASE_DIR, `scenario-${scenario.id}`);
    console.log(`─── ${scenario.name} [${scenario.risk} risk] ──────────────────────`);

    // Setup
    if (existsSync(workspace)) rmSync(workspace, { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });
    mkdirSync(join(workspace, "__tests__"), { recursive: true });
    writeFileSync(join(workspace, "tsconfig.json"), JSON.stringify({
      compilerOptions: { target: "ES2022", module: "commonjs", strict: true, esModuleInterop: true, outDir: "./dist", rootDir: "." },
      include: ["src/**/*.ts", "__tests__/**/*.ts"],
    }, null, 2));
    writeFileSync(join(workspace, "package.json"), JSON.stringify({ name: `aes-${scenario.id}`, version: "0.0.1", private: true }, null, 2));

    const startTime = Date.now();
    const { bridge, prompt } = buildPrompt(scenario, workspace);

    let result = {
      scenario_id: scenario.id, name: scenario.name, risk: scenario.risk, feature_type: scenario.feature_type,
      success: false, files: 0, lines: 0, tests_passed: 0, tests_failed: 0,
      criteria_count: scenario.bridge.acceptance_criteria.length,
      violations: [], duration_s: 0, error: null,
    };

    try {
      const builderResult = await spawnClaude(prompt, workspace);
      if (builderResult.code !== 0) {
        result.error = `Builder exit ${builderResult.code}`;
      } else {
        const files = scanFiles(workspace);
        result.files = files.length;
        result.lines = files.reduce((s, f) => s + f.lines, 0);

        if (files.length === 0) {
          result.error = "No files generated";
        } else {
          const testResult = runTests(workspace);
          result.tests_passed = testResult.passed;
          result.tests_failed = testResult.failed;

          const validation = validate(files, testResult, bridge);
          result.success = validation.passed;
          result.violations = validation.violations;
        }
      }
    } catch (err) {
      result.error = err.message;
    }

    result.duration_s = Math.round((Date.now() - startTime) / 1000);

    const status = result.success ? "✓ PASSED" : `✗ FAILED`;
    console.log(`  ${status} | ${result.files} files, ${result.lines} lines | ${result.tests_passed}p/${result.tests_failed}f | ${result.duration_s}s`);
    if (result.violations.length > 0) for (const v of result.violations) console.log(`    - ${v}`);
    if (result.error) console.log(`    Error: ${result.error}`);
    console.log();

    results.push(result);

    // Cleanup
    if (existsSync(workspace)) rmSync(workspace, { recursive: true });
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  SCENARIO RESULTS");
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log();

  // By risk
  for (const risk of ["high", "medium", "low"]) {
    const group = results.filter(r => r.risk === risk);
    const groupPassed = group.filter(r => r.success).length;
    console.log(`  ${risk.toUpperCase()} RISK: ${groupPassed}/${group.length} passed`);
    for (const r of group) {
      console.log(`    ${r.success ? "✓" : "✗"} ${r.name} (${r.tests_passed} tests, ${r.lines} lines, ${r.duration_s}s)`);
    }
    console.log();
  }

  // By feature type
  const types = [...new Set(results.map(r => r.feature_type))];
  for (const ft of types) {
    const group = results.filter(r => r.feature_type === ft);
    const groupPassed = group.filter(r => r.success).length;
    console.log(`  ${ft}: ${groupPassed}/${group.length} passed`);
  }

  console.log();
  console.log(`  TOTAL: ${passed}/${SCENARIOS.length} scenarios passed (${Math.round(passed / SCENARIOS.length * 100)}%)`);
  console.log(`  Avg duration: ${Math.round(results.reduce((s, r) => s + r.duration_s, 0) / SCENARIOS.length)}s`);
  console.log(`  Avg tests per scenario: ${Math.round(results.reduce((s, r) => s + r.tests_passed, 0) / SCENARIOS.length)}`);
  console.log(`  Total lines generated: ${results.reduce((s, r) => s + r.lines, 0)}`);
  console.log("═══════════════════════════════════════════════════════════════════");

  // Save
  const reportPath = join(BASE_DIR, "scenario-report.json");
  writeFileSync(reportPath, JSON.stringify({ scenarios: results, summary: { total: SCENARIOS.length, passed, failed } }, null, 2));
  console.log(`\n  Report: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => { console.error("[AES] Fatal:", err.message); process.exit(1); });
