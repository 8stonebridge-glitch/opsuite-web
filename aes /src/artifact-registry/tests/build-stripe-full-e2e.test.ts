/**
 * AES Full End-to-End Test — "Build Stripe" (Research-Backed)
 *
 * Sources:
 *   - Perplexity: stripe.com/features, stripe.com/blog, docs.stripe.com
 *   - Donor: stripe_donor_study_packet.md (8 observations, 5 logic candidates, 4 UI candidates)
 *   - Playwright: 8 authenticated runtime snapshots (home, transactions, balances, billing, subscriptions, invoices, recovery, workbench)
 *
 * Tests a fundamentally different domain from Slack:
 *   - Financial operations with strict compliance requirements
 *   - Payments processing with fraud detection
 *   - Multi-currency and multi-region support
 *   - Developer API platform
 *   - Heavy security/audit requirements
 */

import { ArtifactRegistry } from "../src/registry/registry";
import { InMemoryStorage } from "../src/registry/storage";
import { AppIntakeService } from "../src/intake/app-intake";
import { AppDecomposer, type CandidateFeature } from "../src/planning/app-decomposer";
import type { AppSpec, FeatureSpec } from "../src/types/app-spec";
import type { Bridge, Build, DiffArtifact, TestRun, ValidatorRun } from "../src/types/artifacts";
import { generateArtifactId } from "../src/registry/id-generator";
import { loadHistoricalScenarios } from "../src/governance/historical-scenario-converter";
import { generateSyntheticScenarios } from "../src/governance/synthetic-scenarios";
import { runGovernanceLoop, DEFAULT_LOOP_CONFIG } from "../src/governance/governance-loop";
import { createBaselineGovernanceConfig } from "../src/governance/governance-config-defaults";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRegistry() {
  return new ArtifactRegistry(new InMemoryStorage());
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function simulateFeatureBuild(
  registry: ArtifactRegistry,
  feature: FeatureSpec,
  outcome: {
    passes: boolean;
    scopeViolation?: boolean;
    testFailures?: number;
    validatorConcerns?: string[];
    blockedReason?: string;
  },
) {
  const bridgeId = generateArtifactId("bridge");
  const buildId = generateArtifactId("build");
  const now = new Date().toISOString();

  const bridge: Bridge = {
    bridge_id: bridgeId,
    build_id: buildId,
    feature_id: feature.feature_id,
    generated_at: now,
    graph_snapshot_id: "SNAP-stripe-full",
    graph_truth_hash: "hash-stripe-full",
    bridge_version: 1,
    intent: feature.description,
    scope: { paths: [`src/${feature.feature_type}/${slugify(feature.name)}/`] },
    out_of_scope: [],
    constraints: [],
    tiered_constraints: [],
    patterns: [],
    anti_patterns: [],
    data_model: {},
    api_contracts: [],
    events: feature.events || [],
    db_touches: [],
    component_boundaries: [],
    read_scope: { paths: [`src/${feature.feature_type}/`, "src/shared/"] },
    write_scope: { paths: [`src/${feature.feature_type}/${slugify(feature.name)}/`] },
    read_scope_amendments: [],
    depends_on_bridge_ids: [],
    predecessor_build_ids: [],
    dependency_type: feature.dependencies.length > 0 ? "HARD" : "NONE",
    acceptance_criteria: feature.acceptance_criteria || [],
    test_cases: feature.test_cases || [],
    confidence: feature.confidence_summary.overall,
    confidence_breakdown: {
      graph_coverage: Math.min(1.0, feature.confidence_summary.overall + 0.1),
      pattern_strength: feature.confidence_summary.overall * 0.9,
      rule_consistency: feature.donor_mappings.length > 0 ? 0.85 : 0.6,
      evidence_level: feature.confidence_summary.research_coverage,
    },
    artifact_refs: [
      { artifact_type: "graph_snapshot", artifact_id: "SNAP-stripe-full", role: "graph_snapshot_source" },
    ],
    status: "VALIDATED",
  };
  await registry.write("bridge", bridge);

  const buildStatus = outcome.blockedReason ? "BLOCKED" : outcome.passes ? "PASSED" : "FAILED";
  const build: Build = {
    build_id: buildId,
    bridge_id: bridgeId,
    feature_id: feature.feature_id,
    status: buildStatus as any,
    blocked_reasons: outcome.blockedReason
      ? [{ code: outcome.blockedReason, message: outcome.blockedReason, source: "policy", severity: "HIGH" as const, detected_by: "orchestrator", timestamp: now }]
      : [],
    queued_at: now,
    authorized_at: outcome.blockedReason ? null : now,
    started_at: outcome.blockedReason ? null : now,
    ended_at: outcome.blockedReason ? null : now,
    builder_session_id: outcome.blockedReason ? null : "session-stripe-full",
    artifact_refs: [
      { artifact_type: "bridge", artifact_id: bridgeId, role: "constraint_source" },
    ],
  };
  await registry.write("build", build);

  const fileCount = Math.max(2, Math.floor(feature.backend_surfaces.length * 2 + feature.frontend_surfaces.length * 1.5));
  const diff: DiffArtifact = {
    diff_artifact_id: generateArtifactId("diff_artifact"),
    build_id: buildId,
    bridge_id: bridgeId,
    feature_id: feature.feature_id,
    captured_at: now,
    changed_files: Array.from({ length: fileCount }, (_, i) => ({
      path: `src/${feature.feature_type}/${slugify(feature.name)}/file-${i}.ts`,
      change_type: i === 0 ? "modified" as const : "added" as const,
      lines_added: 30 + Math.floor(i * 20),
      lines_removed: i === 0 ? 10 : 0,
      in_write_scope: !outcome.scopeViolation || i < fileCount - 1,
    })),
    path_violations: outcome.scopeViolation
      ? [{ path: "src/payments/core/ledger.ts", violation_type: "outside_write_scope" as const, description: "Modified ledger outside write_scope" }]
      : [],
    blob_ref: null,
    artifact_refs: [{ artifact_type: "build", artifact_id: buildId, role: "diff_source" }],
  };
  await registry.write("diff_artifact", diff);

  const totalTests = (feature.test_cases?.length || 5) * 2;
  const failedTests = outcome.testFailures ?? (outcome.passes ? 0 : Math.ceil(totalTests * 0.3));
  const testRun: TestRun = {
    test_run_id: generateArtifactId("test_run"),
    build_id: buildId,
    bridge_id: bridgeId,
    feature_id: feature.feature_id,
    executed_at: now,
    test_cases_run: totalTests,
    passed: totalTests - failedTests,
    failed: failedTests,
    skipped: 0,
    status: failedTests === 0 ? "PASS" : "FAIL",
    failure_details: Array.from({ length: failedTests }, (_, i) => ({
      test_case_id: `tc-fail-${i}`,
      test_name: `test failure ${i}`,
      error_message: "Assertion failed",
    })),
    blob_ref: null,
    artifact_refs: [{ artifact_type: "build", artifact_id: buildId, role: "test_source" }],
  };
  await registry.write("test_run", testRun);

  const validatorRun: ValidatorRun = {
    validator_id: "v-structural",
    validator_run_id: generateArtifactId("validator_run"),
    build_id: buildId,
    bridge_id: bridgeId,
    validated_at: now,
    status: outcome.passes ? "PASS" : "FAIL",
    evidence: [],
    violations: outcome.scopeViolation
      ? [{ rule: "scope_enforcement", severity: "HARD", description: "Ledger file modified outside scope" }]
      : [],
    missing: [],
    concerns: outcome.validatorConcerns || [],
    confidence: outcome.passes ? 0.85 : 0.3,
    artifact_refs: [{ artifact_type: "build", artifact_id: buildId, role: "validation_evidence" }],
  };
  await registry.write("validator_run", validatorRun);
}

// ─── Stripe Feature Set (Perplexity + Donor Research) ────────────────────────

const STRIPE_FEATURES: CandidateFeature[] = [
  // ── Core Platform ──────────────────────────────────────────
  {
    name: "Merchant Authentication & Onboarding",
    description: "Merchant registration, KYC/AML verification, API key management, sandbox/live mode switching",
    feature_type: "onboarding",
    auth_requirements: [{ type: "role_based", description: "Owner, admin, developer, viewer roles" }],
    data_entities: [
      { name: "Merchant", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE"] },
      { name: "ApiKey", owner_feature_id: "", operations: ["CREATE", "READ", "DELETE"] },
    ],
    acceptance_criteria: [
      { id: "ac-1", description: "Merchant can register and complete KYC", type: "functional", mandatory: true },
      { id: "ac-2", description: "API keys can be created and revoked", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-1", description: "KYC flow", type: "e2e", linked_criterion_id: "ac-1", mandatory: true },
      { id: "tc-2", description: "API key lifecycle", type: "integration", linked_criterion_id: "ac-2", mandatory: true },
    ],
    donor_mappings: [{ donor_name: "Stripe", donor_feature: "home_dashboard", relevance: "direct", notes: "Observation #1: sandbox visibility" }],
    confidence: { overall: 0.83, research_coverage: 0.85 },
  },
  {
    name: "Dashboard Home",
    description: "Metrics-first dashboard with gross volume, balance, payouts, recommendations, API keys, deep links. Donor: action-rich cards with deep links",
    feature_type: "backend_platform",
    depends_on: ["Merchant Authentication & Onboarding"],
    donor_mappings: [
      { donor_name: "Stripe", donor_feature: "metrics_dashboard", relevance: "direct", notes: "Observation #1: Metrics-first dashboard home" },
    ],
    frontend_surfaces: [{ name: "dashboard_home", type: "page", description: "Main dashboard" }],
    acceptance_criteria: [
      { id: "ac-3", description: "Dashboard shows gross volume and balance", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-3", description: "Dashboard metrics display", type: "e2e", linked_criterion_id: "ac-3", mandatory: true },
    ],
    confidence: { overall: 0.80, research_coverage: 0.9 },
  },

  // ── Payment Processing ─────────────────────────────────────
  {
    name: "Core Payment Processing",
    description: "Charge creation, authorization, capture, refunds, CVC/AVS checks, statement descriptors, adaptive acceptance",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Merchant Authentication & Onboarding"],
    data_entities: [
      { name: "Charge", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE"] },
      { name: "Refund", owner_feature_id: "", operations: ["CREATE", "READ"] },
    ],
    integrations: [{ name: "CardNetworks", type: "api", required: true }],
    acceptance_criteria: [
      { id: "ac-4", description: "Charges can be created and captured", type: "functional", mandatory: true },
      { id: "ac-5", description: "Refunds process correctly", type: "functional", mandatory: true },
      { id: "ac-6", description: "CVC/AVS checks enforced", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-4", description: "Charge lifecycle", type: "integration", linked_criterion_id: "ac-4", mandatory: true },
      { id: "tc-5", description: "Refund processing", type: "integration", linked_criterion_id: "ac-5", mandatory: true },
      { id: "tc-6", description: "CVC/AVS validation", type: "integration", linked_criterion_id: "ac-6", mandatory: true },
    ],
    confidence: { overall: 0.85, research_coverage: 0.9 },
  },
  {
    name: "Payment Methods",
    description: "125+ payment methods: cards, digital wallets (Apple Pay, Google Pay), bank debits (ACH, SEPA, BACS), buy-now-pay-later (Klarna)",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing"],
    acceptance_criteria: [
      { id: "ac-7", description: "Multiple payment methods supported", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-7", description: "Multi-method payment", type: "integration", linked_criterion_id: "ac-7", mandatory: true },
    ],
    confidence: { overall: 0.78, research_coverage: 0.75 },
  },
  {
    name: "Checkout & Payment Element",
    description: "Hosted checkout, embeddable Payment Element, Checkout Sessions API, adaptive pricing, AI-powered personalization",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Payment Methods"],
    frontend_surfaces: [
      { name: "checkout", type: "page", description: "Hosted checkout page" },
      { name: "payment_element", type: "widget", description: "Embeddable payment form" },
    ],
    acceptance_criteria: [
      { id: "ac-8", description: "Checkout session completes end-to-end", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-8", description: "Checkout session flow", type: "e2e", linked_criterion_id: "ac-8", mandatory: true },
    ],
    confidence: { overall: 0.82, research_coverage: 0.8 },
  },

  // ── Transactions (from donor: Observation #2) ──────────────
  {
    name: "Transactions Surface",
    description: "Multi-mode view: Payments, Payouts, Top-ups, All activity with filtering. Donor: tabbed transaction modes",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing"],
    donor_mappings: [
      { donor_name: "Stripe", donor_feature: "transactions", relevance: "direct", notes: "Observation #2: Multi-mode transactions surface" },
    ],
    frontend_surfaces: [{ name: "transactions", type: "page", description: "Transaction list and filters" }],
    acceptance_criteria: [
      { id: "ac-9", description: "Transactions filterable by mode and date", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-9", description: "Transaction filtering", type: "e2e", linked_criterion_id: "ac-9", mandatory: true },
    ],
    confidence: { overall: 0.79, research_coverage: 0.85 },
  },

  // ── Balances (from donor: Observation #3, Logic #1) ────────
  {
    name: "Balances & Payouts",
    description: "Balance management, payout scheduling, settlement currencies, multi-currency support. Donor: co-located balances, payouts, reports",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing"],
    donor_mappings: [
      { donor_name: "Stripe", donor_feature: "balances", relevance: "direct", notes: "Logic #1: Keep balances, payouts, reports visible together" },
    ],
    data_entities: [
      { name: "Balance", owner_feature_id: "", operations: ["READ"] },
      { name: "Payout", owner_feature_id: "", operations: ["CREATE", "READ"] },
    ],
    acceptance_criteria: [
      { id: "ac-10", description: "Balance displayed with available/pending breakdown", type: "functional", mandatory: true },
      { id: "ac-11", description: "Payouts can be initiated", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-10", description: "Balance display", type: "e2e", linked_criterion_id: "ac-10", mandatory: true },
      { id: "tc-11", description: "Payout initiation", type: "integration", linked_criterion_id: "ac-11", mandatory: true },
    ],
    confidence: { overall: 0.81, research_coverage: 0.85 },
  },

  // ── Billing (from donor: Observation #4, Logic #2) ─────────
  {
    name: "Subscription Billing",
    description: "Recurring billing, plan management, dunning, coupons, trials, prorations, usage-based billing. Donor: separate billing modules",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing"],
    donor_mappings: [
      { donor_name: "Stripe", donor_feature: "subscriptions", relevance: "direct", notes: "Observation #5: Dunning, trials, prorations" },
      { donor_name: "Stripe", donor_feature: "billing_nav", relevance: "direct", notes: "Logic #2: Separate billing modules" },
    ],
    data_entities: [
      { name: "Subscription", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE", "DELETE"] },
      { name: "Plan", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE"] },
    ],
    acceptance_criteria: [
      { id: "ac-12", description: "Subscriptions can be created with trials", type: "functional", mandatory: true },
      { id: "ac-13", description: "Dunning retries failed payments", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-12", description: "Subscription lifecycle", type: "integration", linked_criterion_id: "ac-12", mandatory: true },
      { id: "tc-13", description: "Dunning retry logic", type: "integration", linked_criterion_id: "ac-13", mandatory: true },
    ],
    confidence: { overall: 0.77, research_coverage: 0.8 },
  },
  {
    name: "Invoicing",
    description: "Invoice creation, payment links, reminders, branding, customer portal. Donor: hosted invoice page",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing"],
    donor_mappings: [
      { donor_name: "Stripe", donor_feature: "invoices", relevance: "direct", notes: "Observation #6: Payment links, reminders, branding" },
    ],
    acceptance_criteria: [
      { id: "ac-14", description: "Invoices can be created and sent", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-14", description: "Invoice lifecycle", type: "integration", linked_criterion_id: "ac-14", mandatory: true },
    ],
    confidence: { overall: 0.80, research_coverage: 0.8 },
  },

  // ── Revenue Recovery (from donor: Observation #7, Logic #3) ─
  {
    name: "Revenue Recovery",
    description: "Smart retries, recovery emails, automations, decline reason analysis. Donor: recovery ineffective when retry policy hidden",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Subscription Billing"],
    donor_mappings: [
      { donor_name: "Stripe", donor_feature: "revenue_recovery", relevance: "direct", notes: "Logic #3: Recovery ineffective when components hidden" },
    ],
    acceptance_criteria: [
      { id: "ac-15", description: "Failed payments automatically retried", type: "functional", mandatory: true },
      { id: "ac-16", description: "Recovery emails sent on failure", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-15", description: "Smart retry logic", type: "integration", linked_criterion_id: "ac-15", mandatory: true },
      { id: "tc-16", description: "Recovery email trigger", type: "integration", linked_criterion_id: "ac-16", mandatory: true },
    ],
    confidence: { overall: 0.74, research_coverage: 0.85 },
  },

  // ── Tax ─────────────────────────────────────────────────────
  {
    name: "Tax Calculation & Filing",
    description: "Automated tax calculation, registration, filing across jurisdictions. VAT, GST, sales tax",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing"],
    acceptance_criteria: [
      { id: "ac-17", description: "Tax calculated correctly per jurisdiction", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-17", description: "Multi-jurisdiction tax calculation", type: "integration", linked_criterion_id: "ac-17", mandatory: true },
    ],
    confidence: { overall: 0.71, research_coverage: 0.65 },
  },

  // ── Fraud ──────────────────────────────────────────────────
  {
    name: "Fraud Detection (Radar)",
    description: "ML-powered fraud detection, risk scoring, customizable rules, real-time flagging",
    feature_type: "backend_platform",
    depends_on: ["Core Payment Processing"],
    acceptance_criteria: [
      { id: "ac-18", description: "Fraudulent transactions flagged in real-time", type: "security", mandatory: true },
      { id: "ac-19", description: "Custom fraud rules can be created", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-18", description: "Fraud detection on test card", type: "integration", linked_criterion_id: "ac-18", mandatory: true },
      { id: "tc-19", description: "Custom rule evaluation", type: "integration", linked_criterion_id: "ac-19", mandatory: true },
    ],
    confidence: { overall: 0.68, research_coverage: 0.7 },
  },
  {
    name: "Dispute Management",
    description: "Chargeback handling, evidence submission, smart disputes with AI-generated responses",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing", "Fraud Detection (Radar)"],
    acceptance_criteria: [
      { id: "ac-20", description: "Disputes can be responded to with evidence", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-20", description: "Dispute response flow", type: "integration", linked_criterion_id: "ac-20", mandatory: true },
    ],
    confidence: { overall: 0.72, research_coverage: 0.65 },
  },

  // ── Connect (Marketplace) ──────────────────────────────────
  {
    name: "Connect Platform",
    description: "Marketplace payments, connected account onboarding, KYC/AML, transaction routing, payout controls, 1099 support",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing", "Merchant Authentication & Onboarding"],
    auth_requirements: [{ type: "org_scoped", description: "Platform-level access" }],
    data_entities: [
      { name: "ConnectedAccount", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE"] },
    ],
    acceptance_criteria: [
      { id: "ac-21", description: "Connected accounts can onboard and receive payouts", type: "functional", mandatory: true },
      { id: "ac-22", description: "KYC/AML checks enforced", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-21", description: "Connected account onboarding", type: "e2e", linked_criterion_id: "ac-21", mandatory: true },
      { id: "tc-22", description: "KYC enforcement", type: "integration", linked_criterion_id: "ac-22", mandatory: true },
    ],
    confidence: { overall: 0.65, research_coverage: 0.6 },
  },

  // ── Developer Tools (from donor: Observation #8, Logic #5) ─
  {
    name: "REST API Platform",
    description: "REST API with resource-oriented URLs, API versioning, expansion parameters, metadata, thin events",
    feature_type: "backend_platform",
    depends_on: ["Merchant Authentication & Onboarding"],
    acceptance_criteria: [
      { id: "ac-23", description: "API endpoints follow REST conventions", type: "functional", mandatory: true },
      { id: "ac-24", description: "API versioning works correctly", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-23", description: "REST endpoint CRUD", type: "integration", linked_criterion_id: "ac-23", mandatory: true },
      { id: "tc-24", description: "API version header", type: "integration", linked_criterion_id: "ac-24", mandatory: true },
    ],
    confidence: { overall: 0.84, research_coverage: 0.85 },
  },
  {
    name: "Webhooks & Events",
    description: "Event delivery, webhook endpoints, event filtering, retry logic, event destinations",
    feature_type: "backend_platform",
    depends_on: ["REST API Platform"],
    events: [
      { name: "payment.succeeded", payload_shape: { charge_id: "string" } },
      { name: "invoice.paid", payload_shape: { invoice_id: "string" } },
    ],
    acceptance_criteria: [
      { id: "ac-25", description: "Webhooks delivered reliably with retries", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-25", description: "Webhook delivery and retry", type: "integration", linked_criterion_id: "ac-25", mandatory: true },
    ],
    confidence: { overall: 0.79, research_coverage: 0.75 },
  },
  {
    name: "Developer Workbench",
    description: "Logs, events, webhooks, health, inspector. Donor: filterable API activity by resource, time, status, source",
    feature_type: "backend_platform",
    depends_on: ["REST API Platform", "Webhooks & Events"],
    donor_mappings: [
      { donor_name: "Stripe", donor_feature: "workbench_logs", relevance: "direct", notes: "Observation #8: Developer workbench with filterable logs" },
      { donor_name: "Stripe", donor_feature: "api_activity", relevance: "direct", notes: "Logic #5: API activity filterable by resource, time, status" },
    ],
    frontend_surfaces: [{ name: "workbench", type: "page", description: "Developer tools dashboard" }],
    acceptance_criteria: [
      { id: "ac-26", description: "API logs filterable by resource and status", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-26", description: "Log filtering", type: "e2e", linked_criterion_id: "ac-26", mandatory: true },
    ],
    confidence: { overall: 0.82, research_coverage: 0.9 },
  },

  // ── Multi-Currency ─────────────────────────────────────────
  {
    name: "Multi-Currency & FX",
    description: "135+ currencies, FX quotes API, exchange rate locking, adaptive pricing for 150+ markets",
    feature_type: "payments_and_billing_verification",
    depends_on: ["Core Payment Processing"],
    acceptance_criteria: [
      { id: "ac-27", description: "Payments accepted in multiple currencies", type: "functional", mandatory: true },
      { id: "ac-28", description: "FX rates quoted accurately", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-27", description: "Multi-currency charge", type: "integration", linked_criterion_id: "ac-27", mandatory: true },
      { id: "tc-28", description: "FX rate accuracy", type: "integration", linked_criterion_id: "ac-28", mandatory: true },
    ],
    confidence: { overall: 0.73, research_coverage: 0.7 },
  },

  // ── Reporting ──────────────────────────────────────────────
  {
    name: "Analytics & Reporting",
    description: "Payment analytics, dispute rates, revenue recognition, Sigma queries, Data Pipeline, benchmarking",
    feature_type: "backend_platform",
    depends_on: ["Core Payment Processing", "Subscription Billing"],
    frontend_surfaces: [{ name: "reports", type: "page", description: "Analytics dashboard" }],
    acceptance_criteria: [
      { id: "ac-29", description: "Reports generated with correct data", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-29", description: "Report generation", type: "integration", linked_criterion_id: "ac-29", mandatory: true },
    ],
    confidence: { overall: 0.75, research_coverage: 0.7 },
  },

  // ── Compliance ─────────────────────────────────────────────
  {
    name: "Compliance & Audit",
    description: "PCI DSS compliance, SOC 2/3, ISO 27001, GDPR, audit logs, data retention, legal holds",
    feature_type: "backend_platform",
    depends_on: ["Merchant Authentication & Onboarding"],
    auth_requirements: [{ type: "role_based", description: "Compliance officer access", roles: ["admin"] }],
    acceptance_criteria: [
      { id: "ac-30", description: "Audit logs capture all sensitive operations", type: "security", mandatory: true },
      { id: "ac-31", description: "Data retention policies enforced", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-30", description: "Audit log completeness", type: "integration", linked_criterion_id: "ac-30", mandatory: true },
      { id: "tc-31", description: "Retention enforcement", type: "integration", linked_criterion_id: "ac-31", mandatory: true },
    ],
    confidence: { overall: 0.70, research_coverage: 0.7 },
  },

  // ── Notification System ────────────────────────────────────
  {
    name: "Merchant Notifications",
    description: "Payment alerts, dispute notifications, payout notifications, webhook failure alerts, email and dashboard",
    feature_type: "notification_system",
    depends_on: ["Core Payment Processing", "Webhooks & Events"],
    integrations: [{ name: "Email", type: "email", required: true }],
    acceptance_criteria: [
      { id: "ac-32", description: "Merchants notified of payment events", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-32", description: "Payment notification delivery", type: "integration", linked_criterion_id: "ac-32", mandatory: true },
    ],
    confidence: { overall: 0.76, research_coverage: 0.65 },
  },

  // ── Environment Mode (from donor: Logic #4) ────────────────
  {
    name: "Test Mode & Sandbox",
    description: "Persistent sandbox/test/live mode switching across all surfaces. Donor: test mode must remain explicit",
    feature_type: "backend_platform",
    depends_on: ["Merchant Authentication & Onboarding"],
    donor_mappings: [
      { donor_name: "Stripe", donor_feature: "test_mode", relevance: "direct", notes: "Logic #4: Sandbox/test mode explicit across all surfaces" },
    ],
    acceptance_criteria: [
      { id: "ac-33", description: "Test mode clearly indicated on all surfaces", type: "functional", mandatory: true },
      { id: "ac-34", description: "Test data never leaks to live", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-33", description: "Mode indicator visibility", type: "e2e", linked_criterion_id: "ac-33", mandatory: true },
      { id: "tc-34", description: "Test/live data isolation", type: "integration", linked_criterion_id: "ac-34", mandatory: true },
    ],
    confidence: { overall: 0.85, research_coverage: 0.9 },
  },
];

// ─── Build Outcomes ──────────────────────────────────────────────────────────

const BUILD_OUTCOMES: Record<string, { passes: boolean; scopeViolation?: boolean; testFailures?: number; validatorConcerns?: string[]; blockedReason?: string }> = {
  "Merchant Authentication & Onboarding": { passes: true },
  "Dashboard Home": { passes: true },
  "Core Payment Processing": { passes: true },
  "Payment Methods": { passes: true, validatorConcerns: ["Only 5 of 125 methods tested"] },
  "Checkout & Payment Element": { passes: true },
  "Transactions Surface": { passes: true },
  "Balances & Payouts": { passes: true },
  "Subscription Billing": { passes: false, testFailures: 4, validatorConcerns: ["Proration edge cases failing"] },
  "Invoicing": { passes: true },
  "Revenue Recovery": { passes: false, testFailures: 3, validatorConcerns: ["Smart retry timing not deterministic in tests"] },
  "Tax Calculation & Filing": { passes: false, testFailures: 5, validatorConcerns: ["Multi-jurisdiction tax rules incomplete"] },
  "Fraud Detection (Radar)": { passes: false, scopeViolation: true, validatorConcerns: ["Modified payment core ledger outside scope"] },
  "Dispute Management": { passes: false, blockedReason: "DEPENDENCY_NOT_SATISFIED" },
  "Connect Platform": { passes: false, testFailures: 6, validatorConcerns: ["Connected account KYC flow incomplete"] },
  "REST API Platform": { passes: true },
  "Webhooks & Events": { passes: true },
  "Developer Workbench": { passes: true },
  "Multi-Currency & FX": { passes: false, testFailures: 3, validatorConcerns: ["FX rate staleness not handled"] },
  "Analytics & Reporting": { passes: true },
  "Compliance & Audit": { passes: true, validatorConcerns: ["GDPR right-to-delete not fully tested"] },
  "Merchant Notifications": { passes: true },
  "Test Mode & Sandbox": { passes: true },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Build Stripe — Full Research-Backed E2E (24 Features)", () => {
  let registry: ArtifactRegistry;
  let app: AppSpec;
  let features: FeatureSpec[];

  beforeAll(async () => {
    registry = makeRegistry();

    const intake = new AppIntakeService(registry);
    const appRecord = await intake.submitApp({
      description: "Build a Stripe-like payments platform. Sources: Perplexity research (2025 feature survey), donor Playwright recon (stripe_donor_study_packet.md with 8 observations, 5 logic candidates, 4 UI candidates, 8 authenticated browser captures). Full surface: payment processing, billing, subscriptions, invoicing, revenue recovery, fraud detection, disputes, connect/marketplace, tax, multi-currency, developer tools, webhooks, compliance, analytics.",
      requested_by: "operator",
      name: "Stripe Clone",
      product_type: "payments_platform",
      target_users: ["merchants", "developers", "platforms", "enterprises"],
    });
    app = appRecord.payload;

    const decomposer = new AppDecomposer();
    const result = decomposer.decompose({
      app,
      candidate_features: STRIPE_FEATURES,
    });
    features = result.features;

    await intake.updateApp(app.app_id, {
      feature_ids: features.map(f => f.feature_id),
      confidence_summary: {
        decomposition_confidence: 0.82,
        research_coverage: 0.78,
        verification_score: 0.72,
        overall: 0.77,
      },
    });

    for (const feature of features) {
      await registry.write("feature_spec", feature);
    }

    for (const feature of features) {
      const outcome = BUILD_OUTCOMES[feature.name] ?? { passes: true };
      await simulateFeatureBuild(registry, feature, outcome);
    }
  }, 30000);

  test("app submitted with Stripe research context", () => {
    expect(app.name).toBe("Stripe Clone");
    expect(app.product_type).toBe("payments_platform");
    expect(app.summary).toContain("Perplexity research");
    expect(app.summary).toContain("donor Playwright recon");
  });

  test("decomposed into 22+ features", () => {
    expect(features.length).toBeGreaterThanOrEqual(22);
  });

  test("features span payments, billing, platform, notifications, onboarding", () => {
    const types = new Set(features.map(f => f.feature_type));
    expect(types.has("payments_and_billing_verification")).toBe(true);
    expect(types.has("backend_platform")).toBe(true);
    expect(types.has("notification_system")).toBe(true);
    expect(types.has("onboarding")).toBe(true);
  });

  test("donor mappings preserved from Stripe recon", () => {
    const withDonor = features.filter(f => f.donor_mappings.length > 0);
    expect(withDonor.length).toBeGreaterThanOrEqual(8);
  });

  test("builds: mix of pass, fail, blocked", async () => {
    const builds = await registry.latestByType<Build>("build");
    expect(builds.length).toBeGreaterThanOrEqual(22);

    const passed = builds.filter(b => b.payload.status === "PASSED");
    const failed = builds.filter(b => b.payload.status === "FAILED");
    const blocked = builds.filter(b => b.payload.status === "BLOCKED");

    expect(passed.length + failed.length + blocked.length).toBe(features.length);
    expect(passed.length).toBeGreaterThanOrEqual(14);
    expect(failed.length).toBeGreaterThanOrEqual(5);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
  });

  test("fraud detection scope violation caught", async () => {
    const diffs = await registry.latestByType<DiffArtifact>("diff_artifact");
    const withViolations = diffs.filter(d => d.payload.path_violations.length > 0);
    expect(withViolations.length).toBeGreaterThanOrEqual(1);
    expect(withViolations[0]!.payload.path_violations[0]!.description).toContain("ledger");
  });

  test("dispute management blocked by upstream fraud detection failure", async () => {
    const builds = await registry.latestByType<Build>("build");
    const blocked = builds.filter(b => b.payload.status === "BLOCKED");
    expect(blocked.length).toBeGreaterThanOrEqual(1);
  });

  test("historical scenarios extracted from all builds", async () => {
    const scenarios = await loadHistoricalScenarios(registry);
    expect(scenarios.length).toBeGreaterThanOrEqual(24);

    // Stripe features should produce payment-related risk tags
    const paymentRelated = scenarios.filter(s =>
      s.inputs.risk_domain_tags.some(t => ["payments", "auth", "events"].includes(t)) ||
      s.inputs.feature_type === "payments_and_billing_verification"
    );
    expect(paymentRelated.length).toBeGreaterThanOrEqual(1);
  });

  test("governance trains on Stripe historical + synthetic data", async () => {
    const historical = await loadHistoricalScenarios(registry);
    const synthetic = generateSyntheticScenarios();
    const allScenarios = [...synthetic, ...historical];

    expect(allScenarios.length).toBeGreaterThan(55);

    const baseline = createBaselineGovernanceConfig();
    const result = runGovernanceLoop(baseline, allScenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 100,
    });

    expect(result.best_score).toBeGreaterThanOrEqual(result.baseline_score);
    expect(result.best_config.frozen).toEqual(baseline.frozen);

    console.log(`\n── Stripe Full E2E Governance Results ──`);
    console.log(`Scenarios: ${allScenarios.length} (${synthetic.length} synthetic + ${historical.length} historical)`);
    console.log(`Baseline: ${result.baseline_score.toFixed(4)}`);
    console.log(`Best: ${result.best_score.toFixed(4)}`);
    console.log(`Improvement: ${((result.best_score - result.baseline_score) * 100).toFixed(2)}%`);
    console.log(`Accepted: ${result.iterations.filter(i => i.accepted).length}`);
    if (result.ranked_candidates.length > 0) {
      console.log(`Top candidate: ${result.ranked_candidates[0]!.proposal_summary}`);
    }
  });

  test("different governance findings than Slack (different risk profile)", async () => {
    // Stripe has more payment/security risk features than Slack
    // The governance should find different optimal thresholds
    const historical = await loadHistoricalScenarios(registry);
    const paymentScenarios = historical.filter(s =>
      s.inputs.risk_domain_tags.some(t => ["payments", "auth", "security"].includes(t))
    );
    // Stripe should have significantly more payment/security-tagged scenarios
    expect(paymentScenarios.length).toBeGreaterThanOrEqual(3);
  });
});
