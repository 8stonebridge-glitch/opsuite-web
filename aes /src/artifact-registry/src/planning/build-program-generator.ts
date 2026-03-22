/**
 * AES Planning — Build Program Generator
 *
 * Transforms FeatureSpec[] into BuildProgramInput — the exact shape
 * consumed by runBuildProgramWorkflow() in builder-launch.ts.
 *
 * This is the bridge between the front half (planning) and the back half (execution).
 * Zero changes to the back half are required.
 */

import type {
  BuildProgramFeatureInput,
  BuildProgramInput,
} from "../bootstrap/builder-launch";
import type { AppSpec, FeatureSpec } from "../types/app-spec";
import type {
  ApiContract,
  ConfidenceBreakdown,
  DbTouch,
} from "../types/common";
import { computeDependencyOrder } from "./promotion-engine";

// ─── Input ─────────────────────────────────────────────────────────────────────

export interface GenerateBuildProgramInput {
  app: AppSpec;
  features: FeatureSpec[];
  requested_by: string;
  builder_timeout_ms?: number;
  stop_on_failure?: boolean;
}

// ─── Generator ─────────────────────────────────────────────────────────────────

/**
 * Converts promoted FeatureSpec[] into a BuildProgramInput
 * ready for runBuildProgramWorkflow().
 */
export function generateBuildProgram(
  input: GenerateBuildProgramInput,
): BuildProgramInput {
  const { app, features, requested_by } = input;

  // Order features by dependency
  const { order } = computeDependencyOrder(features);
  const featureMap = new Map(features.map((f) => [f.feature_id, f]));

  // Build features in dependency order
  const orderedFeatures: BuildProgramFeatureInput[] = order.map((featureId) => {
    const f = featureMap.get(featureId);
    if (!f) {
      throw new Error(
        `Feature ${featureId} in dependency order but not in features list`,
      );
    }
    return featureSpecToBuildInput(f);
  });

  // Add any features not in dependency order (isolated features)
  for (const f of features) {
    if (!order.includes(f.feature_id)) {
      orderedFeatures.push(featureSpecToBuildInput(f));
    }
  }

  return {
    app_id: app.app_id,
    requested_by,
    builder_timeout_ms: input.builder_timeout_ms,
    stop_on_failure: input.stop_on_failure ?? true,
    features: orderedFeatures,
  };
}

// ─── Feature Mapping ───────────────────────────────────────────────────────────

function featureSpecToBuildInput(f: FeatureSpec): BuildProgramFeatureInput {
  // Derive scope paths from surfaces
  const writePaths = [
    ...f.backend_surfaces.map((s) => `src/${slugify(s.name)}/**`),
    ...f.frontend_surfaces.map((s) => `src/${slugify(s.name)}/**`),
  ];
  const readPaths = ["src/**", "package.json", "tsconfig.json", ...writePaths];

  // Derive risk domain tags
  const riskTags: string[] = [];
  if (f.auth_requirements.length > 0) riskTags.push("auth");
  if (f.destructive_actions.length > 0) riskTags.push("destructive");
  if (f.integrations.some((i) => i.type === "payment")) riskTags.push("billing");
  if (f.data_entities.length > 0) riskTags.push("data");

  // Map constraints from mandatory acceptance criteria
  const constraints = f.acceptance_criteria
    .filter((c) => c.mandatory)
    .map((c) => c.description);

  // Map API contracts from backend surfaces
  const apiContracts: ApiContract[] = f.backend_surfaces
    .filter((s) => s.type === "api_endpoint")
    .map((s) => ({
      name: s.name,
      method: "POST",
      path: `/${slugify(s.name)}`,
    }));

  // Map DB touches from data entities (DataEntity uses CREATE, DbTouch uses INSERT)
  const dbTouches: DbTouch[] = f.data_entities.map((e) => ({
    table: slugify(e.name),
    operations: e.operations.map((op) =>
      op === "CREATE" ? "INSERT" as const : op,
    ),
  }));

  // Map confidence
  const confidence: ConfidenceBreakdown = {
    graph_coverage: f.confidence_summary.research_coverage,
    pattern_strength: f.confidence_summary.decomposition_confidence,
    rule_consistency: f.confidence_summary.verification_score,
    evidence_level: f.confidence_summary.overall,
  };

  return {
    feature_id: f.feature_id,
    intent: `${f.name}: ${f.description}`,
    risk_domain_tags: riskTags,
    depends_on_feature_ids:
      f.dependencies.length > 0 ? f.dependencies : undefined,
    prepare: {
      scope: { paths: writePaths, description: f.description },
      read_scope: { paths: readPaths },
      write_scope: { paths: writePaths },
      constraints,
      patterns: f.donor_mappings.map(
        (d) => `${d.donor_name}/${d.donor_feature} (${d.relevance})`,
      ),
      anti_patterns: [],
      api_contracts: apiContracts,
      events: f.events,
      db_touches: dbTouches,
      acceptance_criteria: f.acceptance_criteria,
      test_cases: f.test_cases,
      confidence_breakdown: confidence,
      dependency_type: f.dependencies.length > 0 ? "HARD" : "NONE",
    },
    run_validators: true,
  };
}

function slugify(source: string): string {
  return source
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
