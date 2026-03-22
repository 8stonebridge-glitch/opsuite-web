#!/usr/bin/env node

/**
 * AES Phase 1 — Full Pipeline Runner
 *
 * The complete pipeline for the job queue:
 *   Path 1: Perplexity research → better bridge
 *   Path 2: Gemini review → two-pass if needed
 *   Path 3: Error-informed retry → feed failures back
 *
 * Perplexity = researcher (smarter input)
 * Gemini = reviewer (smarter process)
 * AES = governance (what becomes real)
 * Claude = builder (writes the code)
 */

import pg from "pg";
import neo4j from "neo4j-driver";
import { execSync, spawn } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const TIMEOUT_MS = 150_000;
const BASE_DIR = resolve(import.meta.dirname, "..", "tests");
const PG_URL = "postgres://aes:aes_dev_password@127.0.0.1:15432/aes_platform";
const NEO4J_URL = "bolt://127.0.0.1:17687";
const NEO4J_USER = "neo4j";
const NEO4J_PASS = "aes_dev_password";

// ─── Research-Enhanced Bridge (from Perplexity) ──────────────────────────────

const JOB_QUEUE_BRIDGE = {
  intent: "Build an async job queue with enqueue, process, retry, and status tracking",
  constraints: [
    "Write TypeScript only, no external deps",
    "Async/await based — job handlers are async functions",
    "Jobs have statuses: PENDING, RUNNING, COMPLETED, FAILED",
    "Failed jobs retry up to maxRetries (default 3) times before permanent FAILED",
    "Simulated backoff — compute delay but don't actually setTimeout",
    "Export functions only, no classes",
    "Export clearQueue() for test isolation",
    "Use Map<string, Job> as backing store",
    "Incrementing string IDs starting from '1'",
  ],
  type_definitions: `
// src/job-queue-types.ts — USE THESE EXACT TYPES

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface Job {
  id: string;
  name: string;
  payload: unknown;
  handler: (payload: unknown) => Promise<unknown>;
  status: JobStatus;
  result?: unknown;
  error?: string;
  attempts: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}

export interface EnqueueOptions {
  maxRetries?: number;
}
`,
  implementation_contract: `
// src/job-queue.ts — IMPLEMENT THESE EXACT SIGNATURES

import { Job, JobStatus, EnqueueOptions } from "./job-queue-types";

let nextId = 1;
const jobs = new Map<string, Job>();

export function enqueue(
  name: string,
  payload: unknown,
  handler: (payload: unknown) => Promise<unknown>,
  options?: EnqueueOptions
): Job {
  // Create job with status PENDING, attempts 0, maxRetries from options or 3
  // Store in jobs Map
  // Return the job
}

export async function processNext(): Promise<Job | null> {
  // Find first PENDING job (by insertion order — iterate Map values)
  // Set status to RUNNING, update updatedAt
  // Try: await handler(payload)
  //   Success: status = COMPLETED, store result
  //   Failure: attempts++
  //     if attempts >= maxRetries: status = FAILED, store error.message
  //     else: status = PENDING (ready for retry)
  // Always update updatedAt
  // Return the job, or null if no PENDING jobs
}

export async function processAll(): Promise<Job[]> {
  // Keep calling processNext() until it returns null
  // Return array of all processed jobs
  // IMPORTANT: this processes each PENDING job ONCE per pass
  // If a job fails and goes back to PENDING, it gets picked up again
  // But limit total iterations to prevent infinite loops: max = jobs.size * (maxRetries + 1)
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function listJobs(status?: JobStatus): Job[] {
  const all = Array.from(jobs.values());
  return status ? all.filter(j => j.status === status) : all;
}

export function clearQueue(): void {
  jobs.clear();
  nextId = 1;
}
`,
  known_failure_modes: [
    "CRITICAL: processAll can infinite loop if retry puts job back to PENDING — add iteration limit",
    "Handler might throw synchronously — always wrap in try/catch, not just .catch()",
    "Forget to update updatedAt on status changes",
    "attempts >= maxRetries (not >) for the failure check",
    "Map iteration order matches insertion order in JS — use this for 'oldest first'",
  ],
  test_template: `
// __tests__/job-queue.test.ts

import { enqueue, processNext, processAll, getJob, listJobs, clearQueue } from "../src/job-queue";

beforeEach(() => { clearQueue(); });

describe("enqueue", () => {
  test("creates job with PENDING status", () => {
    const job = enqueue("test", { x: 1 }, async () => "done");
    expect(job.status).toBe("PENDING");
    expect(job.attempts).toBe(0);
    expect(job.maxRetries).toBe(3);
    expect(job.id).toBeDefined();
  });

  test("custom maxRetries", () => {
    const job = enqueue("test", {}, async () => "ok", { maxRetries: 5 });
    expect(job.maxRetries).toBe(5);
  });
});

describe("processNext", () => {
  test("processes oldest PENDING job to COMPLETED", async () => {
    enqueue("job1", { val: 42 }, async (p: any) => p.val * 2);
    const processed = await processNext();
    expect(processed).not.toBeNull();
    expect(processed!.status).toBe("COMPLETED");
    expect(processed!.result).toBe(84);
  });

  test("returns null when no PENDING jobs", async () => {
    const result = await processNext();
    expect(result).toBeNull();
  });

  test("marks FAILED after maxRetries exhausted", async () => {
    enqueue("failing", {}, async () => { throw new Error("boom"); }, { maxRetries: 1 });
    await processNext(); // attempt 1 -> FAILED (1 >= 1)
    const job = getJob("1");
    expect(job!.status).toBe("FAILED");
    expect(job!.attempts).toBe(1);
    expect(job!.error).toContain("boom");
  });

  test("retries: job goes back to PENDING if attempts < maxRetries", async () => {
    enqueue("retry-me", {}, async () => { throw new Error("temp"); }, { maxRetries: 3 });
    await processNext(); // attempt 1 -> back to PENDING
    const job = getJob("1");
    expect(job!.status).toBe("PENDING");
    expect(job!.attempts).toBe(1);
  });
});

describe("processAll", () => {
  test("processes all pending jobs", async () => {
    enqueue("a", {}, async () => "A");
    enqueue("b", {}, async () => "B");
    const results = await processAll();
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(getJob("1")!.status).toBe("COMPLETED");
    expect(getJob("2")!.status).toBe("COMPLETED");
  });

  test("handles mix of success and failure", async () => {
    enqueue("ok", {}, async () => "fine");
    enqueue("bad", {}, async () => { throw new Error("nope"); }, { maxRetries: 1 });
    await processAll();
    expect(getJob("1")!.status).toBe("COMPLETED");
    expect(getJob("2")!.status).toBe("FAILED");
  });
});

describe("listing", () => {
  test("getJob returns undefined for unknown id", () => {
    expect(getJob("999")).toBeUndefined();
  });

  test("listJobs returns all jobs", () => {
    enqueue("a", {}, async () => "A");
    enqueue("b", {}, async () => "B");
    expect(listJobs().length).toBe(2);
  });

  test("listJobs filters by status", async () => {
    enqueue("a", {}, async () => "A");
    enqueue("b", {}, async () => "B");
    await processNext();
    expect(listJobs("COMPLETED").length).toBe(1);
    expect(listJobs("PENDING").length).toBe(1);
  });
});
`,
  acceptance_criteria: [
    { id: "ac-1", description: "enqueue creates job with PENDING status and attempts=0", mandatory: true },
    { id: "ac-2", description: "processNext processes oldest PENDING job to COMPLETED", mandatory: true },
    { id: "ac-3", description: "processNext marks FAILED when attempts >= maxRetries", mandatory: true },
    { id: "ac-4", description: "retry: failed job goes back to PENDING if attempts < maxRetries", mandatory: true },
    { id: "ac-5", description: "getJob returns job by id or undefined", mandatory: true },
    { id: "ac-6", description: "listJobs filters by status or returns all", mandatory: true },
    { id: "ac-7", description: "processAll processes all pending jobs including retries", mandatory: true },
  ],
  file_structure: {
    "src/job-queue-types.ts": "Use the type_definitions above EXACTLY as written",
    "src/job-queue.ts": "Implement the signatures from implementation_contract",
    "__tests__/job-queue.test.ts": "Use the test_template above EXACTLY as written",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
        files.push({ path: rel, lines: readFileSync(join(dir, entry.name), "utf-8").split("\n").length, content: readFileSync(join(dir, entry.name), "utf-8") });
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

    // Better parsing: look for the summary line
    const summaryMatch = result.match(/Tests:\s+(.*)/);
    const passMatch = result.match(/(\d+) passed/);
    const failMatch = result.match(/(\d+) failed/);
    const suiteFailMatch = result.match(/Test Suites:\s+(\d+) failed/);

    return {
      success: !suiteFailMatch && passMatch && !failMatch,
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
      output: result,
      error_summary: null,
    };
  } catch (err) {
    const output = err.stdout?.toString() ?? err.stderr?.toString() ?? err.message;
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);

    // Extract the actual error
    const tsError = output.match(/error TS\d+: .+/g);
    const runtimeError = output.match(/(?:TypeError|ReferenceError|SyntaxError): .+/g);
    const errorSummary = tsError?.join("\n") || runtimeError?.join("\n") || output.slice(0, 500);

    return {
      success: false,
      passed: passMatch ? parseInt(passMatch[1]) : 0,
      failed: failMatch ? parseInt(failMatch[1]) : 0,
      output,
      error_summary: errorSummary,
    };
  }
}

function setupWorkspace(workspace) {
  if (existsSync(workspace)) rmSync(workspace, { recursive: true });
  mkdirSync(join(workspace, "src"), { recursive: true });
  mkdirSync(join(workspace, "__tests__"), { recursive: true });
  writeFileSync(join(workspace, "tsconfig.json"), JSON.stringify({
    compilerOptions: { target: "ES2022", module: "commonjs", strict: true, esModuleInterop: true, outDir: "./dist", rootDir: "." },
    include: ["src/**/*.ts", "__tests__/**/*.ts"],
  }, null, 2));
  writeFileSync(join(workspace, "package.json"), JSON.stringify({ name: "aes-job-queue-pipeline", version: "0.0.1", private: true }, null, 2));
}

// ─── The Pipeline ────────────────────────────────────────────────────────────

async function runFullPipeline(attempt, workspace, previousError) {
  const buildId = `BLD-PIPELINE-${attempt}-${Date.now()}`;
  const bridgeId = `BRG-PIPELINE-${attempt}-${Date.now()}`;

  // Build the prompt
  const promptParts = [
    "You are the AES builder worker. Execute the bridge below precisely.",
    "Stay within src/ and __tests__/. Do not install packages. Do not ask questions.",
    "",
    "═══ TYPE DEFINITIONS (use these exactly in src/job-queue-types.ts) ═══",
    JOB_QUEUE_BRIDGE.type_definitions,
    "",
    "═══ IMPLEMENTATION CONTRACT (implement in src/job-queue.ts) ═══",
    JOB_QUEUE_BRIDGE.implementation_contract,
    "",
    "═══ TEST FILE (use this exactly in __tests__/job-queue.test.ts) ═══",
    JOB_QUEUE_BRIDGE.test_template,
    "",
    "═══ KNOWN FAILURE MODES ═══",
  ];

  for (const mode of JOB_QUEUE_BRIDGE.known_failure_modes) {
    promptParts.push(`  ⚠️ ${mode}`);
  }

  // Path 3: Error-informed retry
  if (previousError) {
    promptParts.push("");
    promptParts.push("═══ PREVIOUS BUILD FAILED — FIX THESE SPECIFIC ERRORS ═══");
    promptParts.push(previousError);
    promptParts.push("");
    promptParts.push("The types file and test file are provided above.");
    promptParts.push("Focus on fixing src/job-queue.ts to match the types and pass the tests.");
    promptParts.push("═══ END ERROR CONTEXT ═══");
  }

  promptParts.push("");
  promptParts.push(`Working directory: ${workspace}`);
  promptParts.push(`Build ID: ${buildId}`);
  promptParts.push("");
  promptParts.push("INSTRUCTIONS:");
  promptParts.push("1. Write src/job-queue-types.ts using the EXACT type definitions above");
  promptParts.push("2. Write src/job-queue.ts implementing the EXACT function signatures above");
  promptParts.push("3. Write __tests__/job-queue.test.ts using the EXACT test template above");
  promptParts.push("4. The test file imports from '../src/job-queue' — make sure exports match");
  promptParts.push("5. Finish with a summary");

  const prompt = promptParts.join("\n");

  console.log(`  Attempt ${attempt}: Building...`);
  const startTime = Date.now();

  const result = {
    attempt, build_id: buildId, bridge_id: bridgeId,
    success: false, files: 0, lines: 0, tests_passed: 0, tests_failed: 0,
    violations: [], duration_s: 0, error: null, error_summary: null,
  };

  try {
    setupWorkspace(workspace);
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
        result.success = testResult.success;
        result.error_summary = testResult.error_summary;

        if (!testResult.success) {
          result.violations.push(`Tests failed or errored`);
        }

        // Check file structure
        for (const req of Object.keys(JOB_QUEUE_BRIDGE.file_structure)) {
          if (!files.some(f => f.path === req)) {
            result.violations.push(`Missing: ${req}`);
            result.success = false;
          }
        }
      }
    }
  } catch (err) {
    result.error = err.message;
  }

  result.duration_s = Math.round((Date.now() - startTime) / 1000);

  const status = result.success ? "✓ PASSED" : "✗ FAILED";
  console.log(`  Attempt ${attempt}: ${status} | ${result.files} files, ${result.lines} lines | ${result.tests_passed}p/${result.tests_failed}f | ${result.duration_s}s`);
  if (result.error_summary && !result.success) {
    const shortError = result.error_summary.split("\n").slice(0, 5).join("\n    ");
    console.log(`    Error: ${shortError}`);
  }

  return result;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════════════");
  console.log("  AES Phase 1 — Full Pipeline: Research + Review + Error Retry");
  console.log("  Path 1: Perplexity research in bridge");
  console.log("  Path 2: Exact types + signatures + test template provided");
  console.log("  Path 3: Error-informed retry (feed failure back)");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  const workspace = join(BASE_DIR, "scenario-full-pipeline");
  const MAX_ATTEMPTS = 3;
  const allResults = [];

  let previousError = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await runFullPipeline(attempt, workspace, previousError);
    allResults.push(result);

    if (result.success) {
      console.log(`\n  ✅ BUILD PASSED on attempt ${attempt}`);
      break;
    }

    // Path 3: Feed the error forward
    previousError = result.error_summary || result.error || "Unknown error — tests did not pass";
    console.log(`  → Feeding error into next attempt\n`);
  }

  // Cleanup
  if (existsSync(workspace)) rmSync(workspace, { recursive: true });

  // Write results to stack
  const pool = new pg.Pool({ connectionString: PG_URL });
  const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));
  const session = driver.session();

  for (const result of allResults) {
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO artifact_registry (artifact_type, artifact_id, sequence_number, payload, written_at)
       VALUES ($1, $2, COALESCE((SELECT MAX(sequence_number) FROM artifact_registry WHERE artifact_type = $1 AND artifact_id = $2), 0) + 1, $3, NOW())`,
      ["build", result.build_id, JSON.stringify({
        build_id: result.build_id, bridge_id: result.bridge_id,
        feature_id: "FEAT-JOB-QUEUE-PIPELINE",
        status: result.success ? "PASSED" : "FAILED",
        blocked_reasons: [], queued_at: now, authorized_at: now, started_at: now, ended_at: now,
        builder_session_id: `claude-pipeline-attempt-${result.attempt}`,
        artifact_refs: [{ artifact_type: "bridge", artifact_id: result.bridge_id, role: "constraint_source" }],
      })]
    );

    await session.run(
      `MERGE (b:BuildRecord {build_id: $build_id})
       ON CREATE SET b.bridge_id = $bridge_id, b.feature_type = 'backend_platform', b.risk = 'high',
         b.status = $status, b.tests_passed = $tests_passed, b.tests_failed = $tests_failed,
         b.files_generated = $files, b.lines_generated = $lines, b.duration_s = $duration_s,
         b.source = 'full-pipeline-runner', b.pipeline_attempt = $attempt,
         b.research_enhanced = true, b.error_informed_retry = $retry,
         b.recorded_at = datetime()`,
      {
        build_id: result.build_id, bridge_id: result.bridge_id,
        status: result.success ? "PASSED" : "FAILED",
        tests_passed: neo4j.int(result.tests_passed), tests_failed: neo4j.int(result.tests_failed),
        files: neo4j.int(result.files), lines: neo4j.int(result.lines),
        duration_s: neo4j.int(result.duration_s), attempt: neo4j.int(result.attempt),
        retry: result.attempt > 1,
      }
    );
  }

  // Summary
  const finalResult = allResults[allResults.length - 1];
  const totalAttempts = allResults.length;

  console.log("\n═══════════════════════════════════════════════════════════════════");
  console.log("  FULL PIPELINE RESULTS");
  console.log("═══════════════════════════════════════════════════════════════════\n");

  console.log(`  Total attempts: ${totalAttempts}`);
  console.log(`  Final result: ${finalResult.success ? "✓ PASSED" : "✗ FAILED"}`);
  console.log(`  Tests: ${finalResult.tests_passed} passed, ${finalResult.tests_failed} failed`);
  console.log();

  for (const r of allResults) {
    console.log(`  Attempt ${r.attempt}: ${r.success ? "✓" : "✗"} | ${r.tests_passed}p/${r.tests_failed}f | ${r.duration_s}s${r.attempt > 1 ? " (error-informed)" : ""}`);
  }

  // Graph totals
  const totalBuilds = await session.run("MATCH (b:BuildRecord) RETURN COUNT(b) AS count");
  console.log(`\n  Total BuildRecord nodes in graph: ${totalBuilds.records[0].get("count").toNumber()}`);

  console.log("═══════════════════════════════════════════════════════════════════");

  await session.close();
  await pool.end();
  await driver.close();
}

main().catch((err) => { console.error("[AES] Fatal:", err.message); process.exit(1); });
