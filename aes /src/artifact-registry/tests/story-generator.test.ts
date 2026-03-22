/**
 * AES Story Generator Tests
 *
 * Tests the Nigerian compliance app scenario:
 * "I want a compliance operations app for Nigerian SMEs that feels as simple
 *  as WhatsApp, but turns approvals, documents, and audit trails into one
 *  guided workflow."
 */

import { ArtifactRegistry } from "../src/registry/registry";
import { InMemoryStorage } from "../src/registry/storage";
import { StoryGenerator } from "../src/agents/story-generator";
import type { FeatureSpec } from "../src/types/app-spec";
import type { StructuredResearchSummary } from "../src/types/research-types";
import type { FounderIntent } from "../src/types/user-story-types";
import { EMPTY_STRUCTURED_RESEARCH } from "../src/types/research-types";

function makeRegistry() {
  return new ArtifactRegistry(new InMemoryStorage());
}

function makeFeature(input: Record<string, unknown> & { feature_id: string }): FeatureSpec {
  return {
    feature_id: input.feature_id,
    app_id: (input.app_id as string) || "APP-COMPLIANCE",
    name: (input.name as string) || input.feature_id,
    description: (input.description as string) || "",
    feature_type: (input.feature_type as string) || "backend_platform",
    donor_mappings: [],
    dependencies: (input.dependencies as string[]) || [],
    user_roles: (input.user_roles as string[]) || ["user"],
    backend_surfaces: [],
    frontend_surfaces: [],
    auth_requirements: [],
    data_entities: (input.data_entities as []) || [],
    events: [],
    integrations: [],
    failure_states: (input.failure_states as []) || [],
    destructive_actions: [],
    acceptance_criteria: (input.acceptance_criteria as []) || [],
    test_cases: [],
    missing_questions: [],
    evidence_summary: { total_evidence_items: 0, untrusted: 0, verified: 0, canonical: 0, coverage_gaps: [] } as any,
    confidence_summary: { overall: 0.5 } as any,
    promotion_status: "CANDIDATE" as any,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as FeatureSpec;
}

// ─── The Nigerian Compliance App Scenario ────────────────────────────────────

const FOUNDER_INTENT: FounderIntent = {
  app_id: "APP-COMPLIANCE-NG",
  experience_description: "A compliance operations app for Nigerian SMEs that feels as simple as WhatsApp, but turns approvals, documents, and audit trails into one guided workflow",
  feel_keywords: ["simple", "whatsapp", "guided", "concierge"],
  anti_goals: ["dashboard", "complex", "enterprise", "bulk actions", "table-first"],
  strategic_bets: [
    "Chat-like task flow instead of traditional enterprise UI",
    "Guided submission wizard instead of form-heavy approach",
    "Mobile-first for Nigerian SME operators",
  ],
  provided_at: new Date().toISOString(),
};

// Simulated Perplexity research for compliance apps
const RESEARCH: StructuredResearchSummary = {
  ...EMPTY_STRUCTURED_RESEARCH,
  comparable_products: ["Compliance.ai", "LogicGate", "OneTrust"],
  common_features: ["Approvals", "Document management", "Audit trails", "Reporting", "Role management"],
  frontend_patterns: {
    common_screens: [
      { screen_name: "Approvals Inbox", purpose: "View and act on pending approvals", common_sections: ["pending list", "filters"], typical_actions: ["Approve", "Reject", "Request info"] },
      { screen_name: "Dashboard", purpose: "Overview of compliance status with charts and tables", common_sections: ["metrics", "charts", "recent activity"], typical_actions: ["Filter", "Export", "Drill down"] },
      { screen_name: "Document Requests", purpose: "Submit and track document requests", common_sections: ["request form", "status tracker"], typical_actions: ["Submit document", "View status"] },
      { screen_name: "Audit Timeline", purpose: "Immutable log of all compliance actions", common_sections: ["event list", "filters", "export"], typical_actions: ["Search", "Filter by date", "Export"] },
    ],
    navigation_patterns: ["Sidebar with sections", "Top tabs for categories", "Breadcrumb for drill-down"],
    action_placement: ["Primary actions top-right", "Bulk actions in toolbar", "Filters in sidebar"],
    dashboard_layouts: ["Metrics cards row", "Compliance score gauge", "Recent activity table"],
    onboarding_flows: [
      { step_number: 1, screen_name: "Setup", what_user_does: "Configure organization", why_it_matters: "Personalizes compliance rules" },
      { step_number: 2, screen_name: "Invite", what_user_does: "Add team members", why_it_matters: "Enables approvals workflow" },
    ],
    empty_loading_error_states: [
      { state_type: "empty", screen: "Approvals", what_to_show: "No pending approvals — all caught up", what_not_to_do: "Show blank table" },
      { state_type: "loading", screen: "Dashboard", what_to_show: "Skeleton cards and chart placeholders", what_not_to_do: "Show spinner on white background" },
    ],
    notification_ux: ["Badge counts on pending items", "Push for urgent approvals"],
    information_hierarchy: ["Compliance status > Pending actions > Recent activity"],
    visual_direction: ["Enterprise feel", "Charts and data tables", "Blue/gray color scheme"],
  },
};

describe("StoryGenerator — Nigerian Compliance App", () => {
  let generator: StoryGenerator;

  beforeEach(() => {
    generator = new StoryGenerator(makeRegistry());
  });

  test("generates user stories with merged source", () => {
    const feature = makeFeature({
      feature_id: "FEAT-APPROVALS",
      name: "Approvals",
      description: "Review and decide on approval requests quickly",
      user_roles: ["approver", "requester"],
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
    });

    // Should have stories for both roles
    expect(result.context.user_stories.length).toBe(2);
    expect(result.context.user_stories[0]!.as_a).toBe("approver");
    expect(result.context.user_stories[1]!.as_a).toBe("requester");
    expect(result.context.user_stories[0]!.source).toBe("merged");
  });

  test("generates usage narrative with trust moments and drop-off risks", () => {
    const feature = makeFeature({
      feature_id: "FEAT-APPROVALS",
      name: "Approvals",
      description: "Review and decide on approval requests with audit trail",
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
    });

    const narrative = result.context.usage_narratives[0]!;
    expect(narrative.trigger).toBeDefined();
    expect(narrative.decision_point).toBeDefined();
    expect(narrative.trust_moments.length).toBeGreaterThan(0);
    expect(narrative.what_could_go_wrong.length).toBeGreaterThan(0);
    expect(narrative.drop_off_risks.length).toBeGreaterThan(0);
  });

  test("generates journey state with main, alternate, and failure flows", () => {
    const feature = makeFeature({
      feature_id: "FEAT-APPROVALS",
      name: "Approvals Inbox",
      description: "View and act on pending approval requests",
      dependencies: ["FEAT-AUTH"],
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
    });

    const journey = result.context.journey_states[0]!;
    expect(journey.precondition).toContain("User is signed in");
    expect(journey.main_flow.length).toBeGreaterThan(0);
    expect(journey.failure_flows.length).toBeGreaterThan(0);
    expect(journey.completion_state.length).toBeGreaterThan(0);
  });

  test("REJECTS dashboard pattern when founder says WhatsApp-simple", () => {
    const feature = makeFeature({
      feature_id: "FEAT-OVERVIEW",
      name: "Overview",
      description: "Main compliance overview screen",
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
    });

    const findings = result.context.classified_findings;
    const dashboardFinding = findings.find(f =>
      f.description.toLowerCase().includes("dashboard")
    );

    // Dashboard should be REJECTED because founder said "simple" and "whatsapp"
    expect(dashboardFinding).toBeDefined();
    expect(dashboardFinding!.classification).toBe("REJECTED");
  });

  test("BORROWS approvals inbox pattern (aligns with founder intent)", () => {
    const feature = makeFeature({
      feature_id: "FEAT-APPROVALS",
      name: "Approvals",
      description: "Review and decide on approval requests",
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
    });

    const findings = result.context.classified_findings;
    const approvalsFinding = findings.find(f =>
      f.description.toLowerCase().includes("approvals inbox")
    );

    // Approvals inbox should be EXPECT or BORROW (not rejected)
    expect(approvalsFinding).toBeDefined();
    expect(approvalsFinding!.classification).not.toBe("REJECTED");
  });

  test("EXPECTS empty/loading/error states (users always need these)", () => {
    const feature = makeFeature({
      feature_id: "FEAT-APPROVALS",
      name: "Approvals",
      description: "Approval inbox",
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
    });

    const findings = result.context.classified_findings;
    const uxFindings = findings.filter(f => f.description.includes("UX state"));
    expect(uxFindings.length).toBeGreaterThan(0);
    expect(uxFindings.every(f => f.classification === "EXPECT")).toBe(true);
  });

  test("generates synthesis decisions with rejected research", () => {
    const feature = makeFeature({
      feature_id: "FEAT-OVERVIEW",
      name: "Overview",
      description: "Main compliance screen",
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
    });

    const synthesis = result.context.synthesis_decisions;
    expect(synthesis.length).toBeGreaterThan(0);
    expect(synthesis[0]!.founder_intent).toContain("WhatsApp");
    expect(synthesis[0]!.rejected_research.length).toBeGreaterThan(0);
  });

  test("needs user review when findings are system-classified", () => {
    const feature = makeFeature({
      feature_id: "FEAT-APPROVALS",
      name: "Approvals",
      description: "Approval inbox",
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
    });

    // System-classified → needs user review
    expect(result.needs_user_review).toBe(true);
    expect(result.review_questions.length).toBeGreaterThan(0);
  });

  test("skips user review when findings are user-provided", () => {
    const feature = makeFeature({
      feature_id: "FEAT-APPROVALS",
      name: "Approvals",
      description: "Approval inbox",
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
      user_classified_findings: [
        { finding_id: "RF-1", feature_id: "FEAT-APPROVALS", description: "Approvals inbox pattern", classification: "BORROW", reason: "Fits our model", classified_by: "user", research_source: "perplexity" },
      ],
    });

    // User already classified → no review needed
    expect(result.needs_user_review).toBe(false);
  });

  test("confidence reflects evidence sources", () => {
    const feature = makeFeature({
      feature_id: "FEAT-APPROVALS",
      name: "Approvals",
      description: "Approval inbox",
    });

    const result = generator.generate({
      feature,
      app_id: "APP-COMPLIANCE-NG",
      founder_intent: FOUNDER_INTENT,
      research_summary: RESEARCH,
    });

    const conf = result.context.story_confidence;
    expect(conf.inventor_provided).toBe(true);
    expect(conf.research_derived).toBe(true);
    expect(conf.merged).toBe(true);
    expect(conf.confidence).toBeGreaterThan(0.7);
    expect(conf.rejected_research.length).toBeGreaterThan(0);
  });
});
