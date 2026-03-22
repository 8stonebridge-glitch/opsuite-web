/**
 * AES V1 Agents — Full Test Suite
 *
 * Tests all V1 agents: observers, retrievers, arbiters, and strategy.
 */

import { ArtifactRegistry } from "../src/registry/registry";
import { InMemoryStorage } from "../src/registry/storage";
import { BuildStrategySelector } from "../src/strategy/build-strategy-selector";
import { RetryBriefGenerator } from "../src/strategy/retry-brief-generator";
import { FailureMetricsObserver } from "../src/agents/failure-metrics-observer";
import { ApiIntegrationObserver } from "../src/agents/api-integration-observer";
import { UiSurfaceObserver } from "../src/agents/ui-surface-observer";
import { CompletenessArbiter } from "../src/agents/completeness-arbiter";
import { ContradictionArbiter } from "../src/agents/contradiction-arbiter";
import { ContextDependencyRetriever } from "../src/retrieval/context-dependency-retriever";
import { TemporalChangeRetriever } from "../src/retrieval/temporal-change-retriever";
import { ConflictAntiPatternRetriever } from "../src/retrieval/conflict-antipattern-retriever";
import type { FeatureSpec, AppSpec } from "../src/types/app-spec";
import type { Build } from "../src/types/artifacts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRegistry(): ArtifactRegistry {
  return new ArtifactRegistry(new InMemoryStorage());
}

function makeFeature(input: Record<string, unknown> & { feature_id: string }): FeatureSpec {
  return {
    feature_id: input.feature_id,
    app_id: (input.app_id as string) || "APP-TEST",
    name: (input.name as string) || input.feature_id,
    description: (input.description as string) || (input.intent as string) || "Test feature",
    feature_type: (input.feature_type as string) || "backend_platform",
    donor_mappings: (input.donor_mappings as []) || [],
    dependencies: (input.depends_on_feature_ids as string[]) || [],
    user_roles: [],
    backend_surfaces: input.backend_surface ? [input.backend_surface] : (input.backend_surfaces as []) || [],
    frontend_surfaces: input.frontend_surface ? [input.frontend_surface] : (input.frontend_surfaces as []) || [],
    auth_requirements: [],
    data_entities: [],
    events: [],
    integrations: [],
    failure_states: [],
    destructive_actions: [],
    acceptance_criteria: (input.acceptance_criteria as []) || [],
    test_cases: (input.test_cases as []) || [],
    missing_questions: [],
    evidence_summary: { total_evidence_items: 0, untrusted: 0, verified: 0, canonical: 0, coverage_gaps: [] } as any,
    confidence_summary: { overall: 0.5, breakdown: {} } as any,
    promotion_status: "CANDIDATE" as any,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    // Extra fields agents may access (via any cast in agents)
    intent: (input.intent as string) || "Test feature",
    risk_domain_tags: (input.risk_domain_tags as string[]) || [],
    depends_on_feature_ids: (input.depends_on_feature_ids as string[]) || [],
    constraints: (input.constraints as string[]) || [],
    anti_patterns: (input.anti_patterns as string[]) || [],
  } as unknown as FeatureSpec;
}

function makeApp(input?: Record<string, unknown>): AppSpec {
  return {
    app_id: (input?.app_id as string) || "APP-TEST",
    name: (input?.name as string) || "Test App",
    summary: (input?.summary as string) || "A test app",
    product_type: "saas",
    target_users: [],
    roles: [],
    core_jobs_to_be_done: [],
    global_constraints: [],
    shared_backend_surfaces: [],
    shared_frontend_surfaces: [],
    feature_ids: (input?.feature_ids as string[]) || [],
    promotion_status: "CANDIDATE" as any,
    evidence_summary: { total_evidence_items: 0, untrusted: 0, verified: 0, canonical: 0, coverage_gaps: [] } as any,
    confidence_summary: { overall: 0.5, breakdown: {} } as any,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as AppSpec;
}

// ─── Build Strategy Selector ─────────────────────────────────────────────────

describe("BuildStrategySelector", () => {
  let selector: BuildStrategySelector;

  beforeEach(() => {
    selector = new BuildStrategySelector(makeRegistry());
  });

  test("low risk + good history → ONE_PASS", () => {
    const result = selector.select({
      feature_id: "FEAT-1", feature_type: "backend_platform", risk: "low",
      acceptance_criteria_count: 5, has_donor_coverage: true, has_research_evidence: false,
      domain_tags: [], historical_success_rate: 0.85, risk_success_rate: 0.80,
      prior_build_count: 10,
    });
    expect(result.strategy).toBe("ONE_PASS");
    expect(result.requires_skeleton).toBe(false);
  });

  test("high risk → at least TWO_PASS", () => {
    const result = selector.select({
      feature_id: "FEAT-2", feature_type: "backend_platform", risk: "high",
      acceptance_criteria_count: 5, has_donor_coverage: true, has_research_evidence: true,
      domain_tags: [], historical_success_rate: 0.85, risk_success_rate: 0.80,
      prior_build_count: 10,
    });
    expect(["TWO_PASS", "SKELETON"]).toContain(result.strategy);
    expect(result.requires_two_pass).toBe(true);
  });

  test("low success rate → SKELETON", () => {
    const result = selector.select({
      feature_id: "FEAT-3", feature_type: "async_queue", risk: "high",
      acceptance_criteria_count: 7, has_donor_coverage: false, has_research_evidence: false,
      domain_tags: [], historical_success_rate: 0.40, risk_success_rate: 0.40,
      prior_build_count: 5,
    });
    expect(result.strategy).toBe("SKELETON");
    expect(result.requires_skeleton).toBe(true);
  });

  test("billing domain → ESCALATE", () => {
    const result = selector.select({
      feature_id: "FEAT-4", feature_type: "backend_platform", risk: "high",
      acceptance_criteria_count: 5, has_donor_coverage: true, has_research_evidence: true,
      domain_tags: ["billing"], historical_success_rate: 0.90, risk_success_rate: 0.90,
      prior_build_count: 10,
    });
    expect(result.strategy).toBe("ESCALATE");
    expect(result.requires_human_review).toBe(true);
  });

  test("critical risk → ESCALATE", () => {
    const result = selector.select({
      feature_id: "FEAT-5", feature_type: "backend_platform", risk: "critical",
      acceptance_criteria_count: 3, has_donor_coverage: true, has_research_evidence: true,
      domain_tags: [], historical_success_rate: 0.95, risk_success_rate: 0.95,
      prior_build_count: 20,
    });
    expect(result.strategy).toBe("ESCALATE");
  });

  test("no evidence → recommends research", () => {
    const result = selector.select({
      feature_id: "FEAT-6", feature_type: "unknown", risk: "medium",
      acceptance_criteria_count: 4, has_donor_coverage: false, has_research_evidence: false,
      domain_tags: [], historical_success_rate: null, risk_success_rate: null,
      prior_build_count: 0,
    });
    expect(result.requires_research).toBe(true);
    expect(result.strategy).not.toBe("ONE_PASS");
  });

  test("complex criteria → TWO_PASS", () => {
    const result = selector.select({
      feature_id: "FEAT-7", feature_type: "backend_platform", risk: "low",
      acceptance_criteria_count: 12, has_donor_coverage: true, has_research_evidence: true,
      domain_tags: [], historical_success_rate: 0.90, risk_success_rate: 0.90,
      prior_build_count: 10,
    });
    expect(result.strategy).toBe("TWO_PASS");
  });
});

// ─── Retry Brief Generator ──────────────────────────────────────────────────

describe("RetryBriefGenerator", () => {
  let generator: RetryBriefGenerator;

  beforeEach(() => {
    generator = new RetryBriefGenerator(makeRegistry());
  });

  test("classifies TypeScript errors", () => {
    const brief = generator.generate({
      build_id: "BLD-1", bridge_id: "BRG-1", feature_id: "FEAT-1", attempt_number: 1,
      error_output: "error TS2304: Cannot find name 'processNext'.\nerror TS7006: Parameter 'x' implicitly has an 'any' type.",
    });
    expect(brief.failure_type).toBe("TYPE_ERROR");
    expect(brief.specific_errors.length).toBe(2);
    expect(brief.mitigations.length).toBeGreaterThan(0);
  });

  test("classifies import mismatches", () => {
    const brief = generator.generate({
      build_id: "BLD-2", bridge_id: "BRG-2", feature_id: "FEAT-2", attempt_number: 1,
      error_output: "Cannot find module '../src/todo-service' or its corresponding type declarations",
    });
    expect(brief.failure_type).toBe("IMPORT_MISMATCH");
  });

  test("classifies runtime errors", () => {
    const brief = generator.generate({
      build_id: "BLD-3", bridge_id: "BRG-3", feature_id: "FEAT-3", attempt_number: 1,
      error_output: "TypeError: processNext is not a function",
    });
    expect(brief.failure_type).toBe("RUNTIME_ERROR");
  });

  test("recommends strategy change after 2+ failures", () => {
    const brief = generator.generate({
      build_id: "BLD-4", bridge_id: "BRG-4", feature_id: "FEAT-4", attempt_number: 2,
      error_output: "error TS2304: Cannot find name 'enqueue'.",
    });
    expect(brief.strategy_change).not.toBeNull();
    expect(brief.strategy_change!.to).toBe("SKELETON");
  });

  test("recommends ESCALATE after 3+ failures", () => {
    const brief = generator.generate({
      build_id: "BLD-5", bridge_id: "BRG-5", feature_id: "FEAT-5", attempt_number: 3,
      error_output: "Unknown error",
    });
    expect(brief.strategy_change).not.toBeNull();
    expect(brief.strategy_change!.to).toBe("ESCALATE");
  });

  test("formatForPrompt produces readable output", () => {
    const brief = generator.generate({
      build_id: "BLD-6", bridge_id: "BRG-6", feature_id: "FEAT-6", attempt_number: 1,
      error_output: "error TS2304: Cannot find name 'createTodo'.",
    });
    const prompt = generator.formatForPrompt(brief);
    expect(prompt).toContain("PREVIOUS BUILD FAILED");
    expect(prompt).toContain("SPECIFIC ERRORS TO FIX");
    expect(prompt).toContain("MITIGATIONS");
  });
});

// ─── Failure Metrics Observer ────────────────────────────────────────────────

describe("FailureMetricsObserver", () => {
  test("observes build history and generates recommendations", async () => {
    const registry = makeRegistry();

    // Seed some builds
    for (let i = 0; i < 5; i++) {
      await registry.write("build", {
        build_id: `BLD-${i}`, bridge_id: `BRG-${i}`, feature_id: `FEAT-TODO-${i}`,
        status: i < 4 ? "PASSED" : "FAILED", blocked_reasons: [],
        queued_at: new Date().toISOString(), authorized_at: new Date().toISOString(),
        started_at: new Date().toISOString(), ended_at: new Date().toISOString(),
        builder_session_id: `session-${i}`,
        artifact_refs: [{ artifact_type: "bridge", artifact_id: `BRG-${i}`, role: "constraint_source" }],
      } as Build);
    }

    const observer = new FailureMetricsObserver(registry);
    const observation = await observer.observe();

    expect(observation.total_builds).toBe(5);
    expect(observation.passed_builds).toBe(4);
    expect(observation.failed_builds).toBe(1);
    expect(observation.success_rate).toBe(0.8);
    expect(observation.status).toBe("UNTRUSTED");
  });
});

// ─── API Integration Observer ────────────────────────────────────────────────

describe("ApiIntegrationObserver", () => {
  test("detects auth integration", () => {
    const registry = makeRegistry();
    const observer = new ApiIntegrationObserver(registry);
    const feature = makeFeature({
      feature_id: "FEAT-AUTH",
      intent: "Build user authentication with login and session management",
      risk_domain_tags: ["auth"],
    });

    const observation = observer.observe(feature);
    expect(observation.integrations.some(i => i.type === "auth")).toBe(true);
  });

  test("detects payment integration", () => {
    const registry = makeRegistry();
    const observer = new ApiIntegrationObserver(registry);
    const feature = makeFeature({
      feature_id: "FEAT-BILLING",
      intent: "Build subscription billing with Stripe payment processing",
      risk_domain_tags: ["billing"],
    });

    const observation = observer.observe(feature);
    expect(observation.integrations.some(i => i.type === "payments")).toBe(true);
    expect(observation.external_apis.some(a => a.name === "Stripe API")).toBe(true);
  });

  test("detects data dependencies", () => {
    const registry = makeRegistry();
    const observer = new ApiIntegrationObserver(registry);
    const feature = makeFeature({
      feature_id: "FEAT-PROFILE",
      intent: "Build user profile page with protected data",
      depends_on_feature_ids: ["FEAT-AUTH"],
    });

    const observation = observer.observe(feature);
    expect(observation.data_dependencies.length).toBeGreaterThan(0);
  });
});

// ─── UI Surface Observer ─────────────────────────────────────────────────────

describe("UiSurfaceObserver", () => {
  test("infers screens from intent", () => {
    const registry = makeRegistry();
    const observer = new UiSurfaceObserver(registry);
    const feature = makeFeature({
      feature_id: "FEAT-DASHBOARD",
      intent: "Build a dashboard with list view and detail editing",
    });

    const observation = observer.observe(feature);
    expect(observation.screens.length).toBeGreaterThan(0);
    expect(observation.states.length).toBeGreaterThan(0);
    expect(observation.journeys.length).toBeGreaterThan(0);
  });

  test("uses Perplexity research when available", () => {
    const registry = makeRegistry();
    const observer = new UiSurfaceObserver(registry);
    const feature = makeFeature({
      feature_id: "FEAT-MESSAGING",
      name: "Messaging",
      intent: "Real-time messaging in channels",
    });

    const researchPatterns = {
      common_screens: [
        { screen_name: "Messaging", purpose: "Send and receive messages", common_sections: ["message list", "composer"], typical_actions: ["Send message", "Add reaction", "Delete message"] },
        { screen_name: "Settings", purpose: "User preferences", common_sections: ["profile", "notifications"], typical_actions: ["Save settings"] },
      ],
      navigation_patterns: ["Left sidebar primary nav"],
      action_placement: ["Compose at bottom"],
      dashboard_layouts: [],
      onboarding_flows: [{ step_number: 1, screen_name: "Welcome", what_user_does: "Create account", why_it_matters: "Activation" }],
      empty_loading_error_states: [
        { state_type: "empty" as const, screen: "Messaging", what_to_show: "Start a conversation", what_not_to_do: "Show blank screen" },
        { state_type: "loading" as const, screen: "Messaging", what_to_show: "Skeleton messages", what_not_to_do: "Show spinner" },
      ],
      notification_ux: ["Badge counts on channels"],
      information_hierarchy: ["Channel > Messages > Threads"],
      visual_direction: ["Dense information display"],
    };

    const observation = observer.observe(feature, "APP-TEST", researchPatterns);

    // Should use research screens, not inference
    expect(observation.source_type).toBe("research_backed");
    expect(observation.confidence).toBe(0.85);
    expect(observation.screens.length).toBeGreaterThan(0);
    expect(observation.screens[0]!.name).toBe("Messaging");
    expect(observation.screens[0]!.actions.length).toBe(3);

    // Should have research-backed states
    const stateDescs = observation.states.map(s => s.description);
    expect(stateDescs.some(d => d.includes("Start a conversation"))).toBe(true);

    // Should have onboarding state
    expect(observation.states.some(s => s.screen_id === "onboarding")).toBe(true);
  });

  test("generates empty/loading/error states for each screen", () => {
    const registry = makeRegistry();
    const observer = new UiSurfaceObserver(registry);
    const feature = makeFeature({
      feature_id: "FEAT-LIST",
      intent: "Build a list view with create functionality",
    });

    const observation = observer.observe(feature);
    const stateTypes = observation.states.map(s => s.state_type);
    expect(stateTypes).toContain("loading");
    expect(stateTypes).toContain("empty");
    expect(stateTypes).toContain("error");
  });
});

// ─── Completeness Arbiter ────────────────────────────────────────────────────

describe("CompletenessArbiter", () => {
  test("detects missing critical flows", () => {
    const registry = makeRegistry();
    const arbiter = new CompletenessArbiter(registry);
    const app = makeApp({ app_id: "APP-1" });

    // Features without auth
    const features = [
      makeFeature({ feature_id: "FEAT-1", intent: "Build a dashboard" }),
      makeFeature({ feature_id: "FEAT-2", intent: "Build a profile page" }),
    ];

    const result = arbiter.evaluate(app, features);
    expect(result.missing_flows.some(f => f.flow_name === "user_authentication")).toBe(true);
    expect(result.completeness_score).toBeLessThan(1.0);
  });

  test("passes when all critical flows present", () => {
    const registry = makeRegistry();
    const arbiter = new CompletenessArbiter(registry);
    const app = makeApp({ app_id: "APP-2" });

    const features = [
      makeFeature({ feature_id: "FEAT-AUTH", intent: "User authentication with login and register" }),
      makeFeature({ feature_id: "FEAT-NAV", intent: "Navigation sidebar with routing" }),
      makeFeature({ feature_id: "FEAT-DASH", intent: "Dashboard with error boundary" }),
      makeFeature({ feature_id: "FEAT-SETTINGS", intent: "User settings and preferences" }),
      makeFeature({ feature_id: "FEAT-ONBOARD", intent: "Onboarding and welcome flow" }),
      makeFeature({ feature_id: "FEAT-NOTIF", intent: "Notification alerts and toasts" }),
      makeFeature({ feature_id: "FEAT-SEARCH", intent: "Search and filter functionality" }),
      makeFeature({ feature_id: "FEAT-LOADING", intent: "Data loading with skeleton screens" }),
    ];

    const result = arbiter.evaluate(app, features);
    expect(result.missing_flows.filter(f => f.severity === "critical").length).toBe(0);
    expect(result.completeness_score).toBeGreaterThan(0.7);
  });
});

// ─── Contradiction Arbiter ───────────────────────────────────────────────────

describe("ContradictionArbiter", () => {
  test("detects dependency cycles", () => {
    const registry = makeRegistry();
    const arbiter = new ContradictionArbiter(registry);
    const app = makeApp({ app_id: "APP-3" });

    const features = [
      makeFeature({ feature_id: "FEAT-A", depends_on_feature_ids: ["FEAT-B"] }),
      makeFeature({ feature_id: "FEAT-B", depends_on_feature_ids: ["FEAT-A"] }),
    ];

    const result = arbiter.evaluate(app, features);
    expect(result.passes_gate).toBe(false);
    expect(result.hard_vetoes.some(v => v.veto_code === "DEPENDENCY_CYCLE")).toBe(true);
  });

  test("detects missing auth dependencies", () => {
    const registry = makeRegistry();
    const arbiter = new ContradictionArbiter(registry);
    const app = makeApp({ app_id: "APP-4" });

    const features = [
      makeFeature({ feature_id: "FEAT-AUTH", risk_domain_tags: ["auth"], intent: "Auth system" }),
      makeFeature({ feature_id: "FEAT-PROFILE", intent: "User profile page", depends_on_feature_ids: [] }),
    ];

    const result = arbiter.evaluate(app, features);
    expect(result.auth_analysis.features_missing_auth_dependency.length).toBeGreaterThan(0);
  });

  test("passes clean feature set", () => {
    const registry = makeRegistry();
    const arbiter = new ContradictionArbiter(registry);
    const app = makeApp({ app_id: "APP-5" });

    const features = [
      makeFeature({ feature_id: "FEAT-AUTH", risk_domain_tags: ["auth"], intent: "Auth system" }),
      makeFeature({ feature_id: "FEAT-DASH", intent: "Dashboard view", depends_on_feature_ids: ["FEAT-AUTH"] }),
    ];

    const result = arbiter.evaluate(app, features);
    expect(result.dependency_analysis.has_cycles).toBe(false);
  });
});

// ─── Context Dependency Retriever ────────────────────────────────────────────

describe("ContextDependencyRetriever", () => {
  test("finds upstream and downstream dependencies", async () => {
    const registry = makeRegistry();
    const retriever = new ContextDependencyRetriever(registry);

    const features = [
      makeFeature({ feature_id: "FEAT-A" }),
      makeFeature({ feature_id: "FEAT-B", depends_on_feature_ids: ["FEAT-A"] }),
      makeFeature({ feature_id: "FEAT-C", depends_on_feature_ids: ["FEAT-B"] }),
    ];

    const context = await retriever.retrieve(features[1]!, features);
    expect(context.upstream.length).toBe(1);
    expect(context.upstream[0]!.feature_id).toBe("FEAT-A");
    expect(context.downstream.length).toBe(1);
    expect(context.downstream[0]!.feature_id).toBe("FEAT-C");
  });

  test("reports unsatisfied upstream as blockers", async () => {
    const registry = makeRegistry();
    const retriever = new ContextDependencyRetriever(registry);

    const features = [
      makeFeature({ feature_id: "FEAT-A" }),
      makeFeature({ feature_id: "FEAT-B", depends_on_feature_ids: ["FEAT-A"] }),
    ];

    const context = await retriever.retrieve(features[1]!, features);
    expect(context.all_upstream_satisfied).toBe(false);
    expect(context.blockers.length).toBeGreaterThan(0);
  });
});

// ─── Temporal Change Retriever ───────────────────────────────────────────────

describe("TemporalChangeRetriever", () => {
  test("retrieves build history for a feature", async () => {
    const registry = makeRegistry();

    await registry.write("build", {
      build_id: "BLD-1", bridge_id: "BRG-1", feature_id: "FEAT-X",
      status: "PASSED", blocked_reasons: [], queued_at: new Date().toISOString(),
      authorized_at: new Date().toISOString(), builder_session_id: "session-1",
      started_at: new Date().toISOString(), ended_at: new Date().toISOString(),
      artifact_refs: [{ artifact_type: "bridge", artifact_id: "BRG-1", role: "constraint_source" }],
    } as Build);

    const retriever = new TemporalChangeRetriever(registry);
    const context = await retriever.retrieve("FEAT-X");

    expect(context.build_history.length).toBe(1);
    expect(context.build_history[0]!.status).toBe("PASSED");
  });
});

// ─── Conflict Anti-Pattern Retriever ─────────────────────────────────────────

describe("ConflictAntiPatternRetriever", () => {
  test("detects anti-patterns", async () => {
    const registry = makeRegistry();
    const retriever = new ConflictAntiPatternRetriever(registry);

    const feature = makeFeature({
      feature_id: "FEAT-RISKY",
      intent: "Build async job queue",
      acceptance_criteria: [
        { id: "ac-1", description: "Process jobs", type: "functional", mandatory: true },
      ],
    });

    const analysis = await retriever.retrieve(feature, [feature]);
    // Should detect no_error_handling anti-pattern
    expect(analysis.anti_patterns.some(a => a.pattern_name === "no_error_handling")).toBe(true);
  });

  test("detects circular dependencies", async () => {
    const registry = makeRegistry();
    const retriever = new ConflictAntiPatternRetriever(registry);

    const features = [
      makeFeature({ feature_id: "FEAT-A", depends_on_feature_ids: ["FEAT-B"] }),
      makeFeature({ feature_id: "FEAT-B", depends_on_feature_ids: ["FEAT-A"] }),
    ];

    const analysis = await retriever.retrieve(features[0]!, features);
    expect(analysis.contradictions.some(c => c.type === "dependency_conflict")).toBe(true);
    expect(analysis.should_block).toBe(true);
  });
});
