#!/usr/bin/env node

/**
 * AES Phase 1 — Research-Enhanced Runner
 *
 * Uses Perplexity research to generate better bridges for features
 * that historically fail. Tests whether research-informed bridges
 * produce higher success rates.
 *
 * Path 1: Better inputs → better builds
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

// ─── Research-Enhanced Job Queue Bridge ──────────────────────────────────────
// This is what Perplexity research produces: concrete types, exact signatures,
// state machine definition, test structure, and known failure modes.

const RESEARCH_ENHANCED_JOB_QUEUE = {
  id: "job-queue-v2",
  name: "In-Memory Job Queue (Research-Enhanced)",
  risk: "high",
  feature_type: "backend_platform",
  bridge: {
    intent: "Build an async job queue with enqueue, process, retry with exponential backoff, and status tracking",
    constraints: [
      "Write TypeScript only, no external deps",
      "Async/await based — job handlers are async functions",
      "Jobs have statuses: PENDING, RUNNING, COMPLETED, FAILED",
      "Failed jobs retry up to maxRetries times before going to FAILED permanently",
      "Use simulated delays for backoff (store the computed delay but don't actually wait)",
      "Export functions only, no classes",
      "Export clearQueue() for test isolation",
      "Use a Map<string, Job> as the backing store",
      "Generate job IDs with a simple incrementing counter",
    ],

    // ─── RESEARCH-DERIVED: Exact type definitions ──────────────────────
    type_skeleton: `
// Put this in src/job-queue-types.ts

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Job<T = unknown, R = unknown> {
  id: string;
  name: string;
  payload: T;
  handler: (payload: T) => Promise<R>;
  status: JobStatus;
  result?: R;
  error?: string;
  attempts: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueOptions {
  maxRetries?: number;  // default 3
}

export interface QueueStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
}
`,

    // ─── RESEARCH-DERIVED: Exact function signatures ───────────────────
    function_signatures: `
// Put this in src/job-queue.ts
// Import types from ./job-queue-types

// State: module-level Map and counter
// let nextId = 1;
// const jobs = new Map<string, Job>();

export function enqueue<T, R>(
  name: string,
  payload: T,
  handler: (payload: T) => Promise<R>,
  options?: EnqueueOptions
): Job<T, R>;
// Creates job with PENDING status, attempts=0, maxRetries from options or default 3

export async function processNext(): Promise<Job | null>;
// Finds oldest PENDING job, sets to RUNNING, awaits handler
// On success: set COMPLETED, store result
// On failure: increment attempts
//   if attempts >= maxRetries: set FAILED, store error message
//   else: set back to PENDING (will be retried on next processNext call)
// Returns the processed job, or null if no PENDING jobs

export async function processAll(): Promise<Job[]>;
// Calls processNext() in a loop until it returns null
// Returns array of all processed jobs

export function getJob(id: string): Job | undefined;
// Simple Map.get

export function listJobs(status?: JobStatus): Job[];
// If status provided, filter. Otherwise return all. Convert Map.values to array.

export function getStats(): QueueStats;
// Count jobs by status

export function clearQueue(): void;
// Clear the Map, reset nextId to 1
`,

    // ─── RESEARCH-DERIVED: Known failure modes ─────────────────────────
    known_failure_modes: [
      "Handler throws synchronously instead of rejecting — wrap handler call in try/catch",
      "processNext mutates job status but forgets to update updatedAt",
      "Retry logic: after incrementing attempts, must check >= maxRetries (not >)",
      "processAll infinite loop if a job stays PENDING after processing — processNext must change status even on retry",
      "listJobs with no filter must return ALL jobs, not just PENDING",
      "Type mismatch: handler returns Promise<R> but result stored as unknown — use type assertions carefully",
    ],

    // ─── RESEARCH-DERIVED: Test structure ──────────────────────────────
    test_structure: `
// __tests__/job-queue.test.ts structure:

// beforeEach: call clearQueue()

// Group 1: Enqueue
//   - enqueue creates job with PENDING status
//   - enqueue sets default maxRetries to 3
//   - enqueue respects custom maxRetries

// Group 2: Process
//   - processNext runs oldest PENDING job and sets COMPLETED
//   - processNext returns null when queue is empty
//   - processNext sets FAILED when handler throws and retries exhausted
//   - processNext retries: failed job goes back to PENDING if attempts < maxRetries

// Group 3: Retry behavior
//   - job retries up to maxRetries times before permanent FAILED
//   - attempts counter increments on each failure

// Group 4: Listing and stats
//   - getJob returns job by id
//   - getJob returns undefined for unknown id
//   - listJobs() returns all jobs
//   - listJobs(status) filters correctly
//   - getStats returns correct counts

// Group 5: processAll
//   - processAll processes all pending jobs
//   - processAll handles mix of success and failure

// IMPORTANT: All handlers must be async functions
// IMPORTANT: Use await on processNext() and processAll() in every test
`,

    acceptance_criteria: [
      { id: "ac-1", description: "enqueue(name, payload, handler) adds a job with PENDING status and attempts=0", mandatory: true },
      { id: "ac-2", description: "processNext() picks the oldest PENDING job, runs handler, marks COMPLETED on success", mandatory: true },
      { id: "ac-3", description: "processNext() marks job FAILED if handler throws and attempts >= maxRetries", mandatory: true },
      { id: "ac-4", description: "failed jobs with attempts < maxRetries go back to PENDING for retry", mandatory: true },
      { id: "ac-5", description: "getJob(id) returns job with current status and attempt count", mandatory: true },
      { id: "ac-6", description: "listJobs(status?) returns jobs filtered by status or all jobs", mandatory: true },
      { id: "ac-7", description: "processAll() processes all pending jobs in order and returns results", mandatory: true },
      { id: "ac-8", description: "getStats() returns count of jobs by status", mandatory: true },
    ],
    file_structure: {
      "src/job-queue-types.ts": "TypeScript interfaces — use the type_skeleton above exactly",
      "src/job-queue.ts": "Implementation — follow the function_signatures above exactly",
      "__tests__/job-queue.test.ts": "Jest tests — follow the test_structure above, all handlers must be async, all process calls must be awaited",
    },
  },
};

// ─── Also rerun the original scenarios for comparison ────────────────────────

const ORIGINAL_JOB_QUEUE = {
  id: "job-queue-original",
  name: "In-Memory Job Queue (Original Bridge)",
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
};

// ─── Build Prompt ────────────────────────────────────────────────────────────

function buildPrompt(scenario, workspace) {
  const bridge = {
    bridge_id: `BRG-RE-${scenario.id.toUpperCase()}-${Date.now()}`,
    build_id: `BLD-RE-${scenario.id.toUpperCase()}-${Date.now()}`,
    feature_id: `FEAT-RE-${scenario.id.toUpperCase()}`,
    feature_type: scenario.feature_type,
    risk: scenario.risk,
    ...scenario.bridge,
    write_scope: { paths: ["src/", "__tests__/"] },
    read_scope: { paths: ["src/", "__tests__/", "tsconfig.json", "package.json"] },
  };

  const promptParts = [
    "You are the AES builder worker. Execute the bridge below precisely.",
    "Stay within AES_WRITE_SCOPE. Do not create files outside src/ and __tests__/.",
    "Do not install packages. Do not ask questions. Just write the files.",
  ];

  // Add research-derived skeletons if present
  if (scenario.bridge.type_skeleton) {
    promptParts.push("");
    promptParts.push("═══ RESEARCH-DERIVED TYPE SKELETON ═══");
    promptParts.push("Use these exact types in src/job-queue-types.ts:");
    promptParts.push(scenario.bridge.type_skeleton);
  }

  if (scenario.bridge.function_signatures) {
    promptParts.push("");
    promptParts.push("═══ RESEARCH-DERIVED FUNCTION SIGNATURES ═══");
    promptParts.push("Implement these exact signatures in src/job-queue.ts:");
    promptParts.push(scenario.bridge.function_signatures);
  }

  if (scenario.bridge.known_failure_modes) {
    promptParts.push("");
    promptParts.push("═══ KNOWN FAILURE MODES (avoid these) ═══");
    for (const mode of scenario.bridge.known_failure_modes) {
      promptParts.push(`  ⚠️ ${mode}`);
    }
  }

  if (scenario.bridge.test_structure) {
    promptParts.push("");
    promptParts.push("═══ RESEARCH-DERIVED TEST STRUCTURE ═══");
    promptParts.push("Follow this structure for __tests__/job-queue.test.ts:");
    promptParts.push(scenario.bridge.test_structure);
  }

  promptParts.push("");
  promptParts.push(`Build ID: ${bridge.build_id}`);
  promptParts.push(`Feature: ${scenario.name}`);
  promptParts.push(`Working directory: ${workspace}`);
  promptParts.push("");
  promptParts.push("Bridge JSON:");
  promptParts.push(JSON.stringify(bridge, null, 2));
  promptParts.push("");
  promptParts.push("Write ONLY the files listed in file_structure. Finish with a summary.");

  return { bridge, prompt: promptParts.join("\n") };
}

// ─── Runner helpers ──────────────────────────────────────────────────────────

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
      if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") walk(join(dir, entry.name), rel);
      else if (entry.isFile() && entry.name.endsWith(".ts")) {
        files.push({ path: rel, lines: readFileSync(join(dir, entry.name), "utf-8").split("\n").length });
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

// ─── Run a scenario ──────────────────────────────────────────────────────────

async function runScenario(scenario, label) {
  const workspace = join(BASE_DIR, `scenario-re-${scenario.id}`);

  if (existsSync(workspace)) rmSync(workspace, { recursive: true });
  mkdirSync(join(workspace, "src"), { recursive: true });
  mkdirSync(join(workspace, "__tests__"), { recursive: true });
  writeFileSync(join(workspace, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", module: "commonjs", strict: true, esModuleInterop: true, outDir: "./dist", rootDir: "." },
    include: ["src/**/*.ts", "__tests__/**/*.ts"],
  }, null, 2));
  writeFileSync(join(workspace, "package.json"), JSON.stringify({ name: `aes-re-${scenario.id}`, version: "0.0.1", private: true }, null, 2));

  const startTime = Date.now();
  const { bridge, prompt } = buildPrompt(scenario, workspace);

  const result = {
    scenario_id: scenario.id, name: scenario.name, label, risk: scenario.risk,
    feature_type: scenario.feature_type, build_id: bridge.build_id, bridge_id: bridge.bridge_id,
    success: false, files: 0, lines: 0, tests_passed: 0, tests_failed: 0,
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

  // Cleanup
  if (existsSync(workspace)) rmSync(workspace, { recursive: true });

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  AES Phase 1 — Research-Enhanced vs Original Bridge");
  console.log("  Testing: Does Perplexity research improve build success?");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  // Run each 3 times for statistical significance
  const RUNS_PER = 3;
  const originalResults = [];
  const enhancedResults = [];

  for (let i = 1; i <= RUNS_PER; i++) {
    console.log(`─── Round ${i}/${RUNS_PER} ─────────────────────────────────────\n`);

    // Original bridge
    console.log("  Original bridge (no research):");
    const orig = await runScenario(ORIGINAL_JOB_QUEUE, `original-${i}`);
    console.log(`    ${orig.success ? "✓ PASSED" : "✗ FAILED"} | ${orig.files} files, ${orig.lines} lines | ${orig.tests_passed}p/${orig.tests_failed}f | ${orig.duration_s}s`);
    if (orig.violations.length > 0) for (const v of orig.violations) console.log(`      - ${v}`);
    if (orig.error) console.log(`      Error: ${orig.error}`);
    originalResults.push(orig);

    // Research-enhanced bridge
    console.log("  Research-enhanced bridge:");
    const enhanced = await runScenario(RESEARCH_ENHANCED_JOB_QUEUE, `enhanced-${i}`);
    console.log(`    ${enhanced.success ? "✓ PASSED" : "✗ FAILED"} | ${enhanced.files} files, ${enhanced.lines} lines | ${enhanced.tests_passed}p/${enhanced.tests_failed}f | ${enhanced.duration_s}s`);
    if (enhanced.violations.length > 0) for (const v of enhanced.violations) console.log(`      - ${v}`);
    if (enhanced.error) console.log(`      Error: ${enhanced.error}`);
    enhancedResults.push(enhanced);

    console.log();
  }

  // Write results to Neo4j
  const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));
  const session = driver.session();
  const pool = new pg.Pool({ connectionString: PG_URL });

  for (const result of [...originalResults, ...enhancedResults]) {
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO artifact_registry (artifact_type, artifact_id, sequence_number, payload, written_at)
       VALUES ($1, $2, COALESCE((SELECT MAX(sequence_number) FROM artifact_registry WHERE artifact_type = $1 AND artifact_id = $2), 0) + 1, $3, NOW())`,
      ["build", result.build_id, JSON.stringify({
        build_id: result.build_id, bridge_id: result.bridge_id, feature_id: `FEAT-RE-${result.scenario_id.toUpperCase()}`,
        status: result.success ? "PASSED" : "FAILED", blocked_reasons: [], queued_at: now,
        authorized_at: now, started_at: now, ended_at: now,
        builder_session_id: `claude-research-${result.label}`,
        artifact_refs: [{ artifact_type: "bridge", artifact_id: result.bridge_id, role: "constraint_source" }],
      })]
    );

    await session.run(
      `MERGE (b:BuildRecord {build_id: $build_id})
       ON CREATE SET b.bridge_id = $bridge_id, b.feature_type = $feature_type, b.risk = $risk,
         b.status = $status, b.tests_passed = $tests_passed, b.tests_failed = $tests_failed,
         b.files_generated = $files, b.lines_generated = $lines, b.duration_s = $duration_s,
         b.source = $source, b.research_enhanced = $enhanced, b.recorded_at = datetime()`,
      {
        build_id: result.build_id, bridge_id: result.bridge_id, feature_type: result.feature_type,
        risk: result.risk, status: result.success ? "PASSED" : "FAILED",
        tests_passed: neo4j.int(result.tests_passed), tests_failed: neo4j.int(result.tests_failed),
        files: neo4j.int(result.files), lines: neo4j.int(result.lines),
        duration_s: neo4j.int(result.duration_s),
        source: "research-comparison-runner",
        enhanced: result.label.startsWith("enhanced"),
      }
    );
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  const origPassed = originalResults.filter(r => r.success).length;
  const enhPassed = enhancedResults.filter(r => r.success).length;

  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  RESULTS: ORIGINAL vs RESEARCH-ENHANCED");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log(`  Original bridge:          ${origPassed}/${RUNS_PER} passed (${Math.round(origPassed/RUNS_PER*100)}%)`);
  console.log(`  Research-enhanced bridge:  ${enhPassed}/${RUNS_PER} passed (${Math.round(enhPassed/RUNS_PER*100)}%)\n`);

  console.log("  Detail:");
  for (let i = 0; i < RUNS_PER; i++) {
    const o = originalResults[i];
    const e = enhancedResults[i];
    console.log(`  Round ${i+1}: Original=${o.success ? "✓" : "✗"} (${o.tests_passed}t) | Enhanced=${e.success ? "✓" : "✗"} (${e.tests_passed}t)`);
  }

  console.log();
  if (enhPassed > origPassed) {
    console.log(`  ✅ RESEARCH IMPROVED SUCCESS RATE by +${enhPassed - origPassed} builds`);
  } else if (enhPassed === origPassed) {
    console.log(`  ── NO CHANGE in success rate`);
  } else {
    console.log(`  ❌ RESEARCH DID NOT HELP — regression of -${origPassed - enhPassed}`);
  }

  // Total graph state
  const totalBuilds = await session.run("MATCH (b:BuildRecord) RETURN COUNT(b) AS count");
  console.log(`\n  Total BuildRecord nodes in graph: ${totalBuilds.records[0].get("count").toNumber()}`);

  console.log("═══════════════════════════════════════════════════════════════════");

  await session.close();
  await pool.end();
  await driver.close();
}

main().catch((err) => { console.error("[AES] Fatal:", err.message); process.exit(1); });
