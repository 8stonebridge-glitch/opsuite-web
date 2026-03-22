/**
 * AES End-to-End Test — "Build Slack"
 *
 * Tests the full AES pipeline from "build Slack" to governance training:
 *   1. App intake: submit "build Slack"
 *   2. Decomposition: break into feature specs
 *   3. Prepare build: bridge compilation + policy for each feature
 *   4. Build execution: simulated builder session
 *   5. Validation: run validators on each build
 *   6. Historical scenario conversion: feed artifacts to governance
 *   7. Governance training: loop on real + synthetic data
 *
 * Uses in-memory storage — no Docker, no Neo4j, no Postgres.
 */

import { ArtifactRegistry } from "../src/registry/registry";
import { InMemoryStorage } from "../src/registry/storage";
import { AppIntakeService } from "../src/intake/app-intake";
import { AppDecomposer, type CandidateFeature } from "../src/planning/app-decomposer";
import type {
  AppSpec,
  FeatureSpec,
} from "../src/types/app-spec";
import type {
  Bridge,
  Build,
  DiffArtifact,
  TestRun,
  ValidatorRun,
} from "../src/types/artifacts";
import { generateArtifactId } from "../src/registry/id-generator";
import { loadHistoricalScenarios } from "../src/governance/historical-scenario-converter";
import { generateSyntheticScenarios } from "../src/governance/synthetic-scenarios";
import { runGovernanceLoop, DEFAULT_LOOP_CONFIG } from "../src/governance/governance-loop";
import { createBaselineGovernanceConfig } from "../src/governance/governance-config-defaults";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRegistry() {
  return new ArtifactRegistry(new InMemoryStorage());
}

/** Simulate building a feature: create bridge, build, diff, test run, validator run */
async function simulateFeatureBuild(
  registry: ArtifactRegistry,
  feature: FeatureSpec,
  shouldPass: boolean,
  scopeViolation: boolean = false,
) {
  const bridgeId = generateArtifactId("bridge");
  const buildId = generateArtifactId("build");
  const now = new Date().toISOString();

  // Write bridge
  const bridge: Bridge = {
    bridge_id: bridgeId,
    build_id: buildId,
    feature_id: feature.feature_id,
    generated_at: now,
    graph_snapshot_id: "SNAP-test",
    graph_truth_hash: "hash-test",
    bridge_version: 1,
    intent: feature.description,
    scope: { paths: [`src/${feature.feature_type}/`] },
    out_of_scope: [],
    constraints: ["Must use existing auth middleware"],
    tiered_constraints: [],
    patterns: ["repository-pattern"],
    anti_patterns: [],
    data_model: {},
    api_contracts: [],
    events: feature.events || [],
    db_touches: [],
    component_boundaries: [],
    read_scope: { paths: [`src/${feature.feature_type}/`, "src/shared/"] },
    write_scope: { paths: [`src/${feature.feature_type}/`] },
    read_scope_amendments: [],
    depends_on_bridge_ids: [],
    predecessor_build_ids: [],
    dependency_type: feature.dependencies.length > 0 ? "HARD" : "NONE",
    acceptance_criteria: feature.acceptance_criteria || [],
    test_cases: feature.test_cases || [],
    confidence: feature.confidence_summary.overall,
    confidence_breakdown: {
      graph_coverage: 0.7,
      pattern_strength: 0.6,
      rule_consistency: 0.8,
      evidence_level: 0.5,
    },
    artifact_refs: [
      { artifact_type: "graph_snapshot", artifact_id: "SNAP-test", role: "graph_snapshot_source" },
    ],
    status: "VALIDATED",
  };
  await registry.write("bridge", bridge);

  // Write build
  const build: Build = {
    build_id: buildId,
    bridge_id: bridgeId,
    feature_id: feature.feature_id,
    status: shouldPass ? "PASSED" : "FAILED",
    blocked_reasons: [],
    queued_at: now,
    authorized_at: now,
    started_at: now,
    ended_at: now,
    builder_session_id: "session-test",
    artifact_refs: [
      { artifact_type: "bridge", artifact_id: bridgeId, role: "constraint_source" },
    ],
  };
  await registry.write("build", build);

  // Write diff
  const diff: DiffArtifact = {
    diff_artifact_id: generateArtifactId("diff_artifact"),
    build_id: buildId,
    bridge_id: bridgeId,
    feature_id: feature.feature_id,
    captured_at: now,
    changed_files: [
      {
        path: `src/${feature.feature_type}/index.ts`,
        change_type: "modified",
        lines_added: 50,
        lines_removed: 10,
        in_write_scope: true,
      },
      {
        path: `src/${feature.feature_type}/service.ts`,
        change_type: "added",
        lines_added: 120,
        lines_removed: 0,
        in_write_scope: true,
      },
      ...(scopeViolation
        ? [{
            path: "src/auth/middleware.ts",
            change_type: "modified" as const,
            lines_added: 5,
            lines_removed: 2,
            in_write_scope: false,
          }]
        : []),
    ],
    path_violations: scopeViolation
      ? [{
          path: "src/auth/middleware.ts",
          violation_type: "outside_write_scope" as const,
          description: "Modified auth middleware outside write_scope",
        }]
      : [],
    blob_ref: null,
    artifact_refs: [
      { artifact_type: "build", artifact_id: buildId, role: "diff_source" },
    ],
  };
  await registry.write("diff_artifact", diff);

  // Write test run
  const testRun: TestRun = {
    test_run_id: generateArtifactId("test_run"),
    build_id: buildId,
    bridge_id: bridgeId,
    feature_id: feature.feature_id,
    executed_at: now,
    test_cases_run: 10,
    passed: shouldPass ? 10 : 7,
    failed: shouldPass ? 0 : 3,
    skipped: 0,
    status: shouldPass ? "PASS" : "FAIL",
    failure_details: shouldPass
      ? []
      : [
          {
            test_case_id: "tc-1",
            test_name: "should handle edge case",
            error_message: "Expected true, got false",
          },
        ],
    blob_ref: null,
    artifact_refs: [
      { artifact_type: "build", artifact_id: buildId, role: "test_source" },
    ],
  };
  await registry.write("test_run", testRun);

  // Write validator run
  const validatorRun: ValidatorRun = {
    validator_id: "v-structural",
    validator_run_id: generateArtifactId("validator_run"),
    build_id: buildId,
    bridge_id: bridgeId,
    validated_at: now,
    status: shouldPass ? "PASS" : "FAIL",
    evidence: [],
    violations: scopeViolation
      ? [{
          rule: "scope_enforcement",
          severity: "HARD",
          location: "src/auth/middleware.ts",
          description: "File outside write_scope was modified",
        }]
      : [],
    missing: [],
    concerns: shouldPass ? [] : ["Test coverage below 80%"],
    confidence: shouldPass ? 0.9 : 0.3,
    artifact_refs: [
      { artifact_type: "build", artifact_id: buildId, role: "validation_evidence" },
    ],
  };
  await registry.write("validator_run", validatorRun);

  return { bridge, build, diff, testRun, validatorRun };
}

// ─── The Slack Feature Set ───────────────────────────────────────────────────

const SLACK_FEATURES: CandidateFeature[] = [
  {
    name: "Authentication & User Management",
    description: "User registration, login, OAuth, session management, workspace membership",
    feature_type: "backend_platform",
    auth_requirements: [{ type: "role_based", description: "Admin and member roles" }],
    data_entities: [{ name: "User", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE"] }],
    acceptance_criteria: [
      { id: "ac-auth-1", description: "Users can sign up and log in", type: "functional", mandatory: true },
      { id: "ac-auth-2", description: "OAuth flow works", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-auth-1", description: "Login flow", type: "e2e", linked_criterion_id: "ac-auth-1", mandatory: true },
      { id: "tc-auth-2", description: "OAuth callback", type: "integration", linked_criterion_id: "ac-auth-2", mandatory: true },
    ],
    confidence: { overall: 0.82 },
  },
  {
    name: "Channels & Conversations",
    description: "Public/private channels, DMs, channel membership, thread support",
    feature_type: "collaboration_system",
    depends_on: ["Authentication & User Management"],
    data_entities: [
      { name: "Channel", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE", "DELETE"] },
      { name: "Membership", owner_feature_id: "", operations: ["CREATE", "READ", "DELETE"] },
    ],
    acceptance_criteria: [
      { id: "ac-ch-1", description: "Users can create channels", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-ch-1", description: "Create channel", type: "integration", linked_criterion_id: "ac-ch-1", mandatory: true },
    ],
    confidence: { overall: 0.75 },
  },
  {
    name: "Real-time Messaging",
    description: "Send/receive messages via WebSocket, message persistence, typing indicators",
    feature_type: "collaboration_system",
    depends_on: ["Channels & Conversations"],
    events: [{ name: "message.sent", payload_shape: { text: "string" } }],
    acceptance_criteria: [
      { id: "ac-msg-1", description: "Messages delivered in real-time", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-msg-1", description: "WebSocket message delivery", type: "e2e", linked_criterion_id: "ac-msg-1", mandatory: true },
    ],
    confidence: { overall: 0.68 },
  },
  {
    name: "Notifications",
    description: "Push notifications, email digests, mention alerts, notification preferences",
    feature_type: "notification_system",
    depends_on: ["Real-time Messaging"],
    integrations: [{ name: "Email", type: "email", required: true }],
    acceptance_criteria: [
      { id: "ac-notif-1", description: "Users receive mention notifications", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-notif-1", description: "Mention triggers notification", type: "integration", linked_criterion_id: "ac-notif-1", mandatory: true },
    ],
    confidence: { overall: 0.71 },
  },
  {
    name: "Search",
    description: "Full-text search across messages, files, channels",
    feature_type: "backend_platform",
    depends_on: ["Real-time Messaging"],
    acceptance_criteria: [
      { id: "ac-search-1", description: "Search returns relevant messages", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-search-1", description: "Full-text message search", type: "integration", linked_criterion_id: "ac-search-1", mandatory: true },
    ],
    confidence: { overall: 0.73 },
  },
  {
    name: "File Sharing",
    description: "Upload, preview, and share files in channels and DMs",
    feature_type: "collaboration_system",
    depends_on: ["Channels & Conversations"],
    data_entities: [{ name: "File", owner_feature_id: "", operations: ["CREATE", "READ", "DELETE"] }],
    destructive_actions: [{ action: "Delete file", reversible: false, confirmation_required: true, audit_logged: true }],
    acceptance_criteria: [
      { id: "ac-file-1", description: "Users can upload and share files", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-file-1", description: "File upload flow", type: "e2e", linked_criterion_id: "ac-file-1", mandatory: true },
    ],
    confidence: { overall: 0.77 },
  },
  {
    name: "Onboarding",
    description: "Workspace creation, invite flow, first-run experience",
    feature_type: "onboarding",
    depends_on: ["Authentication & User Management"],
    acceptance_criteria: [
      { id: "ac-onb-1", description: "New users complete onboarding flow", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-onb-1", description: "Onboarding completion", type: "e2e", linked_criterion_id: "ac-onb-1", mandatory: true },
    ],
    confidence: { overall: 0.80 },
  },
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Build Slack — End-to-End", () => {
  let registry: ArtifactRegistry;
  let app: AppSpec;
  let features: FeatureSpec[];

  beforeAll(async () => {
    registry = makeRegistry();

    // Step 1: Submit "build Slack"
    const intake = new AppIntakeService(registry);
    const appRecord = await intake.submitApp({
      description: "Build a Slack-like team communication app with channels, real-time messaging, file sharing, notifications, and search",
      requested_by: "operator",
      name: "Slack Clone",
      product_type: "team_communication",
      target_users: ["developers", "teams", "enterprises"],
    });
    app = appRecord.payload;

    // Step 2: Decompose into features
    const decomposer = new AppDecomposer();
    const result = decomposer.decompose({
      app,
      candidate_features: SLACK_FEATURES,
    });
    features = result.features;

    // Update app with feature IDs
    await intake.updateApp(app.app_id, {
      feature_ids: features.map(f => f.feature_id),
      confidence_summary: {
        decomposition_confidence: 0.85,
        research_coverage: 0.70,
        verification_score: 0.75,
        overall: 0.77,
      },
    });

    // Write features to registry
    for (const feature of features) {
      await registry.write("feature_spec", feature);
    }

    // Step 3: Simulate builds for each feature
    // Auth: passes
    await simulateFeatureBuild(registry, features[0]!, true);
    // Channels: passes
    await simulateFeatureBuild(registry, features[1]!, true);
    // Messaging: passes but with scope violation
    await simulateFeatureBuild(registry, features[2]!, false, true);
    // Notifications: fails (dependency on messaging which had issues)
    await simulateFeatureBuild(registry, features[3]!, false);
    // Search: passes
    await simulateFeatureBuild(registry, features[4]!, true);
    // File Sharing: passes
    await simulateFeatureBuild(registry, features[5]!, true);
    // Onboarding: passes
    await simulateFeatureBuild(registry, features[6]!, true);
  });

  test("app spec was created correctly", () => {
    expect(app.name).toBe("Slack Clone");
    expect(app.product_type).toBe("team_communication");
    expect(app.promotion_status).toBe("DRAFT");
  });

  test("decomposition produced 7 features", () => {
    expect(features).toHaveLength(7);
    const types = features.map(f => f.feature_type);
    expect(types).toContain("backend_platform");
    expect(types).toContain("collaboration_system");
    expect(types).toContain("notification_system");
    expect(types).toContain("onboarding");
  });

  test("features have correct dependency ordering", () => {
    const authFeature = features.find(f => f.name === "Authentication & User Management");
    const channelsFeature = features.find(f => f.name === "Channels & Conversations");
    const messagingFeature = features.find(f => f.name === "Real-time Messaging");

    expect(authFeature).toBeDefined();
    expect(channelsFeature).toBeDefined();
    expect(messagingFeature).toBeDefined();

    // Channels depends on Auth
    expect(channelsFeature!.dependencies).toContain(authFeature!.feature_id);
    // Messaging depends on Channels
    expect(messagingFeature!.dependencies).toContain(channelsFeature!.feature_id);
  });

  test("builds were recorded in registry", async () => {
    const builds = await registry.latestByType<Build>("build");
    expect(builds.length).toBe(7);

    const passed = builds.filter(b => b.payload.status === "PASSED");
    const failed = builds.filter(b => b.payload.status === "FAILED");
    expect(passed.length).toBe(5);
    expect(failed.length).toBe(2);
  });

  test("scope violation was captured in diff", async () => {
    const diffs = await registry.latestByType<DiffArtifact>("diff_artifact");
    const violations = diffs.filter(d => d.payload.path_violations.length > 0);
    expect(violations.length).toBe(1);
    expect(violations[0]!.payload.path_violations[0]!.violation_type).toBe("outside_write_scope");
  });

  test("historical scenarios are extracted from build artifacts", async () => {
    const scenarios = await loadHistoricalScenarios(registry);

    // Should have per-feature scenarios + cross-feature scenarios
    expect(scenarios.length).toBeGreaterThanOrEqual(7);

    // Check historical source
    const historical = scenarios.filter(s => s.source === "historical");
    expect(historical.length).toBeGreaterThanOrEqual(7);

    // Check that failures are captured
    const failures = scenarios.filter(s => s.actual_outcome.build_status === "FAILED");
    expect(failures.length).toBeGreaterThanOrEqual(2);

    // Check scope violation scenario
    const scopeViolations = scenarios.filter(s => s.actual_outcome.had_scope_violations);
    expect(scopeViolations.length).toBeGreaterThanOrEqual(1);

    // Check risk tags extracted from feature specs
    const withAuthTags = scenarios.filter(s => s.inputs.risk_domain_tags.includes("auth"));
    expect(withAuthTags.length).toBeGreaterThanOrEqual(1);
  });

  test("governance loop trains on real + synthetic data combined", async () => {
    const historical = await loadHistoricalScenarios(registry);
    const synthetic = generateSyntheticScenarios();
    const allScenarios = [...synthetic, ...historical];

    expect(allScenarios.length).toBeGreaterThan(synthetic.length);

    const baseline = createBaselineGovernanceConfig();
    const result = runGovernanceLoop(baseline, allScenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 50,
    });

    // Loop should run and produce results
    expect(result.total_iterations).toBeGreaterThan(0);
    expect(result.best_score).toBeGreaterThanOrEqual(result.baseline_score);

    // Frozen fields untouched
    expect(result.best_config.frozen).toEqual(baseline.frozen);

    // Score should be reasonable
    expect(result.best_score).toBeGreaterThan(0.5);
  });

  test("full artifact trail is traceable", async () => {
    // Pick a passed feature and trace its full artifact chain
    const builds = await registry.latestByType<Build>("build");
    const passedBuild = builds.find(b => b.payload.status === "PASSED");
    expect(passedBuild).toBeDefined();

    const evidence = await registry.traceEvidence(passedBuild!.payload.build_id);

    // Should have: build, bridge (via bridge_id query), diff, test_run, validator_run
    const types = new Set(evidence.map(e => e.artifact_type));
    expect(types.has("diff_artifact")).toBe(true);
    expect(types.has("test_run")).toBe(true);
    expect(types.has("validator_run")).toBe(true);
  });

  test("app-level summary scenario is generated", async () => {
    const scenarios = await loadHistoricalScenarios(registry);
    const appLevel = scenarios.filter(s => s.inputs.feature_type === "app_level");

    // Should have one app-level scenario
    expect(appLevel.length).toBeGreaterThanOrEqual(1);

    // It should reflect partial failure (5/7 passed)
    const appScenario = appLevel[0]!;
    expect(appScenario.actual_outcome.build_status).toBe("FAILED"); // not all features passed
    expect(appScenario.tags).toContain("Slack Clone");
  });
});
