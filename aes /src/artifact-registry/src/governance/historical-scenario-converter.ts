/**
 * AES Governance — Historical Scenario Converter
 *
 * Converts real build artifacts from a full end-to-end project build
 * into ReplayScenario records for governance training.
 *
 * A single "build Slack" run produces one scenario per feature build,
 * plus cross-feature scenarios for dependency ordering, orchestration
 * pauses, and integration-level outcomes.
 *
 * Input: ArtifactRegistry containing real build artifacts
 * Output: ReplayScenario[] ready for the governance training loop
 */

import type { ArtifactRegistry } from "../registry/registry";
import type {
  AppSpec,
  FeatureSpec,
} from "../types/app-spec";
import type {
  Bridge,
  Build,
  DiffArtifact,
  EscalationRecord,
  TestRun,
  ValidatorRun,
} from "../types/artifacts";
import type { StoredRecord } from "../types/common";
import type { ReplayScenario } from "../types/governance-types";

// ─── Per-Feature Scenario Extraction ─────────────────────────────────────────

/**
 * Extract a replay scenario from a single feature's build artifacts.
 */
function featureBuildToScenario(
  feature: FeatureSpec,
  bridge: Bridge,
  build: Build,
  validatorRuns: ValidatorRun[],
  diff: DiffArtifact | null,
  testRuns: TestRun[],
  escalations: EscalationRecord[],
): ReplayScenario {
  // Determine validator consensus
  let validatorOutcome: ReplayScenario["actual_outcome"]["validator_outcome"] = "PASS";
  const failCount = validatorRuns.filter(v => v.status === "FAIL").length;
  const passCount = validatorRuns.filter(v => v.status === "PASS").length;
  const concernCount = validatorRuns.filter(v => v.status === "PASS_WITH_CONCERNS").length;

  if (failCount >= 2) {
    validatorOutcome = "FAIL";
  } else if (passCount >= 2 && failCount === 1) {
    validatorOutcome = "PASS_WITH_CONCERNS";
  } else if (passCount >= 2 && concernCount === 0 && failCount === 0) {
    validatorOutcome = "PASS";
  } else if (passCount >= 1 && concernCount >= 1) {
    validatorOutcome = "PASS_WITH_CONCERNS";
  } else if (failCount >= 1) {
    validatorOutcome = "FAIL";
  } else if (validatorRuns.length === 0) {
    // No validators ran — use build status as proxy
    validatorOutcome = build.status === "PASSED" ? "PASS" : "FAIL";
  } else {
    validatorOutcome = "ESCALATE";
  }

  // Check for scope violations
  const hadScopeViolations = diff
    ? diff.path_violations.length > 0
    : false;

  // Check for test failures
  const hadTestFailures = testRuns.some(t => t.failed > 0);

  // Check for escalations
  const escalationTriggered = escalations.length > 0;

  // Check for vetoes (blocked builds have blocked_reasons)
  const vetoTriggered = build.status === "BLOCKED" && build.blocked_reasons.length > 0;

  // Build risk domain tags from feature spec
  const riskDomainTags: string[] = [];
  if (feature.auth_requirements.length > 0) riskDomainTags.push("auth");
  if (feature.destructive_actions.length > 0) riskDomainTags.push("destructive");
  if (feature.data_entities.some(d => d.operations.includes("DELETE"))) riskDomainTags.push("data");
  if (feature.integrations.some(i => i.type === "payment")) riskDomainTags.push("payments");
  if (feature.integrations.some(i => i.type === "oauth")) riskDomainTags.push("oauth");
  if (feature.events.length > 0) riskDomainTags.push("events");
  if (feature.feature_type === "notification_system") riskDomainTags.push("notifications");
  if (feature.feature_type === "collaboration_system") riskDomainTags.push("realtime");

  // Map build status
  let buildStatus: ReplayScenario["actual_outcome"]["build_status"];
  if (build.status === "PASSED") buildStatus = "PASSED";
  else if (build.status === "BLOCKED") buildStatus = "BLOCKED";
  else buildStatus = "FAILED";

  return {
    scenario_id: `HIST-${build.build_id}`,
    source: "historical",
    source_description: `Real build ${build.build_id} for feature "${feature.name}" (${feature.feature_type})`,
    inputs: {
      bridge_confidence: bridge.confidence,
      bridge_scope_size: bridge.write_scope.paths.length,
      dependency_count: bridge.depends_on_bridge_ids.length,
      has_critical_criteria: bridge.acceptance_criteria.some(c => c.mandatory),
      file_count: diff ? diff.changed_files.length : 0,
      feature_type: feature.feature_type,
      risk_domain_tags: riskDomainTags,
    },
    actual_outcome: {
      build_status: buildStatus,
      validator_outcome: validatorOutcome,
      had_scope_violations: hadScopeViolations,
      had_test_failures: hadTestFailures,
      escalation_triggered: escalationTriggered,
      veto_triggered: vetoTriggered,
      veto_codes: vetoTriggered
        ? build.blocked_reasons
            .map(r => r.code)
            .filter((c): c is any => c !== undefined)
        : undefined,
    },
    tags: [
      "historical",
      feature.feature_type,
      feature.feature_id,
      buildStatus === "PASSED" ? "success" : "failure",
      ...(hadScopeViolations ? ["scope_violation"] : []),
      ...(hadTestFailures ? ["test_failure"] : []),
      ...(escalationTriggered ? ["escalation"] : []),
      ...(vetoTriggered ? ["veto"] : []),
      ...riskDomainTags,
    ],
  };
}

// ─── Cross-Feature Scenario Extraction ───────────────────────────────────────

/**
 * Generate cross-feature scenarios that test orchestration-level governance:
 * dependency ordering, cascading failures, blocked feature chains, etc.
 */
function generateCrossFeatureScenarios(
  app: AppSpec,
  features: FeatureSpec[],
  featureBuilds: Map<string, { build: Build; bridge: Bridge }>,
): ReplayScenario[] {
  const scenarios: ReplayScenario[] = [];
  let idx = 0;
  const id = () => `HIST-CROSS-${String(++idx).padStart(4, "0")}`;

  // Dependency chain analysis
  for (const feature of features) {
    if (feature.dependencies.length === 0) continue;

    const myBuild = featureBuilds.get(feature.feature_id);
    if (!myBuild) continue;

    // Check if upstream dependencies were satisfied
    const upstreamResults: Array<{ id: string; passed: boolean }> = [];
    for (const depId of feature.dependencies) {
      const depBuild = featureBuilds.get(depId);
      upstreamResults.push({
        id: depId,
        passed: depBuild ? depBuild.build.status === "PASSED" : false,
      });
    }

    const anyUpstreamFailed = upstreamResults.some(r => !r.passed);

    // Scenario: did governance correctly handle the dependency chain?
    if (anyUpstreamFailed && myBuild.build.status === "PASSED") {
      // Downstream passed despite upstream failure — governance missed it
      scenarios.push({
        scenario_id: id(),
        source: "historical",
        source_description: `Dependency violation: "${feature.name}" passed but upstream dependency failed`,
        inputs: {
          bridge_confidence: myBuild.bridge.confidence,
          bridge_scope_size: myBuild.bridge.write_scope.paths.length,
          dependency_count: feature.dependencies.length,
          has_critical_criteria: myBuild.bridge.acceptance_criteria.some(c => c.mandatory),
          file_count: myBuild.bridge.write_scope.paths.length,
          feature_type: feature.feature_type,
          risk_domain_tags: ["dependency_violation"],
        },
        actual_outcome: {
          build_status: "PASSED",
          validator_outcome: "PASS",
          had_scope_violations: false,
          had_test_failures: false,
          escalation_triggered: false,
          veto_triggered: false,
        },
        tags: ["historical", "cross_feature", "dependency_violation", "should_block"],
      });
    }

    if (anyUpstreamFailed && myBuild.build.status === "BLOCKED") {
      // Correctly blocked due to upstream failure
      scenarios.push({
        scenario_id: id(),
        source: "historical",
        source_description: `Correct dependency block: "${feature.name}" blocked because upstream failed`,
        inputs: {
          bridge_confidence: myBuild.bridge.confidence,
          bridge_scope_size: myBuild.bridge.write_scope.paths.length,
          dependency_count: feature.dependencies.length,
          has_critical_criteria: myBuild.bridge.acceptance_criteria.some(c => c.mandatory),
          file_count: myBuild.bridge.write_scope.paths.length,
          feature_type: feature.feature_type,
          risk_domain_tags: ["dependency"],
        },
        actual_outcome: {
          build_status: "BLOCKED",
          validator_outcome: "FAIL",
          had_scope_violations: false,
          had_test_failures: false,
          escalation_triggered: false,
          veto_triggered: true,
          veto_codes: ["DEPENDENCY_NOT_SATISFIED"],
        },
        tags: ["historical", "cross_feature", "correct_block", "dependency"],
      });
    }
  }

  // Overall app-level scenario
  const totalFeatures = features.length;
  const passedFeatures = features.filter(f => {
    const b = featureBuilds.get(f.feature_id);
    return b && b.build.status === "PASSED";
  }).length;
  const failedFeatures = totalFeatures - passedFeatures;

  if (totalFeatures > 0) {
    scenarios.push({
      scenario_id: id(),
      source: "historical",
      source_description: `App-level: "${app.name}" — ${passedFeatures}/${totalFeatures} features passed`,
      inputs: {
        bridge_confidence: app.confidence_summary.overall,
        bridge_scope_size: totalFeatures * 5, // approximate
        dependency_count: features.reduce((sum, f) => sum + f.dependencies.length, 0),
        has_critical_criteria: true,
        file_count: totalFeatures * 5, // approximate
        feature_type: "app_level",
        risk_domain_tags: ["full_app", app.product_type],
      },
      actual_outcome: {
        build_status: failedFeatures === 0 ? "PASSED" : "FAILED",
        validator_outcome: failedFeatures === 0 ? "PASS" : failedFeatures > totalFeatures / 2 ? "FAIL" : "PASS_WITH_CONCERNS",
        had_scope_violations: false,
        had_test_failures: failedFeatures > 0,
        escalation_triggered: failedFeatures > 0,
        veto_triggered: false,
      },
      tags: ["historical", "app_level", app.name, failedFeatures === 0 ? "success" : "partial_failure"],
    });
  }

  return scenarios;
}

// ─── Main Converter ──────────────────────────────────────────────────────────

/**
 * Load all historical scenarios from the artifact registry.
 *
 * Scans for all completed builds, resolves their associated artifacts,
 * and converts each into a ReplayScenario. Also generates cross-feature
 * scenarios for dependency and orchestration testing.
 */
export async function loadHistoricalScenarios(
  registry: ArtifactRegistry,
): Promise<ReplayScenario[]> {
  const scenarios: ReplayScenario[] = [];

  // Load all builds
  const buildRecords = await registry.latestByType<Build>("build");

  // Group builds by feature
  const featureBuilds = new Map<string, { build: Build; bridge: Bridge }>();

  for (const buildRecord of buildRecords) {
    const build = buildRecord.payload;

    // Only process terminal builds
    if (!["PASSED", "FAILED", "BLOCKED"].includes(build.status)) continue;

    // Load associated artifacts
    let bridge: Bridge | null = null;
    let diff: DiffArtifact | null = null;
    const validatorRuns: ValidatorRun[] = [];
    const testRuns: TestRun[] = [];
    const escalations: EscalationRecord[] = [];

    try {
      // Get bridge
      const bridgeRecord = await registry.read<Bridge>("bridge", build.bridge_id);
      bridge = bridgeRecord.payload;

      // Get all artifacts for this build
      const buildArtifacts = await registry.byBuild(build.build_id);

      for (const artifact of buildArtifacts) {
        switch (artifact.artifact_type) {
          case "diff_artifact":
            diff = artifact.payload as DiffArtifact;
            break;
          case "validator_run":
            validatorRuns.push(artifact.payload as ValidatorRun);
            break;
          case "test_run":
            testRuns.push(artifact.payload as TestRun);
            break;
          case "escalation_record":
            escalations.push(artifact.payload as EscalationRecord);
            break;
        }
      }
    } catch {
      // If we can't resolve artifacts, skip this build
      continue;
    }

    if (!bridge) continue;

    // Try to load the feature spec
    let feature: FeatureSpec | null = null;
    try {
      const featureRecord = await registry.read<FeatureSpec>("feature_spec", build.feature_id);
      feature = featureRecord.payload;
    } catch {
      // No feature spec — create a minimal scenario from build data alone
      feature = createMinimalFeatureSpec(build, bridge);
    }

    // Convert to scenario
    const scenario = featureBuildToScenario(
      feature,
      bridge,
      build,
      validatorRuns,
      diff,
      testRuns,
      escalations,
    );
    scenarios.push(scenario);

    // Track for cross-feature analysis
    featureBuilds.set(build.feature_id, { build, bridge });
  }

  // Generate cross-feature scenarios if we have app specs
  const appRecords = await registry.latestByType<AppSpec>("app_spec");
  for (const appRecord of appRecords) {
    const app = appRecord.payload;
    const appFeatures: FeatureSpec[] = [];

    for (const featureId of app.feature_ids) {
      try {
        const featureRecord = await registry.read<FeatureSpec>("feature_spec", featureId);
        appFeatures.push(featureRecord.payload);
      } catch {
        // Skip missing features
      }
    }

    if (appFeatures.length > 0) {
      const crossScenarios = generateCrossFeatureScenarios(app, appFeatures, featureBuilds);
      scenarios.push(...crossScenarios);
    }
  }

  return scenarios;
}

/**
 * Load scenarios for a specific app build only.
 */
export async function loadAppScenarios(
  registry: ArtifactRegistry,
  appId: string,
): Promise<ReplayScenario[]> {
  // Load the app spec
  const appRecord = await registry.read<AppSpec>("app_spec", appId);
  const app = appRecord.payload;

  const scenarios: ReplayScenario[] = [];
  const featureBuilds = new Map<string, { build: Build; bridge: Bridge }>();
  const appFeatures: FeatureSpec[] = [];

  for (const featureId of app.feature_ids) {
    let feature: FeatureSpec;
    try {
      const featureRecord = await registry.read<FeatureSpec>("feature_spec", featureId);
      feature = featureRecord.payload;
    } catch {
      continue;
    }
    appFeatures.push(feature);

    // Find builds for this feature
    const featureArtifacts = await registry.byFeature(featureId);
    const buildRecords = featureArtifacts.filter(r => r.artifact_type === "build") as StoredRecord<Build>[];

    for (const buildRecord of buildRecords) {
      const build = buildRecord.payload;
      if (!["PASSED", "FAILED", "BLOCKED"].includes(build.status)) continue;

      let bridge: Bridge | null = null;
      let diff: DiffArtifact | null = null;
      const validatorRuns: ValidatorRun[] = [];
      const testRuns: TestRun[] = [];
      const escalations: EscalationRecord[] = [];

      try {
        const bridgeRecord = await registry.read<Bridge>("bridge", build.bridge_id);
        bridge = bridgeRecord.payload;

        const buildArtifacts = await registry.byBuild(build.build_id);
        for (const artifact of buildArtifacts) {
          switch (artifact.artifact_type) {
            case "diff_artifact":
              diff = artifact.payload as DiffArtifact;
              break;
            case "validator_run":
              validatorRuns.push(artifact.payload as ValidatorRun);
              break;
            case "test_run":
              testRuns.push(artifact.payload as TestRun);
              break;
            case "escalation_record":
              escalations.push(artifact.payload as EscalationRecord);
              break;
          }
        }
      } catch {
        continue;
      }

      if (!bridge) continue;

      const scenario = featureBuildToScenario(
        feature,
        bridge,
        build,
        validatorRuns,
        diff,
        testRuns,
        escalations,
      );
      scenarios.push(scenario);
      featureBuilds.set(featureId, { build, bridge });
    }
  }

  // Cross-feature scenarios
  if (appFeatures.length > 0) {
    const crossScenarios = generateCrossFeatureScenarios(app, appFeatures, featureBuilds);
    scenarios.push(...crossScenarios);
  }

  return scenarios;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Create a minimal feature spec from build/bridge data when no
 * FeatureSpec artifact exists in the registry.
 */
function createMinimalFeatureSpec(build: Build, bridge: Bridge): FeatureSpec {
  return {
    feature_id: build.feature_id,
    app_id: "",
    name: build.feature_id,
    description: bridge.intent,
    feature_type: "unknown",
    donor_mappings: [],
    dependencies: bridge.depends_on_bridge_ids.map(() => "unknown"),
    user_roles: [],
    backend_surfaces: [],
    frontend_surfaces: [],
    auth_requirements: [],
    data_entities: [],
    events: bridge.events ?? [],
    integrations: [],
    failure_states: [],
    destructive_actions: [],
    acceptance_criteria: bridge.acceptance_criteria,
    test_cases: bridge.test_cases,
    missing_questions: [],
    evidence_summary: { sources: [], research_note_ids: [], total_evidence_count: 0 },
    confidence_summary: {
      decomposition_confidence: bridge.confidence,
      research_coverage: 0,
      verification_score: 0,
      overall: bridge.confidence,
    },
    promotion_status: "DRAFT",
    created_at: build.queued_at,
    updated_at: build.ended_at ?? build.queued_at,
  };
}
