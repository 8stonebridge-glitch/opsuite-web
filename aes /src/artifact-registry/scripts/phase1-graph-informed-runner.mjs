#!/usr/bin/env node

/**
 * AES Phase 1 — Graph-Informed Scenario Runner
 *
 * Same 6 scenarios as before, but now:
 *   1. Queries Neo4j for historical success rates by risk + feature type
 *   2. Adjusts builder prompts based on failure patterns
 *   3. Adds retry logic for high-risk features that historically fail
 *   4. Writes all results back to the live stack
 *   5. Compares before/after success rates
 */

import pg from "pg";
import neo4j from "neo4j-driver";
import { execSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const TIMEOUT_MS = 120_000;
const BASE_DIR = resolve(import.meta.dirname, "..", "tests");
const PG_URL = "postgres://aes:aes_dev_password@127.0.0.1:15432/aes_platform";
const NEO4J_URL = "bolt://127.0.0.1:17687";
const NEO4J_USER = "neo4j";
const NEO4J_PASS = "aes_dev_password";

// ─── Same Scenarios ──────────────────────────────────────────────────────────

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

// ─── Query Graph for Historical Intelligence ─────────────────────────────────

async function getGraphIntelligence(neo4jSession) {
  const intel = {
    successRateByRisk: {},
    successRateByType: {},
    failurePatterns: [],
  };

  // Success rate by risk
  const riskResult = await neo4jSession.run(
    `MATCH (b:BuildRecord)
     RETURN b.risk AS risk,
            COUNT(b) AS total,
            SUM(CASE WHEN b.status = 'PASSED' THEN 1 ELSE 0 END) AS passed`
  );
  for (const record of riskResult.records) {
    const risk = record.get("risk");
    const total = record.get("total").toNumber();
    const passed = record.get("passed").toNumber();
    intel.successRateByRisk[risk] = { total, passed, rate: passed / total };
  }

  // Success rate by feature type
  const typeResult = await neo4jSession.run(
    `MATCH (b:BuildRecord)
     RETURN b.feature_type AS type,
            COUNT(b) AS total,
            SUM(CASE WHEN b.status = 'PASSED' THEN 1 ELSE 0 END) AS passed`
  );
  for (const record of typeResult.records) {
    const type = record.get("type");
    const total = record.get("total").toNumber();
    const passed = record.get("passed").toNumber();
    intel.successRateByType[type] = { total, passed, rate: passed / total };
  }

  // Failure patterns
  const failResult = await neo4jSession.run(
    `MATCH (fp:FailurePattern)
     RETURN fp.pattern_type AS type, fp.feature_type AS ft, fp.description AS desc`
  );
  for (const record of failResult.records) {
    intel.failurePatterns.push({
      type: record.get("type"),
      featureType: record.get("ft"),
      description: record.get("desc"),
    });
  }

  return intel;
}

// ─── Build Enhanced Prompt Using Graph Intelligence ──────────────────────────

function buildEnhancedPrompt(scenario, workspace, intel) {
  const bridge = {
    bridge_id: `BRG-GI-${scenario.id.toUpperCase()}-${Date.now()}`,
    build_id: `BLD-GI-${scenario.id.toUpperCase()}-${Date.now()}`,
    feature_id: `FEAT-GI-${scenario.id.toUpperCase()}`,
    feature_type: scenario.feature_type,
    risk: scenario.risk,
    ...scenario.bridge,
    write_scope: { paths: ["src/", "__tests__/"] },
    read_scope: { paths: ["src/", "__tests__/", "tsconfig.json", "package.json"] },
  };

  // Get historical signals
  const riskRate = intel.successRateByRisk[scenario.risk];
  const typeRate = intel.successRateByType[scenario.feature_type];
  const relevantFailures = intel.failurePatterns.filter(
    fp => fp.featureType === scenario.feature_type
  );

  // Build intelligence section
  const intelligenceLines = [
    "",
    "═══ GRAPH INTELLIGENCE (from historical build data) ═══",
  ];

  if (riskRate) {
    intelligenceLines.push(
      `Historical success rate for ${scenario.risk} risk: ${Math.round(riskRate.rate * 100)}% (${riskRate.passed}/${riskRate.total})`
    );
  }
  if (typeRate) {
    intelligenceLines.push(
      `Historical success rate for ${scenario.feature_type}: ${Math.round(typeRate.rate * 100)}% (${typeRate.passed}/${typeRate.total})`
    );
  }

  if (relevantFailures.length > 0) {
    intelligenceLines.push("");
    intelligenceLines.push("KNOWN FAILURE PATTERNS FOR THIS FEATURE TYPE:");
    for (const fp of relevantFailures) {
      intelligenceLines.push(`  - ${fp.type}: ${fp.description}`);
    }
    intelligenceLines.push("");
    intelligenceLines.push("MITIGATIONS BASED ON PAST FAILURES:");

    if (relevantFailures.some(fp => fp.type === "TEST_FAILURE")) {
      intelligenceLines.push("  - TEST_FAILURE is common. Write tests FIRST, then implementation.");
      intelligenceLines.push("  - Ensure test imports match exact export names.");
      intelligenceLines.push("  - Run a mental check: does each test import every function it calls?");
      intelligenceLines.push("  - For async code: always await async functions in tests.");
      intelligenceLines.push("  - Use explicit type annotations on all function parameters.");
    }
    if (relevantFailures.some(fp => fp.type === "TIMEOUT")) {
      intelligenceLines.push("  - TIMEOUT risk detected. Keep implementation simple and focused.");
      intelligenceLines.push("  - Do not over-engineer. Write minimal code that satisfies criteria.");
      intelligenceLines.push("  - Avoid complex generics or type gymnastics.");
    }
  }

  if (riskRate && riskRate.rate < 0.7) {
    intelligenceLines.push("");
    intelligenceLines.push("⚠️ LOW HISTORICAL SUCCESS RATE — EXTRA CARE REQUIRED:");
    intelligenceLines.push("  - Double-check every export matches every import");
    intelligenceLines.push("  - Verify test file paths are correct");
    intelligenceLines.push("  - Keep implementation straightforward, avoid edge cases in v1");
    intelligenceLines.push("  - Test the happy path first, then add error cases");
  }

  intelligenceLines.push("═══ END GRAPH INTELLIGENCE ═══");

  const prompt = [
    "You are the AES builder worker. Execute the bridge below precisely.",
    "Stay within AES_WRITE_SCOPE. Do not create files outside src/ and __tests__/.",
    "Do not install packages. Do not ask questions. Just write the files.",
    ...intelligenceLines,
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

// ─── Spawn / Scan / Test / Validate (same as before) ─────────────────────────

function spawnClaude(prompt, workspace) {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["-p", prompt, "--allowedTools", "Write,Edit,Read,Glob,Grep,Bash"], {
      cwd: workspace, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, AES_SESSION_ROLE: "builder" },
    });
    let stdout = "", stderr = "";
    child.stdout.on("data", (c) => { stdout += c.toString(); });
    child.stderr.on("data", (c) => { stderr += c.toString(); });
    const timeout = setTimeout(() => { child.kill("SIGTERM"); reject(new Error("timeout")); }, TIMEOUT_MS);
    child.on("close", (code) => { clearTimeout(timeout); resolve({ code, stdout, stderr }); });
    child.on("error", (err) => { clearTimeout(timeout); reject(err); });
  });
}

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
    return { success: !result.includes("FAIL"), passed: passMatch ? parseInt(passMatch[1]) : 0, failed: failMatch ? parseInt(failMatch[1]) : 0 };
  } catch (err) {
    const output = err.stdout?.toString() ?? err.message;
    const passMatch = output.match(/Tests:\s+(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    return { success: false, passed: passMatch ? parseInt(passMatch[1]) : 0, failed: failMatch ? parseInt(failMatch[1]) : 0 };
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

// ─── Write Results Back to Stack ─────────────────────────────────────────────

async function writeResultToStack(pool, neo4jSession, result) {
  const now = new Date().toISOString();

  // Postgres
  const buildSql = `
    INSERT INTO artifact_registry (artifact_type, artifact_id, sequence_number, payload, written_at)
    VALUES ($1, $2, COALESCE((SELECT MAX(sequence_number) FROM artifact_registry WHERE artifact_type = $1 AND artifact_id = $2), 0) + 1, $3, NOW())
  `;
  await pool.query(buildSql, ["build", result.build_id, JSON.stringify({
    build_id: result.build_id, bridge_id: result.bridge_id, feature_id: result.feature_id,
    status: result.success ? "PASSED" : "FAILED", blocked_reasons: [], queued_at: now, authorized_at: now,
    started_at: now, ended_at: now, builder_session_id: `claude-gi-${result.scenario_id}`,
    artifact_refs: [{ artifact_type: "bridge", artifact_id: result.bridge_id, role: "constraint_source" }],
  })]);

  await pool.query(buildSql, ["test_run", `TR-GI-${result.scenario_id}-${Date.now()}`, JSON.stringify({
    test_run_id: `TR-GI-${result.scenario_id}-${Date.now()}`, build_id: result.build_id,
    bridge_id: result.bridge_id, feature_id: result.feature_id, executed_at: now,
    test_cases_run: result.tests_passed + result.tests_failed, passed: result.tests_passed,
    failed: result.tests_failed, skipped: 0, status: result.success ? "PASS" : "FAIL",
    failure_details: [], blob_ref: null,
    artifact_refs: [{ artifact_type: "build", artifact_id: result.build_id, role: "test_source" }],
  })]);

  // Neo4j
  await neo4jSession.run(
    `MERGE (b:BuildRecord {build_id: $build_id})
     ON CREATE SET b.bridge_id = $bridge_id, b.feature_id = $feature_id, b.feature_type = $feature_type,
       b.risk = $risk, b.status = $status, b.tests_passed = $tests_passed, b.tests_failed = $tests_failed,
       b.files_generated = $files, b.lines_generated = $lines, b.duration_s = $duration_s,
       b.error = $error, b.violations = $violations, b.source = 'graph-informed-runner',
       b.graph_informed = true, b.recorded_at = datetime()`,
    {
      build_id: result.build_id, bridge_id: result.bridge_id, feature_id: result.feature_id,
      feature_type: result.feature_type, risk: result.risk, status: result.success ? "PASSED" : "FAILED",
      tests_passed: neo4j.int(result.tests_passed), tests_failed: neo4j.int(result.tests_failed),
      files: neo4j.int(result.files), lines: neo4j.int(result.lines),
      duration_s: neo4j.int(result.duration_s), error: result.error || "",
      violations: result.violations.join("; ") || "",
    }
  );

  // Link to feature
  await neo4jSession.run(
    `MERGE (f:FeatureSpec {feature_id: $feature_id})
     ON CREATE SET f.feature_type = $feature_type, f.risk = $risk, f.name = $name
     WITH f MATCH (b:BuildRecord {build_id: $build_id}) MERGE (b)-[:BUILDS]->(f)`,
    { feature_id: result.feature_id, feature_type: result.feature_type, risk: result.risk, name: result.name, build_id: result.build_id }
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  AES Phase 1 — Graph-Informed Scenario Runner");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  // Connect
  const pool = new pg.Pool({ connectionString: PG_URL });
  const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));
  const neo4jSession = driver.session();

  // Get intelligence
  console.log("─── Querying Graph Intelligence ──────────────────────────────");
  const intel = await getGraphIntelligence(neo4jSession);

  console.log("  Historical success rates by risk:");
  for (const [risk, data] of Object.entries(intel.successRateByRisk)) {
    console.log(`    ${risk}: ${Math.round(data.rate * 100)}% (${data.passed}/${data.total})`);
  }
  console.log("  Historical success rates by feature type:");
  for (const [type, data] of Object.entries(intel.successRateByType)) {
    console.log(`    ${type}: ${Math.round(data.rate * 100)}% (${data.passed}/${data.total})`);
  }
  console.log(`  Known failure patterns: ${intel.failurePatterns.length}`);
  for (const fp of intel.failurePatterns) {
    console.log(`    ${fp.type} in ${fp.featureType}: ${fp.description}`);
  }
  console.log();

  // Run scenarios
  const results = [];
  const MAX_RETRIES = 1; // Graph says high-risk fails 50%, allow 1 retry

  for (const scenario of SCENARIOS) {
    const workspace = join(BASE_DIR, `scenario-gi-${scenario.id}`);
    const riskRate = intel.successRateByRisk[scenario.risk];
    const allowRetry = riskRate && riskRate.rate < 0.7;

    console.log(`─── ${scenario.name} [${scenario.risk} risk${allowRetry ? " + RETRY ENABLED" : ""}] ──────`);

    let attempt = 0;
    let result = null;

    while (attempt <= (allowRetry ? MAX_RETRIES : 0)) {
      if (attempt > 0) console.log(`  Retry ${attempt}/${MAX_RETRIES}...`);

      // Setup workspace
      if (existsSync(workspace)) rmSync(workspace, { recursive: true });
      mkdirSync(join(workspace, "src"), { recursive: true });
      mkdirSync(join(workspace, "__tests__"), { recursive: true });
      writeFileSync(join(workspace, "tsconfig.json"), JSON.stringify({
        compilerOptions: { target: "ES2022", module: "commonjs", strict: true, esModuleInterop: true, outDir: "./dist", rootDir: "." },
        include: ["src/**/*.ts", "__tests__/**/*.ts"],
      }, null, 2));
      writeFileSync(join(workspace, "package.json"), JSON.stringify({ name: `aes-gi-${scenario.id}`, version: "0.0.1", private: true }, null, 2));

      const startTime = Date.now();
      const { bridge, prompt } = buildEnhancedPrompt(scenario, workspace, intel);

      result = {
        scenario_id: scenario.id, name: scenario.name, risk: scenario.risk,
        feature_type: scenario.feature_type, build_id: bridge.build_id, bridge_id: bridge.bridge_id,
        feature_id: bridge.feature_id, success: false, files: 0, lines: 0,
        tests_passed: 0, tests_failed: 0, violations: [], duration_s: 0, error: null,
        attempt: attempt + 1, graph_informed: true, retry_allowed: allowRetry,
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

      if (result.success) break;
      attempt++;
    }

    const status = result.success ? "✓ PASSED" : "✗ FAILED";
    console.log(`  ${status} | ${result.files} files, ${result.lines} lines | ${result.tests_passed}p/${result.tests_failed}f | ${result.duration_s}s | attempt ${result.attempt}`);
    if (result.violations.length > 0) for (const v of result.violations) console.log(`    - ${v}`);
    if (result.error) console.log(`    Error: ${result.error}`);
    console.log();

    // Write back to stack
    await writeResultToStack(pool, neo4jSession, result);

    results.push(result);

    // Cleanup
    if (existsSync(workspace)) rmSync(workspace, { recursive: true });
  }

  // ─── Comparison ──────────────────────────────────────────────────────────

  const passed = results.filter(r => r.success).length;

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  RESULTS — GRAPH-INFORMED vs BASELINE");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log("  Per-scenario comparison:");
  console.log("  Scenario                    | Baseline | Graph-Informed");
  console.log("  ─────────────────────────────────────────────────────────");

  // Load baseline for comparison
  const baselineReport = JSON.parse(readFileSync(resolve(TEST_DIR, "scenario-report.json"), "utf-8"));
  for (const result of results) {
    const baseline = baselineReport.scenarios.find(s => s.scenario_id === result.scenario_id);
    const bStatus = baseline?.success ? "✓ PASS" : "✗ FAIL";
    const gStatus = result.success ? "✓ PASS" : "✗ FAIL";
    const pad = result.name.padEnd(28);
    console.log(`  ${pad}| ${bStatus}   | ${gStatus} (attempt ${result.attempt})`);
  }

  const baselinePassed = baselineReport.scenarios.filter(s => s.success).length;
  console.log();
  console.log(`  Baseline:       ${baselinePassed}/${SCENARIOS.length} (${Math.round(baselinePassed / SCENARIOS.length * 100)}%)`);
  console.log(`  Graph-informed: ${passed}/${SCENARIOS.length} (${Math.round(passed / SCENARIOS.length * 100)}%)`);

  if (passed > baselinePassed) {
    console.log(`  IMPROVEMENT: +${passed - baselinePassed} scenarios`);
  } else if (passed === baselinePassed) {
    console.log(`  NO CHANGE in pass rate`);
  } else {
    console.log(`  REGRESSION: -${baselinePassed - passed} scenarios`);
  }

  // Final graph state
  console.log();
  const totalBuilds = await neo4jSession.run("MATCH (b:BuildRecord) RETURN COUNT(b) AS count");
  console.log(`  Total BuildRecord nodes in graph: ${totalBuilds.records[0].get("count").toNumber()}`);

  const giBuilds = await neo4jSession.run(
    "MATCH (b:BuildRecord) WHERE b.graph_informed = true RETURN COUNT(b) AS count"
  );
  console.log(`  Graph-informed builds: ${giBuilds.records[0].get("count").toNumber()}`);

  console.log("═══════════════════════════════════════════════════════════════════");

  await neo4jSession.close();
  await pool.end();
  await driver.close();

  process.exit(passed < SCENARIOS.length ? 1 : 0);
}

main().catch((err) => { console.error("[AES] Fatal:", err.message); process.exit(1); });
