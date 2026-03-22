/**
 * AES Artifact Registry — Expanded Research Types
 *
 * Structured types for the full research surface Perplexity (or any external
 * research source) can populate:
 *
 *   - Market intelligence (existing)
 *   - Frontend UX patterns
 *   - Backend architecture
 *   - Security (frontend + backend)
 *   - Common pitfalls (categorized by who fixes them)
 *   - Operator manual steps (things Claude cannot do)
 *   - Stack-specific integration guides
 *
 * All research enters AES as UNTRUSTED and must be promoted through the
 * existing trust lifecycle before influencing builds.
 */

// ─── Frontend UX Research ────────────────────────────────────────────────────

export interface ScreenPattern {
  /** e.g. "Settings Page", "User Dashboard" */
  screen_name: string;
  /** Plain-english purpose */
  purpose: string;
  /** e.g. ["sidebar", "header", "main content area"] */
  common_sections: string[];
  /** e.g. ["edit profile", "change password", "manage billing"] */
  typical_actions: string[];
}

export interface OnboardingStep {
  step_number: number;
  screen_name: string;
  /** Plain english — what the user does on this screen */
  what_user_does: string;
  /** Why this step matters for retention / activation */
  why_it_matters: string;
}

export interface UXState {
  state_type: "empty" | "loading" | "error" | "partial" | "success";
  /** Which screen this applies to */
  screen: string;
  /** e.g. "Show skeleton loader with 3 card placeholders" */
  what_to_show: string;
  /** e.g. "Don't show a blank white screen" */
  what_not_to_do: string;
}

export interface FrontendPatterns {
  common_screens: ScreenPattern[];
  navigation_patterns: string[];
  /** Where buttons and CTAs typically go */
  action_placement: string[];
  dashboard_layouts: string[];
  onboarding_flows: OnboardingStep[];
  empty_loading_error_states: UXState[];
  notification_ux: string[];
  information_hierarchy: string[];
  /** Broad look-and-feel direction */
  visual_direction: string[];
}

// ─── Backend Architecture Research ───────────────────────────────────────────

export interface BackendArchitecture {
  recommended_patterns: string[];
  data_model_patterns: string[];
  api_design_patterns: string[];
  scaling_considerations: string[];
  stack_guides: StackIntegrationGuide[];
}

// ─── Stack Integration Guides ────────────────────────────────────────────────

export interface PlainStep {
  step_number: number;
  /** Plain english action */
  do_this: string;
  /** Why this step matters */
  why: string;
  /** Troubleshooting hint if stuck */
  if_stuck: string;
}

export interface StackIntegrationGuide {
  /** e.g. "clerk", "convex", "vercel", "stripe" */
  stack: string;
  /** e.g. "authentication", "database", "hosting", "payments" */
  role: string;
  integration_steps: PlainStep[];
  pitfalls: Pitfall[];
  /** Whether this guide was web-verified */
  verified: boolean;
}

// ─── Security Research ───────────────────────────────────────────────────────

export interface SecurityItem {
  /** e.g. "JWT stored in localStorage" */
  threat: string;
  severity: "critical" | "high" | "medium" | "low";
  /** Plain english consequence */
  what_goes_wrong: string;
  /** Plain english fix */
  what_to_do_instead: string;
  /** e.g. "Clerk token handling", "Convex mutations" */
  applies_to: string;
}

export interface SecurityResearch {
  /** XSS, CSRF, CSP, token storage, etc. */
  frontend_security: SecurityItem[];
  /** Injection, auth bypass, rate limiting, etc. */
  backend_security: SecurityItem[];
  /** Provider-specific mistakes (Clerk, Supabase, Auth0, etc.) */
  auth_pitfalls: SecurityItem[];
  /** PII leaks, logging secrets, exposing IDs, etc. */
  data_exposure_risks: SecurityItem[];
  /** Known vulnerability patterns for this app type */
  common_cve_patterns: string[];
  /** GDPR, SOC2, HIPAA notes if relevant */
  compliance_notes: string[];
}

// ─── Common Pitfalls ─────────────────────────────────────────────────────────

export interface Pitfall {
  /** e.g. "Forgetting to set CONVEX_DEPLOY_KEY" */
  mistake: string;
  /** e.g. "Deploys will silently fail" */
  consequence: string;
  /** e.g. "Add it in Vercel env settings before first deploy" */
  how_to_avoid: string;
  /** Who is responsible for fixing this */
  who_fixes_it: "claude" | "operator" | "either";
}

export interface PitfallResearch {
  frontend_pitfalls: Pitfall[];
  backend_pitfalls: Pitfall[];
  deployment_pitfalls: Pitfall[];
  /** Stack-combination-specific issues (Clerk+Convex+Vercel, etc.) */
  integration_pitfalls: Pitfall[];
  /** Migrations, backups, seeds, data integrity */
  data_pitfalls: Pitfall[];
}

// ─── Operator Manual Steps ───────────────────────────────────────────────────
// Things Claude CANNOT do — the human must perform these.
// Written for a non-technical operator: "go here, click this, copy that back."

export interface ManualStep {
  step_number: number;
  /** e.g. "Create your Clerk application" */
  title: string;
  /** e.g. "Claude can't create accounts for you" */
  why: string;
  /** e.g. "Go to clerk.com → Sign up → Create app → Copy API keys" */
  what_to_do: string;
  /** URL or dashboard name */
  where_to_go: string;
  /** e.g. "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY" */
  what_to_copy_back: string;
  /** e.g. "2 minutes" */
  estimated_time: string;
  /** e.g. "Look for the 'API Keys' tab in the left sidebar" */
  screenshot_hint?: string;
}

export interface OperatorManualSteps {
  /** Create Clerk app, Convex project, Vercel project, etc. */
  account_setup: ManualStep[];
  /** API keys, secrets, .env files */
  env_configuration: ManualStep[];
  /** Custom domains, DNS records, SSL */
  dns_and_domains: ManualStep[];
  /** Stripe dashboard, email provider, SMS provider, etc. */
  third_party_dashboards: ManualStep[];
  /** Legal pages, cookie consent, privacy policy, terms */
  compliance_steps: ManualStep[];
  /** Error tracking (Sentry), analytics, logging */
  monitoring_setup: ManualStep[];
  /** First deploy, CI/CD pipeline wiring, preview deploys */
  deployment_steps: ManualStep[];
}

// ─── Full Structured Research Summary ────────────────────────────────────────

export interface StructuredResearchSummary {
  // ── Market intelligence (existing) ────────────────────
  comparable_products: string[];
  common_features: string[];
  differentiation_opportunities: string[];
  technical_patterns: string[];
  risk_areas: string[];

  // ── Expanded research domains ─────────────────────────
  frontend_patterns: FrontendPatterns;
  backend_architecture: BackendArchitecture;
  security: SecurityResearch;
  pitfalls: PitfallResearch;
  operator_manual_steps: OperatorManualSteps;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const EMPTY_FRONTEND_PATTERNS: FrontendPatterns = {
  common_screens: [],
  navigation_patterns: [],
  action_placement: [],
  dashboard_layouts: [],
  onboarding_flows: [],
  empty_loading_error_states: [],
  notification_ux: [],
  information_hierarchy: [],
  visual_direction: [],
};

export const EMPTY_BACKEND_ARCHITECTURE: BackendArchitecture = {
  recommended_patterns: [],
  data_model_patterns: [],
  api_design_patterns: [],
  scaling_considerations: [],
  stack_guides: [],
};

export const EMPTY_SECURITY_RESEARCH: SecurityResearch = {
  frontend_security: [],
  backend_security: [],
  auth_pitfalls: [],
  data_exposure_risks: [],
  common_cve_patterns: [],
  compliance_notes: [],
};

export const EMPTY_PITFALL_RESEARCH: PitfallResearch = {
  frontend_pitfalls: [],
  backend_pitfalls: [],
  deployment_pitfalls: [],
  integration_pitfalls: [],
  data_pitfalls: [],
};

export const EMPTY_OPERATOR_MANUAL_STEPS: OperatorManualSteps = {
  account_setup: [],
  env_configuration: [],
  dns_and_domains: [],
  third_party_dashboards: [],
  compliance_steps: [],
  monitoring_setup: [],
  deployment_steps: [],
};

export const EMPTY_STRUCTURED_RESEARCH: StructuredResearchSummary = {
  comparable_products: [],
  common_features: [],
  differentiation_opportunities: [],
  technical_patterns: [],
  risk_areas: [],
  frontend_patterns: EMPTY_FRONTEND_PATTERNS,
  backend_architecture: EMPTY_BACKEND_ARCHITECTURE,
  security: EMPTY_SECURITY_RESEARCH,
  pitfalls: EMPTY_PITFALL_RESEARCH,
  operator_manual_steps: EMPTY_OPERATOR_MANUAL_STEPS,
};
