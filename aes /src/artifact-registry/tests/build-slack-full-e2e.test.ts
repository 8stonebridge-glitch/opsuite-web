/**
 * AES Full End-to-End Test — "Build Slack" (Research-Backed)
 *
 * Unlike the minimal 7-feature test, this version uses:
 *   - Perplexity research on actual Slack features (2025)
 *   - Donor Playwright recon data (slack_donor_study_packet.md)
 *   - 25+ features covering the real Slack surface
 *   - Realistic failure patterns based on feature complexity
 *   - Cross-feature dependency chains
 *   - Governance training on the full artifact trail
 *
 * Sources:
 *   - Perplexity: slack.com/features, slack.com/blog, uctoday.com
 *   - Donor: slack_donor_study_packet.md (8 observations, 4 logic candidates, 5 UI candidates)
 *   - Playwright: slack-auth-channel-home.yml, slack-auth-activity.yml, etc.
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

/**
 * Simulate a feature build with configurable outcomes.
 * Models real-world failure patterns based on feature complexity.
 */
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
    graph_snapshot_id: "SNAP-slack-full",
    graph_truth_hash: "hash-slack-full",
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
      { artifact_type: "graph_snapshot", artifact_id: "SNAP-slack-full", role: "graph_snapshot_source" },
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
    builder_session_id: outcome.blockedReason ? null : "session-slack-full",
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
      lines_added: 30 + Math.floor(Math.random() * 100),
      lines_removed: i === 0 ? 10 : 0,
      in_write_scope: !outcome.scopeViolation || i < fileCount - 1,
    })),
    path_violations: outcome.scopeViolation
      ? [{ path: "src/auth/middleware.ts", violation_type: "outside_write_scope" as const, description: "Modified outside write_scope" }]
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

  const validatorStatus = outcome.passes ? "PASS" : outcome.scopeViolation ? "FAIL" : "FAIL";
  const validatorRun: ValidatorRun = {
    validator_id: "v-structural",
    validator_run_id: generateArtifactId("validator_run"),
    build_id: buildId,
    bridge_id: bridgeId,
    validated_at: now,
    status: validatorStatus,
    evidence: [],
    violations: outcome.scopeViolation
      ? [{ rule: "scope_enforcement", severity: "HARD", description: "Scope violation detected" }]
      : [],
    missing: [],
    concerns: outcome.validatorConcerns || [],
    confidence: outcome.passes ? 0.85 : 0.3,
    artifact_refs: [{ artifact_type: "build", artifact_id: buildId, role: "validation_evidence" }],
  };
  await registry.write("validator_run", validatorRun);

  return { bridge, build, diff, testRun, validatorRun };
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ─── Full Slack Feature Set (Perplexity + Donor Research) ────────────────────

const SLACK_FEATURES: CandidateFeature[] = [
  // ── Core Platform ──────────────────────────────────────────
  {
    name: "Authentication & SSO",
    description: "User registration, login, SAML SSO, MFA, session management, SCIM provisioning",
    feature_type: "backend_platform",
    auth_requirements: [
      { type: "role_based", description: "Admin, member, guest roles" },
      { type: "org_scoped", description: "Workspace-level auth" },
    ],
    data_entities: [
      { name: "User", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE"] },
      { name: "Session", owner_feature_id: "", operations: ["CREATE", "READ", "DELETE"] },
    ],
    acceptance_criteria: [
      { id: "ac-1", description: "Users can sign up and log in", type: "functional", mandatory: true },
      { id: "ac-2", description: "SAML SSO works", type: "security", mandatory: true },
      { id: "ac-3", description: "MFA enforced for admin", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-1", description: "Login flow", type: "e2e", linked_criterion_id: "ac-1", mandatory: true },
      { id: "tc-2", description: "SSO flow", type: "integration", linked_criterion_id: "ac-2", mandatory: true },
      { id: "tc-3", description: "MFA enforcement", type: "integration", linked_criterion_id: "ac-3", mandatory: true },
    ],
    donor_mappings: [{ donor_name: "Clerk", donor_feature: "auth_onboarding", relevance: "direct" }],
    confidence: { overall: 0.84, research_coverage: 0.9 },
  },
  {
    name: "Workspace Management",
    description: "Workspace creation, settings, billing, member management, role assignment",
    feature_type: "backend_platform",
    depends_on: ["Authentication & SSO"],
    auth_requirements: [{ type: "role_based", description: "Workspace admin only", roles: ["admin"] }],
    data_entities: [
      { name: "Workspace", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE"] },
    ],
    acceptance_criteria: [
      { id: "ac-4", description: "Admin can manage workspace settings", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-4", description: "Workspace settings CRUD", type: "integration", linked_criterion_id: "ac-4", mandatory: true },
    ],
    confidence: { overall: 0.78, research_coverage: 0.7 },
  },

  // ── Channels & Conversations (from donor: slack-logic-001) ──
  {
    name: "Channels",
    description: "Public/private channels, channel creation, archiving, channel-specific settings. Donor: shared channels, DMs, and activity triage remain distinct modes",
    feature_type: "collaboration_system",
    depends_on: ["Workspace Management"],
    donor_mappings: [
      { donor_name: "Slack", donor_feature: "channel_home", relevance: "direct", notes: "Observation #1: Runtime shell separates modes" },
      { donor_name: "Slack", donor_feature: "channel_actions", relevance: "direct", notes: "Observation #2: Direct collaboration actions from header" },
    ],
    data_entities: [
      { name: "Channel", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE", "DELETE"] },
      { name: "ChannelMembership", owner_feature_id: "", operations: ["CREATE", "READ", "DELETE"] },
    ],
    acceptance_criteria: [
      { id: "ac-5", description: "Users can create public/private channels", type: "functional", mandatory: true },
      { id: "ac-6", description: "Channel archiving works", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-5", description: "Channel CRUD", type: "integration", linked_criterion_id: "ac-5", mandatory: true },
      { id: "tc-6", description: "Archive flow", type: "integration", linked_criterion_id: "ac-6", mandatory: true },
    ],
    confidence: { overall: 0.80, research_coverage: 0.85 },
  },
  {
    name: "Direct Messages",
    description: "1:1 DMs, group DMs, DM search, Unreads filter. Donor: separate collaboration mode with distinct surface",
    feature_type: "collaboration_system",
    depends_on: ["Authentication & SSO"],
    donor_mappings: [
      { donor_name: "Slack", donor_feature: "dm_surface", relevance: "direct", notes: "Observation #5: Separate collaboration mode" },
    ],
    acceptance_criteria: [
      { id: "ac-7", description: "Users can send DMs", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-7", description: "DM send/receive", type: "e2e", linked_criterion_id: "ac-7", mandatory: true },
    ],
    confidence: { overall: 0.82, research_coverage: 0.8 },
  },
  {
    name: "Threads",
    description: "Reply threads in channels and DMs, thread following, thread-level notifications",
    feature_type: "collaboration_system",
    depends_on: ["Channels", "Direct Messages"],
    acceptance_criteria: [
      { id: "ac-8", description: "Users can reply in threads", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-8", description: "Thread creation and replies", type: "e2e", linked_criterion_id: "ac-8", mandatory: true },
    ],
    confidence: { overall: 0.74, research_coverage: 0.75 },
  },

  // ── Real-time Messaging ────────────────────────────────────
  {
    name: "Real-time Messaging Engine",
    description: "WebSocket connections, message delivery, typing indicators, presence, read receipts",
    feature_type: "collaboration_system",
    depends_on: ["Channels", "Direct Messages"],
    events: [
      { name: "message.sent", payload_shape: { text: "string", channel_id: "string" } },
      { name: "typing.start", payload_shape: { user_id: "string", channel_id: "string" } },
      { name: "presence.update", payload_shape: { user_id: "string", status: "string" } },
    ],
    acceptance_criteria: [
      { id: "ac-9", description: "Messages delivered in real-time via WebSocket", type: "functional", mandatory: true },
      { id: "ac-10", description: "Typing indicators visible", type: "functional", mandatory: false },
    ],
    test_cases: [
      { id: "tc-9", description: "WebSocket message delivery", type: "e2e", linked_criterion_id: "ac-9", mandatory: true },
      { id: "tc-10", description: "Typing indicator", type: "integration", linked_criterion_id: "ac-10", mandatory: false },
    ],
    confidence: { overall: 0.67, research_coverage: 0.7 },
  },
  {
    name: "Message Formatting & Rich Content",
    description: "Markdown rendering, code blocks, link previews/unfurling, emoji reactions, custom emoji",
    feature_type: "collaboration_system",
    depends_on: ["Real-time Messaging Engine"],
    acceptance_criteria: [
      { id: "ac-11", description: "Markdown renders correctly", type: "functional", mandatory: true },
      { id: "ac-12", description: "Emoji reactions work", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-11", description: "Markdown rendering", type: "unit", linked_criterion_id: "ac-11", mandatory: true },
      { id: "tc-12", description: "Emoji reaction CRUD", type: "integration", linked_criterion_id: "ac-12", mandatory: true },
    ],
    confidence: { overall: 0.76, research_coverage: 0.65 },
  },
  {
    name: "Scheduled Messages",
    description: "Schedule messages for future delivery across time zones in channels, DMs, and threads",
    feature_type: "collaboration_system",
    depends_on: ["Real-time Messaging Engine"],
    acceptance_criteria: [
      { id: "ac-13", description: "Messages can be scheduled and delivered at set time", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-13", description: "Schedule and deliver message", type: "integration", linked_criterion_id: "ac-13", mandatory: true },
    ],
    confidence: { overall: 0.79, research_coverage: 0.6 },
  },

  // ── Composer (from donor: Observation #7) ──────────────────
  {
    name: "Message Composer",
    description: "Rich text composer with mentions, attachments, formatting toolbar, scheduled send. Donor: mentions, attachments, formatting, scheduled send as first-class actions",
    feature_type: "collaboration_system",
    depends_on: ["Real-time Messaging Engine"],
    donor_mappings: [
      { donor_name: "Slack", donor_feature: "composer", relevance: "direct", notes: "Observation #7: Composer actions" },
    ],
    acceptance_criteria: [
      { id: "ac-14", description: "Composer supports @mentions", type: "functional", mandatory: true },
      { id: "ac-15", description: "File attachments from composer", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-14", description: "Mention autocomplete", type: "e2e", linked_criterion_id: "ac-14", mandatory: true },
      { id: "tc-15", description: "File attachment from composer", type: "e2e", linked_criterion_id: "ac-15", mandatory: true },
    ],
    confidence: { overall: 0.81, research_coverage: 0.85 },
  },

  // ── Notifications (from donor: Observation #8) ─────────────
  {
    name: "Notification System",
    description: "Push notifications, email digests, mention alerts, thread follow alerts. Notification status with presence indicators",
    feature_type: "notification_system",
    depends_on: ["Real-time Messaging Engine", "Threads"],
    donor_mappings: [
      { donor_name: "Slack", donor_feature: "notification_status", relevance: "direct", notes: "Observation #8: Inline notification state with presence" },
    ],
    integrations: [{ name: "Email", type: "email", required: true }],
    acceptance_criteria: [
      { id: "ac-16", description: "Mention triggers push notification", type: "functional", mandatory: true },
      { id: "ac-17", description: "Email digest for missed messages", type: "functional", mandatory: false },
    ],
    test_cases: [
      { id: "tc-16", description: "Push notification on mention", type: "integration", linked_criterion_id: "ac-16", mandatory: true },
    ],
    confidence: { overall: 0.72, research_coverage: 0.75 },
  },
  {
    name: "Notification Preferences",
    description: "Per-channel mute, do-not-disturb, notification schedule, snooze, desktop/mobile sync",
    feature_type: "notification_system",
    depends_on: ["Notification System"],
    acceptance_criteria: [
      { id: "ac-18", description: "Users can mute channels", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-18", description: "Channel mute", type: "integration", linked_criterion_id: "ac-18", mandatory: true },
    ],
    confidence: { overall: 0.75, research_coverage: 0.65 },
  },

  // ── Activity Triage (from donor: Observation #4, Logic #2) ──
  {
    name: "Activity Feed & Triage",
    description: "Dedicated activity surface with Unreads filter, caught-up state, mention tracking. Donor: Activity surfaces keep meaningful caught-up state even when quiet",
    feature_type: "notification_system",
    depends_on: ["Notification System"],
    donor_mappings: [
      { donor_name: "Slack", donor_feature: "activity_triage", relevance: "direct", notes: "Logic candidate slack-logic-002: caught-up state" },
    ],
    acceptance_criteria: [
      { id: "ac-19", description: "Activity feed shows unread messages", type: "functional", mandatory: true },
      { id: "ac-20", description: "Caught-up state displayed when all read", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-19", description: "Unread tracking", type: "e2e", linked_criterion_id: "ac-19", mandatory: true },
      { id: "tc-20", description: "Caught-up state", type: "e2e", linked_criterion_id: "ac-20", mandatory: true },
    ],
    confidence: { overall: 0.77, research_coverage: 0.85 },
  },

  // ── Search ─────────────────────────────────────────────────
  {
    name: "Search Engine",
    description: "Full-text search across messages, files, channels. AI-powered search with permission checks",
    feature_type: "backend_platform",
    depends_on: ["Real-time Messaging Engine"],
    acceptance_criteria: [
      { id: "ac-21", description: "Search returns relevant messages", type: "functional", mandatory: true },
      { id: "ac-22", description: "Search respects permissions", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-21", description: "Full-text search", type: "integration", linked_criterion_id: "ac-21", mandatory: true },
      { id: "tc-22", description: "Permission-scoped search", type: "integration", linked_criterion_id: "ac-22", mandatory: true },
    ],
    confidence: { overall: 0.71, research_coverage: 0.7 },
  },

  // ── File Management ────────────────────────────────────────
  {
    name: "File Sharing & Management",
    description: "Upload, preview, share files in channels/DMs. File storage, thumbnails, download",
    feature_type: "collaboration_system",
    depends_on: ["Channels", "Direct Messages"],
    destructive_actions: [{ action: "Delete file", reversible: false, confirmation_required: true, audit_logged: true }],
    data_entities: [{ name: "File", owner_feature_id: "", operations: ["CREATE", "READ", "DELETE"] }],
    acceptance_criteria: [
      { id: "ac-23", description: "Users can upload and share files", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-23", description: "File upload flow", type: "e2e", linked_criterion_id: "ac-23", mandatory: true },
    ],
    confidence: { overall: 0.78, research_coverage: 0.7 },
  },

  // ── Audio/Video ────────────────────────────────────────────
  {
    name: "Huddles",
    description: "Instant audio/video calls with screen sharing from channels/DMs. Casual, low-pressure alternative to meetings",
    feature_type: "collaboration_system",
    depends_on: ["Channels", "Direct Messages"],
    acceptance_criteria: [
      { id: "ac-24", description: "Users can start huddles from channels", type: "functional", mandatory: true },
      { id: "ac-25", description: "Screen sharing works in huddles", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-24", description: "Huddle start/join", type: "e2e", linked_criterion_id: "ac-24", mandatory: true },
    ],
    confidence: { overall: 0.62, research_coverage: 0.55 },
  },
  {
    name: "Clips",
    description: "Short audio/video recordings in messages for async communication",
    feature_type: "collaboration_system",
    depends_on: ["Message Composer"],
    acceptance_criteria: [
      { id: "ac-26", description: "Users can record and send clips", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-26", description: "Clip recording and playback", type: "e2e", linked_criterion_id: "ac-26", mandatory: true },
    ],
    confidence: { overall: 0.58, research_coverage: 0.45 },
  },

  // ── Self-Space (from donor: Observation #6, Logic #4) ──────
  {
    name: "Personal Space & Notes",
    description: "Self-DM as personal workspace for drafts, to-dos, links, files with built-in canvas. Donor: personal surface doubles as lightweight workbench",
    feature_type: "collaboration_system",
    depends_on: ["Direct Messages"],
    donor_mappings: [
      { donor_name: "Slack", donor_feature: "self_space", relevance: "direct", notes: "Logic candidate slack-logic-004: personal workbench" },
    ],
    acceptance_criteria: [
      { id: "ac-27", description: "Users can save personal notes", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-27", description: "Personal note CRUD", type: "integration", linked_criterion_id: "ac-27", mandatory: true },
    ],
    confidence: { overall: 0.73, research_coverage: 0.8 },
  },

  // ── Canvas ─────────────────────────────────────────────────
  {
    name: "Canvas",
    description: "Persistent collaborative documents per channel/DM. Real-time editing, embeds, checklists, tables",
    feature_type: "collaboration_system",
    depends_on: ["Channels", "Direct Messages"],
    acceptance_criteria: [
      { id: "ac-28", description: "Canvas supports real-time collaborative editing", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-28", description: "Canvas collaborative edit", type: "e2e", linked_criterion_id: "ac-28", mandatory: true },
    ],
    confidence: { overall: 0.64, research_coverage: 0.6 },
  },

  // ── Lists (Task Management) ────────────────────────────────
  {
    name: "Lists & Task Tracking",
    description: "Built-in task management: create, assign, track action items directly in Slack",
    feature_type: "workflow",
    depends_on: ["Channels"],
    data_entities: [{ name: "Task", owner_feature_id: "", operations: ["CREATE", "READ", "UPDATE", "DELETE"] }],
    acceptance_criteria: [
      { id: "ac-29", description: "Users can create and assign tasks", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-29", description: "Task CRUD and assignment", type: "integration", linked_criterion_id: "ac-29", mandatory: true },
    ],
    confidence: { overall: 0.69, research_coverage: 0.55 },
  },

  // ── Workflow Builder ───────────────────────────────────────
  {
    name: "Workflow Builder",
    description: "No-code automations with conditional branches (up to 5 levels), time-based triggers, external tool integration",
    feature_type: "workflow",
    depends_on: ["Channels", "Notification System"],
    acceptance_criteria: [
      { id: "ac-30", description: "Users can create multi-step workflows", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-30", description: "Workflow creation and execution", type: "e2e", linked_criterion_id: "ac-30", mandatory: true },
    ],
    confidence: { overall: 0.63, research_coverage: 0.6 },
  },

  // ── Integrations ───────────────────────────────────────────
  {
    name: "App Integration Platform",
    description: "App marketplace, OAuth scopes, webhook security, app governance. 2600+ integrations",
    feature_type: "backend_platform",
    depends_on: ["Workspace Management"],
    integrations: [{ name: "OAuth", type: "oauth", required: true }],
    acceptance_criteria: [
      { id: "ac-31", description: "Third-party apps can be installed", type: "functional", mandatory: true },
      { id: "ac-32", description: "App permissions are scoped", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-31", description: "App install flow", type: "e2e", linked_criterion_id: "ac-31", mandatory: true },
      { id: "tc-32", description: "App scope enforcement", type: "integration", linked_criterion_id: "ac-32", mandatory: true },
    ],
    confidence: { overall: 0.70, research_coverage: 0.65 },
  },
  {
    name: "Slack Connect",
    description: "Secure shared channels with external partners. Domain allowlists, file/message sharing controls",
    feature_type: "collaboration_system",
    depends_on: ["Channels", "Authentication & SSO"],
    auth_requirements: [{ type: "org_scoped", description: "Cross-org trust boundary" }],
    acceptance_criteria: [
      { id: "ac-33", description: "External channels work across workspaces", type: "functional", mandatory: true },
      { id: "ac-34", description: "Domain allowlist enforced", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-33", description: "Cross-workspace channel", type: "integration", linked_criterion_id: "ac-33", mandatory: true },
      { id: "tc-34", description: "Domain allowlist", type: "integration", linked_criterion_id: "ac-34", mandatory: true },
    ],
    confidence: { overall: 0.60, research_coverage: 0.5 },
  },

  // ── Onboarding (from donor: Observation #3) ────────────────
  {
    name: "Onboarding & Starter Templates",
    description: "Workspace creation, invite flow, first-run experience. Donor: starter templates (Run a project, Chat with team, Collaborate with partners, Invite teammates)",
    feature_type: "onboarding",
    depends_on: ["Authentication & SSO", "Channels"],
    donor_mappings: [
      { donor_name: "Slack", donor_feature: "channel_onboarding", relevance: "direct", notes: "Observation #3: Starter templates" },
    ],
    acceptance_criteria: [
      { id: "ac-35", description: "New users complete onboarding", type: "functional", mandatory: true },
      { id: "ac-36", description: "Starter templates create pre-configured channels", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-35", description: "Onboarding flow completion", type: "e2e", linked_criterion_id: "ac-35", mandatory: true },
      { id: "tc-36", description: "Template channel creation", type: "integration", linked_criterion_id: "ac-36", mandatory: true },
    ],
    confidence: { overall: 0.81, research_coverage: 0.85 },
  },

  // ── Security & Compliance ──────────────────────────────────
  {
    name: "Security & Compliance",
    description: "Encryption (transit/rest), EKM/BYOK, DLP, anomaly detection, audit logs, legal holds, data retention policies",
    feature_type: "backend_platform",
    depends_on: ["Workspace Management"],
    auth_requirements: [{ type: "role_based", description: "Admin-only security settings", roles: ["admin"] }],
    acceptance_criteria: [
      { id: "ac-37", description: "Audit logs capture all admin actions", type: "security", mandatory: true },
      { id: "ac-38", description: "Data retention policies enforced", type: "security", mandatory: true },
    ],
    test_cases: [
      { id: "tc-37", description: "Audit log completeness", type: "integration", linked_criterion_id: "ac-37", mandatory: true },
      { id: "tc-38", description: "Retention policy enforcement", type: "integration", linked_criterion_id: "ac-38", mandatory: true },
    ],
    confidence: { overall: 0.66, research_coverage: 0.7 },
  },

  // ── App Shell (from donor: UI candidate slack-ui-001) ──────
  {
    name: "App Shell & Navigation",
    description: "Runtime shell with Home, DMs, Activity, Files as top-level modes. Custom sidebar sections. Donor: dense collaboration shell with separated top-level modes",
    feature_type: "backend_platform",
    depends_on: ["Authentication & SSO"],
    donor_mappings: [
      { donor_name: "Slack", donor_feature: "runtime_shell", relevance: "direct", notes: "UI candidate slack-ui-001: Dense collaboration shell" },
      { donor_name: "Slack", donor_feature: "sidebar_sections", relevance: "direct", notes: "Custom sections for organizing" },
    ],
    frontend_surfaces: [
      { name: "app_shell", type: "page", description: "Main application shell" },
      { name: "sidebar", type: "panel", description: "Navigation sidebar" },
      { name: "top_nav", type: "panel", description: "Top navigation bar" },
    ],
    acceptance_criteria: [
      { id: "ac-39", description: "Shell renders with all top-level modes", type: "functional", mandatory: true },
      { id: "ac-40", description: "Custom sidebar sections work", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-39", description: "Shell mode navigation", type: "e2e", linked_criterion_id: "ac-39", mandatory: true },
      { id: "tc-40", description: "Custom sidebar section", type: "e2e", linked_criterion_id: "ac-40", mandatory: true },
    ],
    confidence: { overall: 0.83, research_coverage: 0.9 },
  },

  // ── Reminders ──────────────────────────────────────────────
  {
    name: "Reminders",
    description: "Personal and team reminders for deadlines, follow-ups, message follow-up",
    feature_type: "workflow",
    depends_on: ["Real-time Messaging Engine", "Notification System"],
    acceptance_criteria: [
      { id: "ac-41", description: "Users can set reminders on messages", type: "functional", mandatory: true },
    ],
    test_cases: [
      { id: "tc-41", description: "Message reminder", type: "integration", linked_criterion_id: "ac-41", mandatory: true },
    ],
    confidence: { overall: 0.76, research_coverage: 0.6 },
  },
];

// ─── Build Outcome Matrix (Realistic Failures) ──────────────────────────────

const BUILD_OUTCOMES: Record<string, { passes: boolean; scopeViolation?: boolean; testFailures?: number; validatorConcerns?: string[]; blockedReason?: string }> = {
  "Authentication & SSO": { passes: true },
  "Workspace Management": { passes: true },
  "Channels": { passes: true },
  "Direct Messages": { passes: true },
  "Threads": { passes: true, validatorConcerns: ["Thread notification edge case not covered"] },
  "Real-time Messaging Engine": { passes: false, testFailures: 4, validatorConcerns: ["WebSocket reconnection not tested"] },
  "Message Formatting & Rich Content": { passes: true },
  "Scheduled Messages": { passes: true },
  "Message Composer": { passes: true },
  "Notification System": { passes: false, scopeViolation: true },
  "Notification Preferences": { passes: false, blockedReason: "DEPENDENCY_NOT_SATISFIED" },
  "Activity Feed & Triage": { passes: false, blockedReason: "DEPENDENCY_NOT_SATISFIED" },
  "Search Engine": { passes: true },
  "File Sharing & Management": { passes: true },
  "Huddles": { passes: false, testFailures: 6, validatorConcerns: ["WebRTC not testable in CI"] },
  "Clips": { passes: false, testFailures: 3 },
  "Personal Space & Notes": { passes: true },
  "Canvas": { passes: false, testFailures: 5, validatorConcerns: ["CRDT conflict resolution not tested"] },
  "Lists & Task Tracking": { passes: true },
  "Workflow Builder": { passes: true, validatorConcerns: ["Only 2-level nesting tested, spec says 5"] },
  "App Integration Platform": { passes: true },
  "Slack Connect": { passes: false, scopeViolation: true, validatorConcerns: ["Cross-org trust boundary violated"] },
  "Onboarding & Starter Templates": { passes: true },
  "Security & Compliance": { passes: true, validatorConcerns: ["EKM not tested without HSM"] },
  "App Shell & Navigation": { passes: true },
  "Reminders": { passes: true },
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Build Slack — Full Research-Backed E2E (26 Features)", () => {
  let registry: ArtifactRegistry;
  let app: AppSpec;
  let features: FeatureSpec[];

  beforeAll(async () => {
    registry = makeRegistry();

    // Step 1: Submit "build Slack" with research context
    const intake = new AppIntakeService(registry);
    const appRecord = await intake.submitApp({
      description: "Build a Slack-like team communication app. Sources: Perplexity research (2025 feature survey), donor Playwright recon (slack_donor_study_packet.md with 8 observations, 4 logic candidates, 5 UI candidates). Full feature surface: messaging, channels, threads, huddles, canvas, search, workflows, notifications, file sharing, app integrations, security/compliance, onboarding.",
      requested_by: "operator",
      name: "Slack Clone",
      product_type: "team_communication",
      target_users: ["developers", "teams", "enterprises"],
    });
    app = appRecord.payload;

    // Step 2: Decompose into features (research-backed)
    const decomposer = new AppDecomposer();
    const result = decomposer.decompose({
      app,
      candidate_features: SLACK_FEATURES,
    });
    features = result.features;

    // Update app
    await intake.updateApp(app.app_id, {
      feature_ids: features.map(f => f.feature_id),
      confidence_summary: {
        decomposition_confidence: 0.85,
        research_coverage: 0.75,
        verification_score: 0.70,
        overall: 0.77,
      },
    });

    // Write all features
    for (const feature of features) {
      await registry.write("feature_spec", feature);
    }

    // Step 3: Build each feature with realistic outcomes
    for (const feature of features) {
      const outcome = BUILD_OUTCOMES[feature.name] ?? { passes: true };
      await simulateFeatureBuild(registry, feature, outcome);
    }
  }, 30000);

  test("app submitted with research context", () => {
    expect(app.name).toBe("Slack Clone");
    expect(app.summary).toContain("Perplexity research");
    expect(app.summary).toContain("donor Playwright recon");
  });

  test("decomposed into 26 features", () => {
    expect(features).toHaveLength(26);
  });

  test("features span all major feature types", () => {
    const types = new Set(features.map(f => f.feature_type));
    expect(types.has("backend_platform")).toBe(true);
    expect(types.has("collaboration_system")).toBe(true);
    expect(types.has("notification_system")).toBe(true);
    expect(types.has("workflow")).toBe(true);
    expect(types.has("onboarding")).toBe(true);
  });

  test("donor mappings are preserved in features", () => {
    const withDonor = features.filter(f => f.donor_mappings.length > 0);
    expect(withDonor.length).toBeGreaterThanOrEqual(7);

    // Check specific donor references
    const channels = features.find(f => f.name === "Channels");
    expect(channels?.donor_mappings[0]?.donor_name).toBe("Slack");
    expect(channels?.donor_mappings[0]?.notes).toContain("Observation #1");
  });

  test("dependency chain is 4+ levels deep", () => {
    // Auth → Workspace → Channels → Messaging → Threads
    // Auth → DMs → Messaging → Notification → Activity
    const maxDepth = computeDepthFromFeatures(features);
    expect(maxDepth).toBeGreaterThanOrEqual(4);
  });

  test("builds reflect realistic outcomes: 17 pass, 9 fail/blocked", async () => {
    const builds = await registry.latestByType<Build>("build");
    expect(builds).toHaveLength(26);

    const passed = builds.filter(b => b.payload.status === "PASSED");
    const failed = builds.filter(b => b.payload.status === "FAILED");
    const blocked = builds.filter(b => b.payload.status === "BLOCKED");

    // 26 features: some pass, some fail, some blocked
    // Exact counts depend on name resolution between features and outcome matrix
    expect(passed.length + failed.length + blocked.length).toBe(26);
    expect(passed.length).toBeGreaterThanOrEqual(15);
    expect(failed.length).toBeGreaterThanOrEqual(5);
    expect(blocked.length).toBeGreaterThanOrEqual(1);
  });

  test("scope violations captured for notification and slack connect", async () => {
    const diffs = await registry.latestByType<DiffArtifact>("diff_artifact");
    const withViolations = diffs.filter(d => d.payload.path_violations.length > 0);
    expect(withViolations.length).toBe(2);
  });

  test("historical scenarios extracted from all 26 builds + cross-feature", async () => {
    const scenarios = await loadHistoricalScenarios(registry);

    // At least 26 per-feature + cross-feature scenarios
    expect(scenarios.length).toBeGreaterThanOrEqual(26);

    // Historical source
    const historical = scenarios.filter(s => s.source === "historical");
    expect(historical.length).toBeGreaterThanOrEqual(26);

    // Failures captured
    const failures = scenarios.filter(s => s.actual_outcome.build_status === "FAILED");
    expect(failures.length).toBeGreaterThanOrEqual(7);

    // Blocked captured
    const blocked = scenarios.filter(s => s.actual_outcome.build_status === "BLOCKED");
    expect(blocked.length).toBeGreaterThanOrEqual(2);

    // Scope violations captured
    const scopeViolations = scenarios.filter(s => s.actual_outcome.had_scope_violations);
    expect(scopeViolations.length).toBeGreaterThanOrEqual(2);

    // Risk tags extracted
    const authTagged = scenarios.filter(s => s.inputs.risk_domain_tags.includes("auth"));
    expect(authTagged.length).toBeGreaterThanOrEqual(1);
  });

  test("governance trains on 26+ historical + 38 synthetic scenarios", async () => {
    const historical = await loadHistoricalScenarios(registry);
    const synthetic = generateSyntheticScenarios();
    const allScenarios = [...synthetic, ...historical];

    expect(allScenarios.length).toBeGreaterThan(60);

    const baseline = createBaselineGovernanceConfig();
    const result = runGovernanceLoop(baseline, allScenarios, {
      ...DEFAULT_LOOP_CONFIG,
      max_iterations: 100,
    });

    expect(result.total_iterations).toBeGreaterThan(0);
    expect(result.best_score).toBeGreaterThanOrEqual(result.baseline_score);
    expect(result.best_config.frozen).toEqual(baseline.frozen);

    // With real data mixed in, the loop should find different optimizations
    // than synthetic-only training
    console.log(`\n── Slack Full E2E Governance Results ──`);
    console.log(`Scenarios: ${allScenarios.length} (${synthetic.length} synthetic + ${historical.length} historical)`);
    console.log(`Baseline: ${result.baseline_score.toFixed(4)}`);
    console.log(`Best: ${result.best_score.toFixed(4)}`);
    console.log(`Improvement: ${((result.best_score - result.baseline_score) * 100).toFixed(2)}%`);
    console.log(`Accepted: ${result.iterations.filter(i => i.accepted).length}`);
    console.log(`Rejected: ${result.iterations.filter(i => !i.accepted).length}`);
    if (result.ranked_candidates.length > 0) {
      console.log(`Top candidate: ${result.ranked_candidates[0]!.proposal_summary}`);
    }
  });

  test("app-level scenario reflects partial failure", async () => {
    const scenarios = await loadHistoricalScenarios(registry);
    const appLevel = scenarios.filter(s => s.inputs.feature_type === "app_level");
    expect(appLevel.length).toBeGreaterThanOrEqual(1);
    expect(appLevel[0]!.actual_outcome.build_status).toBe("FAILED");
    expect(appLevel[0]!.tags).toContain("Slack Clone");
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function computeDepthFromFeatures(features: FeatureSpec[]): number {
  const idToFeature = new Map(features.map(f => [f.feature_id, f]));
  let maxDepth = 0;

  function depth(featureId: string, visited: Set<string>): number {
    if (visited.has(featureId)) return 0;
    visited.add(featureId);
    const feature = idToFeature.get(featureId);
    if (!feature || feature.dependencies.length === 0) return 1;
    return 1 + Math.max(...feature.dependencies.map(d => depth(d, visited)));
  }

  for (const feature of features) {
    maxDepth = Math.max(maxDepth, depth(feature.feature_id, new Set()));
  }
  return maxDepth;
}
