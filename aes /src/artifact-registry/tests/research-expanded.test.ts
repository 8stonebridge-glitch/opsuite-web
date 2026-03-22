import { parseResearchSummary } from "../src/research/app-research";
import { AppDecomposer } from "../src/planning/app-decomposer";
import type { AppSpec } from "../src/types/app-spec";
import type { StructuredResearchSummary } from "../src/types/research-types";
import { EMPTY_STRUCTURED_RESEARCH } from "../src/types/research-types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeApp(overrides: Partial<AppSpec> = {}): AppSpec {
  return {
    app_id: "APP-test",
    name: "Test App",
    summary: "A test app",
    product_type: "saas",
    target_users: ["admin"],
    roles: ["admin", "user"],
    core_jobs_to_be_done: [],
    global_constraints: [],
    shared_backend_surfaces: [],
    shared_frontend_surfaces: [],
    feature_ids: [],
    open_questions: [],
    evidence_summary: {
      sources: [],
      research_note_ids: [],
      total_evidence_count: 0,
    },
    confidence_summary: {
      decomposition_confidence: 0.8,
      research_coverage: 0.7,
      verification_score: 0,
      overall: 0.5,
    },
    promotion_status: "DRAFT",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeFullResearch(): StructuredResearchSummary {
  return {
    comparable_products: ["Asana", "Linear"],
    common_features: ["task boards", "notifications"],
    differentiation_opportunities: ["AI-powered prioritization"],
    technical_patterns: ["event sourcing"],
    risk_areas: ["complex permissions"],
    frontend_patterns: {
      common_screens: [
        {
          screen_name: "Dashboard",
          purpose: "Main overview of tasks and projects",
          common_sections: ["sidebar", "header", "main content"],
          typical_actions: ["create task", "filter by status"],
        },
        {
          screen_name: "Settings",
          purpose: "User and org settings management",
          common_sections: ["navigation tabs", "form sections"],
          typical_actions: ["change password", "manage team"],
        },
      ],
      navigation_patterns: ["sidebar + top bar", "breadcrumb trail"],
      action_placement: ["primary CTA top-right", "destructive actions bottom-left"],
      dashboard_layouts: ["KPI cards on top, table below"],
      onboarding_flows: [
        {
          step_number: 1,
          screen_name: "Welcome",
          what_user_does: "Enter name and role",
          why_it_matters: "Personalizes the experience",
        },
      ],
      empty_loading_error_states: [
        {
          state_type: "empty",
          screen: "Dashboard",
          what_to_show: "Illustration with 'Create your first task' CTA",
          what_not_to_do: "Don't show a blank white screen",
        },
        {
          state_type: "error",
          screen: "*",
          what_to_show: "Friendly error message with retry button",
          what_not_to_do: "Don't show raw stack traces",
        },
      ],
      notification_ux: ["toast for success", "banner for errors"],
      information_hierarchy: ["title > subtitle > body > metadata"],
      visual_direction: ["clean, minimal, professional"],
    },
    backend_architecture: {
      recommended_patterns: ["serverless functions", "edge middleware"],
      data_model_patterns: ["documents with embedded arrays"],
      api_design_patterns: ["RPC-style mutations"],
      scaling_considerations: ["Convex handles scaling automatically"],
      stack_guides: [
        {
          stack: "clerk",
          role: "authentication",
          integration_steps: [
            {
              step_number: 1,
              do_this: "Install @clerk/nextjs",
              why: "Provides React hooks and middleware",
              if_stuck: "Check you are using Next.js 13+",
            },
          ],
          pitfalls: [
            {
              mistake: "Not wrapping app in ClerkProvider",
              consequence: "All auth hooks return undefined",
              how_to_avoid: "Add ClerkProvider in layout.tsx",
              who_fixes_it: "claude",
            },
          ],
          verified: false,
        },
        {
          stack: "convex",
          role: "database",
          integration_steps: [
            {
              step_number: 1,
              do_this: "Run npx convex dev",
              why: "Starts local Convex dev server and syncs schema",
              if_stuck: "Make sure CONVEX_DEPLOYMENT env var is set",
            },
          ],
          pitfalls: [
            {
              mistake: "Forgetting to set CONVEX_DEPLOY_KEY in Vercel",
              consequence: "Production deploys will silently fail",
              how_to_avoid: "Add it in Vercel env settings before first deploy",
              who_fixes_it: "operator",
            },
          ],
          verified: false,
        },
      ],
    },
    security: {
      frontend_security: [
        {
          threat: "XSS via unsanitized user content",
          severity: "high",
          what_goes_wrong: "Attacker can steal session tokens",
          what_to_do_instead: "Use React's built-in escaping, never dangerouslySetInnerHTML",
          applies_to: "All user-generated content display",
        },
      ],
      backend_security: [
        {
          threat: "Missing rate limiting on auth endpoints",
          severity: "critical",
          what_goes_wrong: "Brute force attacks on login",
          what_to_do_instead: "Clerk handles this, but add rate limiting to custom API routes",
          applies_to: "Custom API endpoints",
        },
      ],
      auth_pitfalls: [
        {
          threat: "JWT stored in localStorage",
          severity: "high",
          what_goes_wrong: "XSS can steal the token",
          what_to_do_instead: "Let Clerk manage token storage (httpOnly cookies)",
          applies_to: "Clerk token handling",
        },
      ],
      data_exposure_risks: [
        {
          threat: "Logging user PII in server logs",
          severity: "medium",
          what_goes_wrong: "PII ends up in log aggregation services",
          what_to_do_instead: "Redact email, name, and IP from logs",
          applies_to: "Server-side logging",
        },
      ],
      common_cve_patterns: ["SSRF via URL input fields"],
      compliance_notes: ["GDPR: need cookie consent banner"],
    },
    pitfalls: {
      frontend_pitfalls: [
        {
          mistake: "Not handling loading states",
          consequence: "Users see blank screens during data fetch",
          how_to_avoid: "Add Suspense boundaries and skeleton loaders",
          who_fixes_it: "claude",
        },
      ],
      backend_pitfalls: [
        {
          mistake: "Not validating mutation inputs",
          consequence: "Bad data enters the database",
          how_to_avoid: "Use Convex validators on every mutation",
          who_fixes_it: "claude",
        },
      ],
      deployment_pitfalls: [
        {
          mistake: "Deploying without setting env vars first",
          consequence: "App crashes on startup",
          how_to_avoid: "Set all env vars in Vercel dashboard before first deploy",
          who_fixes_it: "operator",
        },
      ],
      integration_pitfalls: [
        {
          mistake: "Clerk webhook secret not configured",
          consequence: "User sync between Clerk and Convex breaks",
          how_to_avoid: "Set CLERK_WEBHOOK_SECRET in both Clerk dashboard and Vercel",
          who_fixes_it: "operator",
        },
      ],
      data_pitfalls: [],
    },
    operator_manual_steps: {
      account_setup: [
        {
          step_number: 1,
          title: "Create your Clerk application",
          why: "Claude cannot create accounts for you",
          what_to_do: "Go to clerk.com → Sign up → Create app → Copy API keys",
          where_to_go: "https://dashboard.clerk.com",
          what_to_copy_back: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY",
          estimated_time: "2 minutes",
          screenshot_hint: "Look for the 'API Keys' tab in the left sidebar",
        },
        {
          step_number: 2,
          title: "Create your Convex project",
          why: "Claude cannot create cloud accounts",
          what_to_do: "Go to convex.dev → Sign up → Create project → Copy deployment URL",
          where_to_go: "https://dashboard.convex.dev",
          what_to_copy_back: "CONVEX_DEPLOYMENT and CONVEX_DEPLOY_KEY",
          estimated_time: "3 minutes",
        },
      ],
      env_configuration: [
        {
          step_number: 1,
          title: "Add API keys to Vercel",
          why: "Secrets must never be in code",
          what_to_do: "Go to Vercel project → Settings → Environment Variables → Add each key",
          where_to_go: "https://vercel.com/dashboard",
          what_to_copy_back: "Nothing — just confirm they are saved",
          estimated_time: "5 minutes",
        },
      ],
      dns_and_domains: [],
      third_party_dashboards: [],
      compliance_steps: [],
      monitoring_setup: [],
      deployment_steps: [
        {
          step_number: 1,
          title: "Connect GitHub repo to Vercel",
          why: "Enables automatic deploys on push",
          what_to_do: "Go to Vercel → New Project → Import Git Repository → Select your repo",
          where_to_go: "https://vercel.com/new",
          what_to_copy_back: "Nothing — Vercel handles it automatically",
          estimated_time: "2 minutes",
        },
      ],
    },
  };
}

// ─── Tests: parseResearchSummary ─────────────────────────────────────────────

describe("parseResearchSummary (expanded)", () => {
  it("returns empty defaults for non-JSON input", () => {
    const result = parseResearchSummary("just some prose about the market");
    expect(result).toEqual(EMPTY_STRUCTURED_RESEARCH);
  });

  it("parses full structured JSON into all domains", () => {
    const research = makeFullResearch();
    const result = parseResearchSummary(JSON.stringify(research));

    // Market intelligence
    expect(result.comparable_products).toEqual(["Asana", "Linear"]);
    expect(result.common_features).toHaveLength(2);

    // Frontend patterns
    expect(result.frontend_patterns.common_screens).toHaveLength(2);
    expect(result.frontend_patterns.common_screens[0]!.screen_name).toBe("Dashboard");
    expect(result.frontend_patterns.onboarding_flows).toHaveLength(1);
    expect(result.frontend_patterns.empty_loading_error_states).toHaveLength(2);

    // Backend architecture
    expect(result.backend_architecture.stack_guides).toHaveLength(2);
    expect(result.backend_architecture.stack_guides[0]!.stack).toBe("clerk");

    // Security
    expect(result.security.frontend_security).toHaveLength(1);
    expect(result.security.backend_security).toHaveLength(1);
    expect(result.security.auth_pitfalls).toHaveLength(1);
    expect(result.security.data_exposure_risks).toHaveLength(1);
    expect(result.security.backend_security[0]!.severity).toBe("critical");

    // Pitfalls
    expect(result.pitfalls.deployment_pitfalls).toHaveLength(1);
    expect(result.pitfalls.deployment_pitfalls[0]!.who_fixes_it).toBe("operator");

    // Operator manual steps
    expect(result.operator_manual_steps.account_setup).toHaveLength(2);
    expect(result.operator_manual_steps.account_setup[0]!.title).toBe(
      "Create your Clerk application",
    );
    expect(result.operator_manual_steps.deployment_steps).toHaveLength(1);
  });

  it("handles partial JSON gracefully", () => {
    const partial = {
      comparable_products: ["Notion"],
      security: {
        frontend_security: [
          {
            threat: "XSS",
            severity: "high",
            what_goes_wrong: "bad",
            what_to_do_instead: "escape",
            applies_to: "all",
          },
        ],
      },
      // Everything else missing
    };
    const result = parseResearchSummary(JSON.stringify(partial));

    expect(result.comparable_products).toEqual(["Notion"]);
    expect(result.security.frontend_security).toHaveLength(1);
    // Missing domains should be empty defaults
    expect(result.frontend_patterns.common_screens).toHaveLength(0);
    expect(result.backend_architecture.stack_guides).toHaveLength(0);
    expect(result.operator_manual_steps.account_setup).toHaveLength(0);
  });

  it("rejects invalid security severity gracefully", () => {
    const data = {
      security: {
        frontend_security: [
          {
            threat: "something",
            severity: "INVALID",
            what_goes_wrong: "x",
            what_to_do_instead: "y",
            applies_to: "z",
          },
        ],
      },
    };
    const result = parseResearchSummary(JSON.stringify(data));
    expect(result.security.frontend_security[0]!.severity).toBe("medium"); // fallback
  });

  it("drops malformed items from arrays", () => {
    const data = {
      frontend_patterns: {
        common_screens: [
          { screen_name: "Good", purpose: "ok", common_sections: [], typical_actions: [] },
          { bad: "no screen_name" },
          "not an object",
        ],
      },
    };
    const result = parseResearchSummary(JSON.stringify(data));
    expect(result.frontend_patterns.common_screens).toHaveLength(1);
    expect(result.frontend_patterns.common_screens[0]!.screen_name).toBe("Good");
  });
});

// ─── Tests: AppDecomposer with research ──────────────────────────────────────

describe("AppDecomposer with expanded research", () => {
  const decomposer = new AppDecomposer();

  it("enriches frontend surfaces from research common_screens", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Dashboard",
          description: "Main dashboard for task overview",
          feature_type: "workflow",
          // No frontend_surfaces provided — should be enriched from research
        },
      ],
      research_summary: makeFullResearch(),
    });

    const dashboardFeature = result.features[0]!;
    // Should have picked up the "Dashboard" screen from research
    expect(dashboardFeature.frontend_surfaces.length).toBeGreaterThan(0);
    expect(dashboardFeature.frontend_surfaces[0]!.name).toBe("Dashboard");
  });

  it("does not overwrite existing frontend surfaces", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Dashboard",
          description: "Main dashboard",
          feature_type: "workflow",
          frontend_surfaces: [
            { name: "Custom Dashboard", type: "page", description: "My custom layout" },
          ],
        },
      ],
      research_summary: makeFullResearch(),
    });

    // Should keep the existing surface, not replace it
    expect(result.features[0]!.frontend_surfaces).toHaveLength(1);
    expect(result.features[0]!.frontend_surfaces[0]!.name).toBe("Custom Dashboard");
  });

  it("enriches failure states from UX states and security risks", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Dashboard",
          description: "Main dashboard",
          feature_type: "workflow",
        },
      ],
      research_summary: makeFullResearch(),
    });

    const feature = result.features[0]!;
    // Should have UX empty state for Dashboard + global error state + security risks
    expect(feature.failure_states.length).toBeGreaterThan(0);

    const hasEmptyState = feature.failure_states.some(
      (f) => f.trigger.includes("empty") && f.trigger.includes("Dashboard"),
    );
    expect(hasEmptyState).toBe(true);

    const hasGlobalError = feature.failure_states.some(
      (f) => f.trigger.includes("error") && f.trigger.includes("*"),
    );
    expect(hasGlobalError).toBe(true);
  });

  it("adds security-derived acceptance criteria for critical/high items", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Auth",
          description: "Authentication system",
          feature_type: "onboarding",
        },
      ],
      research_summary: makeFullResearch(),
    });

    const feature = result.features[0]!;
    const securityCriteria = feature.acceptance_criteria.filter((c) =>
      c.description.startsWith("Security:"),
    );
    // Should have criteria from critical + high severity items
    expect(securityCriteria.length).toBeGreaterThan(0);
  });

  it("computes research depth for confidence scoring", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Feature",
          description: "Some feature",
          feature_type: "workflow",
        },
      ],
      research_summary: makeFullResearch(),
    });

    const feature = result.features[0]!;
    // Full research should give high research_coverage
    expect(feature.confidence_summary.research_coverage).toBeGreaterThan(0.7);
  });

  it("returns low confidence when no research provided", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Feature",
          description: "Some feature",
          feature_type: "workflow",
        },
      ],
      // No research
    });

    const feature = result.features[0]!;
    expect(feature.confidence_summary.research_coverage).toBe(0.3);
  });

  it("extracts operator checklist from research", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Auth",
          description: "Auth system",
          feature_type: "onboarding",
        },
      ],
      research_summary: makeFullResearch(),
    });

    expect(result.operator_checklist.account_setup).toHaveLength(2);
    expect(result.operator_checklist.account_setup[0]!.title).toBe(
      "Create your Clerk application",
    );
    expect(result.operator_checklist.deployment_steps).toHaveLength(1);
  });

  it("extracts operator pitfalls (excludes claude-only)", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Auth",
          description: "Auth system",
          feature_type: "onboarding",
        },
      ],
      research_summary: makeFullResearch(),
    });

    // Only pitfalls where who_fixes_it is "operator" or "either"
    expect(result.operator_pitfalls.length).toBeGreaterThan(0);
    for (const p of result.operator_pitfalls) {
      expect(p.who_fixes_it).not.toBe("claude");
    }
  });

  it("reports research domains covered in coverage report", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Feature",
          description: "Some feature",
          feature_type: "workflow",
          user_roles: ["admin", "user"],
          backend_surfaces: [{ name: "api", type: "api_endpoint", description: "endpoint" }],
          frontend_surfaces: [{ name: "page", type: "page", description: "page" }],
        },
      ],
      research_summary: makeFullResearch(),
    });

    expect(result.coverage_report.research_domains_covered).toBe(5);
    expect(result.coverage_report.research_domains_total).toBe(5);
  });

  it("tracks granular evidence sources", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Feature",
          description: "Some feature",
          feature_type: "workflow",
        },
      ],
      research_summary: makeFullResearch(),
    });

    const sources = result.features[0]!.evidence_summary.sources;
    expect(sources).toContain("perplexity-market");
    expect(sources).toContain("perplexity-frontend");
    expect(sources).toContain("perplexity-backend");
    expect(sources).toContain("perplexity-security");
    expect(sources).toContain("perplexity-pitfalls");
  });

  it("flags missing security coverage", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskApp" }),
      candidate_features: [
        {
          name: "Dashboard",
          description: "Main dashboard",
          feature_type: "workflow",
          user_roles: ["admin", "user"],
        },
      ],
      // No auth feature → should flag
    });

    expect(
      result.coverage_report.missing_coverage.some((m) =>
        m.includes("authentication") || m.includes("security"),
      ),
    ).toBe(true);
  });
});
