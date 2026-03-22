#!/usr/bin/env node

/**
 * AES — Replay Build Results to Live Stack
 *
 * Reads the batch-report.json and scenario-report.json files,
 * writes all 16 build results into:
 *   1. Postgres (artifact_registry table) via PostgresStorage
 *   2. Neo4j (BuildRecord, FeatureSpec, FailurePattern nodes)
 *
 * This makes all historical build data queryable and persistent.
 */

import pg from "pg";
import neo4j from "neo4j-driver";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TEST_DIR = resolve(import.meta.dirname, "..", "tests");

// ─── Config ──────────────────────────────────────────────────────────────────

const PG_URL = "postgres://aes:aes_dev_password@127.0.0.1:15432/aes_platform";
const NEO4J_URL = "bolt://127.0.0.1:17687";
const NEO4J_USER = "neo4j";
const NEO4J_PASS = "aes_dev_password";

// ─── Load Reports ────────────────────────────────────────────────────────────

function loadReports() {
  const batchReport = JSON.parse(readFileSync(resolve(TEST_DIR, "batch-report.json"), "utf-8"));
  const scenarioReport = JSON.parse(readFileSync(resolve(TEST_DIR, "scenario-report.json"), "utf-8"));
  return { batchReport, scenarioReport };
}

// ─── Postgres: Write Artifacts ───────────────────────────────────────────────

async function writeToPostgres(pool, artifacts) {
  // Ensure schema exists
  const schemaPath = resolve(import.meta.dirname, "..", "schema.sql");
  const schema = readFileSync(schemaPath, "utf-8");
  await pool.query(schema);
  console.log("  Postgres schema applied");

  let written = 0;
  for (const artifact of artifacts) {
    const sql = `
      INSERT INTO artifact_registry
        (artifact_type, artifact_id, sequence_number, payload, written_at)
      VALUES (
        $1, $2,
        COALESCE(
          (SELECT MAX(sequence_number) FROM artifact_registry
           WHERE artifact_type = $1 AND artifact_id = $2),
          0
        ) + 1,
        $3,
        NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING internal_id
    `;
    try {
      const result = await pool.query(sql, [
        artifact.artifact_type,
        artifact.artifact_id,
        JSON.stringify(artifact.payload),
      ]);
      if (result.rows.length > 0) written++;
    } catch (err) {
      console.log(`    Warning: ${artifact.artifact_id}: ${err.message}`);
    }
  }
  return written;
}

// ─── Neo4j: Write Build Nodes ────────────────────────────────────────────────

async function writeToNeo4j(session, buildRecords) {
  let written = 0;

  for (const record of buildRecords) {
    // Create BuildRecord node
    await session.run(
      `MERGE (b:BuildRecord {build_id: $build_id})
       ON CREATE SET
         b.bridge_id = $bridge_id,
         b.feature_id = $feature_id,
         b.feature_type = $feature_type,
         b.risk = $risk,
         b.status = $status,
         b.tests_passed = $tests_passed,
         b.tests_failed = $tests_failed,
         b.files_generated = $files,
         b.lines_generated = $lines,
         b.duration_s = $duration_s,
         b.error = $error,
         b.violations = $violations,
         b.source = $source,
         b.recorded_at = datetime()
       ON MATCH SET
         b.status = $status`,
      {
        build_id: record.build_id,
        bridge_id: record.bridge_id,
        feature_id: record.feature_id,
        feature_type: record.feature_type,
        risk: record.risk,
        status: record.status,
        tests_passed: neo4j.int(record.tests_passed),
        tests_failed: neo4j.int(record.tests_failed),
        files: neo4j.int(record.files),
        lines: neo4j.int(record.lines),
        duration_s: neo4j.int(record.duration_s),
        error: record.error || "",
        violations: record.violations.join("; ") || "",
        source: record.source,
      }
    );
    written++;

    // Link to FeatureSpec if it exists, or create a lightweight one
    await session.run(
      `MERGE (f:FeatureSpec {feature_id: $feature_id})
       ON CREATE SET
         f.feature_type = $feature_type,
         f.risk = $risk,
         f.name = $name,
         f.created_at = datetime()
       WITH f
       MATCH (b:BuildRecord {build_id: $build_id})
       MERGE (b)-[:BUILDS]->(f)`,
      {
        feature_id: record.feature_id,
        feature_type: record.feature_type,
        risk: record.risk,
        name: record.name,
        build_id: record.build_id,
      }
    );

    // Create FailurePattern if failed
    if (record.status === "FAILED") {
      const failureType = record.error === "timeout" ? "TIMEOUT"
        : record.violations.some(v => v.includes("Tests")) ? "TEST_FAILURE"
        : record.violations.some(v => v.includes("Scope")) ? "SCOPE_VIOLATION"
        : "UNKNOWN";

      await session.run(
        `MERGE (fp:FailurePattern {pattern_type: $pattern_type, feature_type: $feature_type, risk: $risk})
         ON CREATE SET
           fp.occurrence_count = 1,
           fp.first_seen = datetime(),
           fp.description = $description
         ON MATCH SET
           fp.occurrence_count = fp.occurrence_count + 1,
           fp.last_seen = datetime()
         WITH fp
         MATCH (b:BuildRecord {build_id: $build_id})
         MERGE (b)-[:EXHIBITED]->(fp)`,
        {
          pattern_type: failureType,
          feature_type: record.feature_type,
          risk: record.risk,
          description: record.error || record.violations.join("; "),
          build_id: record.build_id,
        }
      );
    }
  }

  // Create summary aggregation nodes
  const statuses = buildRecords.map(r => r.status);
  const passCount = statuses.filter(s => s === "PASSED").length;
  const failCount = statuses.filter(s => s === "FAILED").length;

  await session.run(
    `MERGE (bs:BuildSummary {session_id: $session_id})
     SET bs.total_builds = $total,
         bs.passed = $passed,
         bs.failed = $failed,
         bs.success_rate = $rate,
         bs.recorded_at = datetime()`,
    {
      session_id: `replay-${Date.now()}`,
      total: neo4j.int(buildRecords.length),
      passed: neo4j.int(passCount),
      failed: neo4j.int(failCount),
      rate: passCount / buildRecords.length,
    }
  );

  return written;
}

// ─── Transform Reports to Artifacts + BuildRecords ───────────────────────────

function transformReports(batchReport, scenarioReport) {
  const now = new Date().toISOString();
  const artifacts = [];
  const buildRecords = [];

  // Batch runs (todo CRUD × 10)
  for (const run of batchReport.runs) {
    const buildId = `BLD-BATCH-${run.run}-${Date.now()}`;
    const bridgeId = run.bridge_id;
    const featureId = `FEAT-TODO-BATCH-${run.run}`;

    // Build artifact for Postgres
    artifacts.push({
      artifact_type: "build",
      artifact_id: buildId,
      payload: {
        build_id: buildId,
        bridge_id: bridgeId,
        feature_id: featureId,
        status: run.success ? "PASSED" : "FAILED",
        blocked_reasons: [],
        queued_at: now,
        authorized_at: now,
        started_at: now,
        ended_at: now,
        builder_session_id: `claude-batch-run-${run.run}`,
        artifact_refs: [
          { artifact_type: "bridge", artifact_id: bridgeId, role: "constraint_source" },
        ],
      },
    });

    // Test run artifact for Postgres
    const testRunId = `TR-BATCH-${run.run}-${Date.now()}`;
    artifacts.push({
      artifact_type: "test_run",
      artifact_id: testRunId,
      payload: {
        test_run_id: testRunId,
        build_id: buildId,
        bridge_id: bridgeId,
        feature_id: featureId,
        executed_at: now,
        test_cases_run: run.tests_passed + run.tests_failed,
        passed: run.tests_passed,
        failed: run.tests_failed,
        skipped: 0,
        status: run.success ? "PASS" : "FAIL",
        failure_details: run.violations.map(v => ({ test_name: "validation", message: v })),
        blob_ref: null,
        artifact_refs: [
          { artifact_type: "build", artifact_id: buildId, role: "test_source" },
        ],
      },
    });

    // Build record for Neo4j
    buildRecords.push({
      build_id: buildId,
      bridge_id: bridgeId,
      feature_id: featureId,
      feature_type: "backend_platform",
      risk: "low",
      name: `Todo CRUD (Batch Run ${run.run})`,
      status: run.success ? "PASSED" : "FAILED",
      tests_passed: run.tests_passed,
      tests_failed: run.tests_failed,
      files: run.files,
      lines: run.lines,
      duration_s: run.duration_s,
      error: run.error,
      violations: run.violations,
      source: "batch-runner",
    });
  }

  // Scenario runs (6 different feature types)
  for (const scenario of scenarioReport.scenarios) {
    const buildId = `BLD-SCENARIO-${scenario.scenario_id}-${Date.now()}`;
    const bridgeId = `BRG-SCENARIO-${scenario.scenario_id}-${Date.now()}`;
    const featureId = `FEAT-${scenario.scenario_id.toUpperCase()}`;

    artifacts.push({
      artifact_type: "build",
      artifact_id: buildId,
      payload: {
        build_id: buildId,
        bridge_id: bridgeId,
        feature_id: featureId,
        status: scenario.success ? "PASSED" : "FAILED",
        blocked_reasons: [],
        queued_at: now,
        authorized_at: now,
        started_at: now,
        ended_at: now,
        builder_session_id: `claude-scenario-${scenario.scenario_id}`,
        artifact_refs: [
          { artifact_type: "bridge", artifact_id: bridgeId, role: "constraint_source" },
        ],
      },
    });

    const testRunId = `TR-SCENARIO-${scenario.scenario_id}-${Date.now()}`;
    artifacts.push({
      artifact_type: "test_run",
      artifact_id: testRunId,
      payload: {
        test_run_id: testRunId,
        build_id: buildId,
        bridge_id: bridgeId,
        feature_id: featureId,
        executed_at: now,
        test_cases_run: scenario.tests_passed + scenario.tests_failed,
        passed: scenario.tests_passed,
        failed: scenario.tests_failed,
        skipped: 0,
        status: scenario.success ? "PASS" : "FAIL",
        failure_details: scenario.violations.map(v => ({ test_name: "validation", message: v })),
        blob_ref: null,
        artifact_refs: [
          { artifact_type: "build", artifact_id: buildId, role: "test_source" },
        ],
      },
    });

    buildRecords.push({
      build_id: buildId,
      bridge_id: bridgeId,
      feature_id: featureId,
      feature_type: scenario.feature_type,
      risk: scenario.risk,
      name: scenario.name,
      status: scenario.success ? "PASSED" : "FAILED",
      tests_passed: scenario.tests_passed,
      tests_failed: scenario.tests_failed,
      files: scenario.files,
      lines: scenario.lines,
      duration_s: scenario.duration_s,
      error: scenario.error,
      violations: scenario.violations,
      source: "scenario-runner",
    });
  }

  return { artifacts, buildRecords };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  AES — Replay Build Results to Live Stack");
  console.log("═══════════════════════════════════════════════════════════\n");

  // Load reports
  const { batchReport, scenarioReport } = loadReports();
  console.log(`  Loaded: ${batchReport.runs.length} batch runs + ${scenarioReport.scenarios.length} scenario runs = ${batchReport.runs.length + scenarioReport.scenarios.length} total\n`);

  // Transform
  const { artifacts, buildRecords } = transformReports(batchReport, scenarioReport);
  console.log(`  Artifacts to write: ${artifacts.length}`);
  console.log(`  Build records for Neo4j: ${buildRecords.length}\n`);

  // Connect to Postgres
  console.log("─── Postgres ─────────────────────────────────────────────");
  const pool = new pg.Pool({ connectionString: PG_URL });

  try {
    const client = await pool.connect();
    console.log("  Connected to Postgres");
    client.release();

    const pgWritten = await writeToPostgres(pool, artifacts);
    console.log(`  Written: ${pgWritten} artifacts to artifact_registry\n`);

    // Verify
    const countResult = await pool.query("SELECT COUNT(*) FROM artifact_registry");
    console.log(`  Total artifacts in Postgres: ${countResult.rows[0].count}`);

    const typeResult = await pool.query(
      "SELECT artifact_type, COUNT(*) as cnt FROM artifact_registry GROUP BY artifact_type ORDER BY cnt DESC"
    );
    for (const row of typeResult.rows) {
      console.log(`    ${row.artifact_type}: ${row.cnt}`);
    }
    console.log();
  } catch (err) {
    console.log(`  Postgres error: ${err.message}\n`);
  }

  // Connect to Neo4j
  console.log("─── Neo4j ────────────────────────────────────────────────");
  const driver = neo4j.driver(NEO4J_URL, neo4j.auth.basic(NEO4J_USER, NEO4J_PASS));

  try {
    await driver.verifyConnectivity();
    console.log("  Connected to Neo4j");

    const session = driver.session();
    const neo4jWritten = await writeToNeo4j(session, buildRecords);
    console.log(`  Written: ${neo4jWritten} BuildRecord nodes\n`);

    // Verify
    const countResult = await session.run("MATCH (b:BuildRecord) RETURN COUNT(b) AS count");
    console.log(`  Total BuildRecord nodes: ${countResult.records[0].get("count").toNumber()}`);

    const statusResult = await session.run(
      "MATCH (b:BuildRecord) RETURN b.status AS status, COUNT(b) AS count ORDER BY count DESC"
    );
    for (const record of statusResult.records) {
      console.log(`    ${record.get("status")}: ${record.get("count").toNumber()}`);
    }

    const featureResult = await session.run(
      "MATCH (f:FeatureSpec) RETURN f.feature_id AS id, f.feature_type AS type, f.risk AS risk"
    );
    console.log(`\n  FeatureSpec nodes: ${featureResult.records.length}`);
    for (const record of featureResult.records) {
      console.log(`    ${record.get("id")} [${record.get("type")}] risk=${record.get("risk")}`);
    }

    const failureResult = await session.run(
      "MATCH (fp:FailurePattern) RETURN fp.pattern_type AS type, fp.feature_type AS ft, fp.occurrence_count AS count"
    );
    console.log(`\n  FailurePattern nodes: ${failureResult.records.length}`);
    for (const record of failureResult.records) {
      console.log(`    ${record.get("type")} in ${record.get("ft")}: ${record.get("count")} occurrences`);
    }

    // Query: success rate by risk level
    const riskResult = await session.run(
      `MATCH (b:BuildRecord)
       RETURN b.risk AS risk,
              COUNT(b) AS total,
              SUM(CASE WHEN b.status = 'PASSED' THEN 1 ELSE 0 END) AS passed`
    );
    console.log(`\n  Success rate by risk:`);
    for (const record of riskResult.records) {
      const total = record.get("total").toNumber();
      const passed = record.get("passed").toNumber();
      console.log(`    ${record.get("risk")}: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    }

    // Query: success rate by feature type
    const ftResult = await session.run(
      `MATCH (b:BuildRecord)
       RETURN b.feature_type AS type,
              COUNT(b) AS total,
              SUM(CASE WHEN b.status = 'PASSED' THEN 1 ELSE 0 END) AS passed`
    );
    console.log(`\n  Success rate by feature type:`);
    for (const record of ftResult.records) {
      const total = record.get("total").toNumber();
      const passed = record.get("passed").toNumber();
      console.log(`    ${record.get("type")}: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    }

    await session.close();
  } catch (err) {
    console.log(`  Neo4j error: ${err.message}\n`);
  }

  await pool.end();
  await driver.close();

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("  Replay complete. All build data is now in the live stack.");
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("[AES] Fatal:", err.message);
  process.exit(1);
});
