"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedCanonicalDonorAssets = seedCanonicalDonorAssets;
const PROMOTION_CONDITIONS = [
    "accepted donor packet or first-pass complete",
    "source components accepted",
    "feature class resolved",
    "validator bundle and bridge preset exist",
    "execution consumes only promoted canonical assets",
];
const FEATURE_TYPES = [
    {
        id: "workflow",
        node_id: "NODE-DONOR-FEATURE-TYPE-001",
        feature_class: "workflow",
        display_name: "Workflow",
        summary: "Stateful work execution with explicit transitions and detail views.",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
    },
    {
        id: "notification_system",
        node_id: "NODE-DONOR-FEATURE-TYPE-002",
        feature_class: "notification_system",
        display_name: "Notification System",
        summary: "Reason-aware activity and inbox flows with triage behavior.",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
    },
    {
        id: "payments_and_billing_verification",
        node_id: "NODE-DONOR-FEATURE-TYPE-003",
        feature_class: "payments_and_billing_verification",
        display_name: "Payments And Billing Verification",
        summary: "Billing recovery, operator diagnostics, and financial mode clarity.",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
    },
    {
        id: "collaboration_system",
        node_id: "NODE-DONOR-FEATURE-TYPE-004",
        feature_class: "collaboration_system",
        display_name: "Collaboration System",
        summary: "Shared collaboration shells with clear personal and team contexts.",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
    },
    {
        id: "onboarding",
        node_id: "NODE-DONOR-FEATURE-TYPE-005",
        feature_class: "onboarding",
        display_name: "Onboarding",
        summary: "Organization activation and post-auth context establishment.",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
    },
    {
        id: "backend_platform",
        node_id: "NODE-DONOR-FEATURE-TYPE-006",
        feature_class: "backend_platform",
        display_name: "Backend Platform",
        summary: "Operator surfaces, logs, health, and platform administration flows.",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
    },
];
const PATTERNS = [
    {
        id: "pattern-linear-work-item-detail",
        node_id: "NODE-DONOR-PATTERN-001",
        pattern_name: "Linear Work Item Detail",
        pattern_family: "workflow",
        pattern_type: "ui_model",
        summary: "Keeps state, metadata, collaboration, assignee, project, subscribers, and next actions attached to one work object.",
        confidence: "high",
        reuse_scope: "issue-style and work-item detail views",
        status: "accepted",
        created_at: "2026-03-21",
        updated_at: "2026-03-21",
        target_features: [
            "approval_workflow",
            "notification_system",
            "reporting drill-down",
        ],
        anti_patterns: [
            "do not split state and activity into unrelated screens",
            "do not conflate assignee and subscriber semantics",
        ],
        preferred_combinations: [
            "pattern-github-notification-triage",
            "pattern-clerk-org-activation",
        ],
        source_donors: ["Linear"],
        source_artifact_ids: [
            "linear-ui-005",
            "linear-ui-007",
            "linear-logic-004",
            "linear-logic-005",
            "linear-logic-007",
        ],
        evidence_refs: [
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-issue-detail.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-issue-in-progress.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-assignee-menu.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-project-menu.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/linear-auth-subscribers-menu.yml",
        ],
        accepted_components: [
            "linear-ui-005",
            "linear-ui-007",
            "linear-logic-004",
            "linear-logic-005",
            "linear-logic-007",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "pattern-github-notification-triage",
        node_id: "NODE-DONOR-PATTERN-002",
        pattern_name: "GitHub Notification Triage",
        pattern_family: "notification",
        pattern_type: "core_model",
        summary: "Keeps notifications reason-aware, triageable, and linked to the object and workflow that caused them.",
        confidence: "high",
        reuse_scope: "notification inboxes, activity feeds, review-linked alerts",
        status: "accepted",
        created_at: "2026-03-21",
        updated_at: "2026-03-21",
        target_features: [
            "notification_system",
            "approval_workflow",
            "qa_release_hardening",
        ],
        anti_patterns: [
            "do not deliver notifications without an explicit reason",
            "do not detach alerts from the work object that caused them",
        ],
        preferred_combinations: [
            "pattern-linear-work-item-detail",
            "pattern-slack-collaboration-shell",
        ],
        source_donors: ["GitHub"],
        source_artifact_ids: [
            "github-logic-001",
            "github-logic-002",
            "github-ui-002",
            "github-ui-003",
        ],
        evidence_refs: [
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/github-auth-notifications.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/github-auth-actions-run.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/github-auth-pr.yml",
            "https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications",
        ],
        accepted_components: [
            "github-logic-001",
            "github-logic-002",
            "github-ui-002",
            "github-ui-003",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "pattern-stripe-recovery-console",
        node_id: "NODE-DONOR-PATTERN-003",
        pattern_name: "Stripe Recovery Console",
        pattern_family: "billing",
        pattern_type: "ops_model",
        summary: "Decomposes failed-payment handling into visible metrics, retries, emails, automations, recovery methods, and decline causes inside one operator surface.",
        confidence: "high",
        reuse_scope: "billing recovery, payment exceptions, operator consoles",
        status: "accepted",
        created_at: "2026-03-21",
        updated_at: "2026-03-21",
        target_features: [
            "payments_and_billing_verification",
            "backend_platform",
            "launch_ops_layer",
        ],
        anti_patterns: [
            "do not hide failed-payment causes behind a single aggregate metric",
            "do not hide environment mode on financial operator surfaces",
        ],
        preferred_combinations: ["pattern-stripe-operator-shell"],
        source_donors: ["Stripe Dashboard"],
        source_artifact_ids: [
            "stripe-ui-003",
            "stripe-logic-003",
            "stripe-logic-004",
            "stripe-logic-005",
        ],
        evidence_refs: [
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/stripe-auth-revenue-recovery.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/stripe-auth-workbench-logs.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/stripe-auth-balances.yml",
        ],
        accepted_components: [
            "stripe-ui-003",
            "stripe-logic-003",
            "stripe-logic-004",
            "stripe-logic-005",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "pattern-slack-collaboration-shell",
        node_id: "NODE-DONOR-PATTERN-004",
        pattern_name: "Slack Collaboration Shell",
        pattern_family: "collaboration",
        pattern_type: "ui_model",
        summary: "Separates channels, DMs, activity, and personal self-space while preserving rich collaboration actions and quiet-state continuity.",
        confidence: "high",
        reuse_scope: "team collaboration shells, activity centers, personal draft spaces",
        status: "accepted",
        created_at: "2026-03-21",
        updated_at: "2026-03-21",
        target_features: [
            "notification_system",
            "collaboration_system",
            "app_shell",
        ],
        anti_patterns: [
            "do not merge direct and shared collaboration into one undifferentiated list",
            "do not let quiet states become blank dead ends",
        ],
        preferred_combinations: ["pattern-github-notification-triage"],
        source_donors: ["Slack"],
        source_artifact_ids: [
            "slack-ui-001",
            "slack-ui-002",
            "slack-ui-003",
            "slack-ui-004",
            "slack-logic-001",
            "slack-logic-002",
            "slack-logic-004",
        ],
        evidence_refs: [
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-channel-home.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-activity.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dms.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/slack-auth-dm-actions.yml",
        ],
        accepted_components: [
            "slack-ui-001",
            "slack-ui-002",
            "slack-ui-003",
            "slack-ui-004",
            "slack-logic-001",
            "slack-logic-002",
            "slack-logic-004",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "pattern-clerk-org-activation",
        node_id: "NODE-DONOR-PATTERN-005",
        pattern_name: "Clerk Organization Activation",
        pattern_family: "onboarding",
        pattern_type: "core_model",
        summary: "Makes post-auth setup, active organization context, role visibility, and switching or invitation flows explicit.",
        confidence: "high",
        reuse_scope: "organization-aware onboarding and membership activation",
        status: "accepted",
        created_at: "2026-03-21",
        updated_at: "2026-03-21",
        target_features: [
            "onboarding",
            "backend_platform",
            "shared_frontend_system",
        ],
        anti_patterns: [
            "do not hide active organization or role context after auth",
            "do not treat invite acceptance as the same thing as simple sign-in",
        ],
        preferred_combinations: ["pattern-linear-work-item-detail"],
        source_donors: ["Clerk"],
        source_artifact_ids: [
            "clerk-logic-001",
            "clerk-logic-002",
            "clerk-logic-003",
            "clerk-logic-004",
            "clerk-ui-003",
            "clerk-ui-005",
        ],
        evidence_refs: [
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-app-setup.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-apps.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/clerk-auth-switch-org.yml",
        ],
        accepted_components: [
            "clerk-logic-001",
            "clerk-logic-002",
            "clerk-logic-003",
            "clerk-logic-004",
            "clerk-ui-003",
            "clerk-ui-005",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "pattern-stripe-operator-shell",
        node_id: "NODE-DONOR-PATTERN-006",
        pattern_name: "Stripe Operator Shell",
        pattern_family: "operator_console",
        pattern_type: "ui_model",
        summary: "Separates money movement, billing modules, reports, and debugging tools inside one operator shell with visible environment mode.",
        confidence: "high",
        reuse_scope: "admin/operator dashboards and backend consoles",
        status: "accepted",
        created_at: "2026-03-21",
        updated_at: "2026-03-21",
        target_features: [
            "backend_platform",
            "launch_ops_layer",
            "qa_release_hardening",
        ],
        anti_patterns: [
            "do not hide mode or environment in operator contexts",
            "do not collapse billing, transactions, and debugging into one undifferentiated screen",
        ],
        preferred_combinations: ["pattern-stripe-recovery-console"],
        source_donors: ["Stripe Dashboard"],
        source_artifact_ids: [
            "stripe-ui-001",
            "stripe-ui-002",
            "stripe-logic-001",
            "stripe-logic-002",
            "stripe-logic-004",
        ],
        evidence_refs: [
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/stripe-auth-home.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/stripe-auth-balances.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/stripe-auth-billing-nav.yml",
            "/Users/sunday/Desktop/hopperpymcp/output/playwright/stripe-auth-workbench-logs.yml",
        ],
        accepted_components: [
            "stripe-ui-001",
            "stripe-ui-002",
            "stripe-logic-001",
            "stripe-logic-002",
            "stripe-logic-004",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: false,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
];
const VALIDATOR_BUNDLES = [
    {
        id: "bundle-work-item-detail",
        node_id: "NODE-DONOR-BUNDLE-001",
        bundle_name: "Work Item Detail Bundle",
        feature_class: "workflow",
        validator_ids: [
            "linear-validator-002",
            "linear-validator-004",
            "linear-validator-005",
            "linear-validator-008",
        ],
        blocking_validators: [
            "linear-validator-002",
            "linear-validator-004",
            "linear-validator-005",
            "linear-validator-008",
        ],
        advisory_validators: [],
        derived_from_patterns: ["pattern-linear-work-item-detail"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "bundle-notification-triage",
        node_id: "NODE-DONOR-BUNDLE-002",
        bundle_name: "Notification Triage Bundle",
        feature_class: "notification_system",
        validator_ids: [
            "github-validator-001",
            "github-validator-002",
            "slack-validator-002",
            "slack-validator-004",
        ],
        blocking_validators: [
            "github-validator-001",
            "github-validator-002",
            "slack-validator-002",
            "slack-validator-004",
        ],
        advisory_validators: [],
        derived_from_patterns: [
            "pattern-github-notification-triage",
            "pattern-slack-collaboration-shell",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "bundle-billing-recovery",
        node_id: "NODE-DONOR-BUNDLE-003",
        bundle_name: "Billing Recovery Bundle",
        feature_class: "payments_and_billing_verification",
        validator_ids: [
            "stripe-validator-001",
            "stripe-validator-002",
            "stripe-validator-003",
            "stripe-validator-004",
            "stripe-validator-005",
        ],
        blocking_validators: [
            "stripe-validator-001",
            "stripe-validator-002",
            "stripe-validator-003",
            "stripe-validator-004",
        ],
        advisory_validators: ["stripe-validator-005"],
        derived_from_patterns: [
            "pattern-stripe-recovery-console",
            "pattern-stripe-operator-shell",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "bundle-collaboration-shell",
        node_id: "NODE-DONOR-BUNDLE-004",
        bundle_name: "Collaboration Shell Bundle",
        feature_class: "collaboration_system",
        validator_ids: [
            "slack-validator-001",
            "slack-validator-002",
            "slack-validator-003",
            "slack-validator-004",
        ],
        blocking_validators: [
            "slack-validator-001",
            "slack-validator-002",
            "slack-validator-004",
        ],
        advisory_validators: ["slack-validator-003"],
        derived_from_patterns: ["pattern-slack-collaboration-shell"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "bundle-org-activation",
        node_id: "NODE-DONOR-BUNDLE-005",
        bundle_name: "Organization Activation Bundle",
        feature_class: "onboarding",
        validator_ids: [
            "clerk-validator-001",
            "clerk-validator-002",
            "clerk-validator-003",
            "clerk-validator-004",
        ],
        blocking_validators: [
            "clerk-validator-001",
            "clerk-validator-002",
            "clerk-validator-003",
        ],
        advisory_validators: ["clerk-validator-004"],
        derived_from_patterns: ["pattern-clerk-org-activation"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "bundle-operator-shell",
        node_id: "NODE-DONOR-BUNDLE-006",
        bundle_name: "Operator Shell Bundle",
        feature_class: "backend_platform",
        validator_ids: [
            "stripe-validator-001",
            "stripe-validator-002",
            "stripe-validator-004",
        ],
        blocking_validators: [
            "stripe-validator-001",
            "stripe-validator-002",
            "stripe-validator-004",
        ],
        advisory_validators: [],
        derived_from_patterns: ["pattern-stripe-operator-shell"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
];
const BRIDGE_PRESETS = [
    {
        id: "preset-work-item-detail",
        node_id: "NODE-DONOR-PRESET-001",
        preset_name: "Work Item Detail Preset",
        feature_class: "workflow",
        required_outcomes: [
            "work item detail shows state, metadata, activity, and next actions together",
            "ownership, project linkage, and subscribers remain distinct controls",
            "state changes are visible and auditable from the same object surface",
        ],
        forbidden_shortcuts: [
            "splitting state and activity into unrelated views",
            "collapsing assignee and follower semantics",
        ],
        required_validators: ["bundle-work-item-detail"],
        approved_surface_scope: [
            "work item detail",
            "status menus",
            "activity timeline",
        ],
        derived_from_patterns: ["pattern-linear-work-item-detail"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "preset-notification-inbox",
        node_id: "NODE-DONOR-PRESET-002",
        preset_name: "Notification Inbox Preset",
        feature_class: "notification_system",
        required_outcomes: [
            "notifications expose cause and reason",
            "triage actions remain visible in inbox or activity surfaces",
            "quiet states preserve filters and explanatory structure",
        ],
        forbidden_shortcuts: [
            "read/unread only without triage semantics",
            "alerts detached from source work object",
        ],
        required_validators: ["bundle-notification-triage"],
        approved_surface_scope: ["inbox", "activity", "notification settings"],
        derived_from_patterns: [
            "pattern-github-notification-triage",
            "pattern-slack-collaboration-shell",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "preset-billing-recovery",
        node_id: "NODE-DONOR-PRESET-003",
        preset_name: "Billing Recovery Preset",
        feature_class: "payments_and_billing_verification",
        required_outcomes: [
            "failed-payment handling separates retries, messages, automations, and decline causes",
            "mode remains visible across financial and debug surfaces",
            "logs and event activity remain filterable",
        ],
        forbidden_shortcuts: [
            "one-screen generic failure totals with no breakdown",
            "hidden sandbox or test mode",
        ],
        required_validators: ["bundle-billing-recovery"],
        approved_surface_scope: [
            "payment recovery",
            "balances",
            "observability console",
        ],
        derived_from_patterns: [
            "pattern-stripe-recovery-console",
            "pattern-stripe-operator-shell",
        ],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "preset-collaboration-shell",
        node_id: "NODE-DONOR-PRESET-004",
        preset_name: "Collaboration Shell Preset",
        feature_class: "collaboration_system",
        required_outcomes: [
            "channels, DMs, and activity are separate modes",
            "shared spaces expose invite, live collaboration, and search actions",
            "personal spaces support drafts or to-dos without polluting shared spaces",
        ],
        forbidden_shortcuts: [
            "one collapsed message stream for all collaboration modes",
            "quiet states with no filters or meaning",
        ],
        required_validators: ["bundle-collaboration-shell"],
        approved_surface_scope: [
            "workspace shell",
            "channel header",
            "activity view",
            "personal space",
        ],
        derived_from_patterns: ["pattern-slack-collaboration-shell"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "preset-org-onboarding",
        node_id: "NODE-DONOR-PRESET-005",
        preset_name: "Organization Onboarding Preset",
        feature_class: "onboarding",
        required_outcomes: [
            "post-auth landing keeps org and role context explicit",
            "switching or joining organizations is visible and intentional",
            "invite acceptance is treated as its own activation step",
        ],
        forbidden_shortcuts: [
            "dropping users into the app without active-context clarity",
            "hiding role or organization state after sign-in",
        ],
        required_validators: ["bundle-org-activation"],
        approved_surface_scope: [
            "post-auth landing",
            "org switcher",
            "invite acceptance",
        ],
        derived_from_patterns: ["pattern-clerk-org-activation"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "preset-operator-console",
        node_id: "NODE-DONOR-PRESET-006",
        preset_name: "Operator Console Preset",
        feature_class: "backend_platform",
        required_outcomes: [
            "operator shell separates financial or system domains from logs and diagnostics",
            "environment mode is explicit",
            "filters support resource, date, and status drill-in",
        ],
        forbidden_shortcuts: [
            "debug data hidden behind secondary tools by default",
            "production/test ambiguity",
        ],
        required_validators: ["bundle-operator-shell"],
        approved_surface_scope: ["dashboards", "logs", "event views", "health views"],
        derived_from_patterns: ["pattern-stripe-operator-shell"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
];
const SCENARIO_PACKS = [
    {
        id: "scenario-quiet-inbox",
        node_id: "NODE-DONOR-SCENARIO-001",
        scenario_name: "Quiet Inbox",
        feature_class: "notification_system",
        source_feature_class: "notification_system",
        setup_conditions: [
            "no unread notifications",
            "inbox/activity surface reachable",
        ],
        expected_states: [
            "caught-up or no-notifications state",
            "filters remain visible",
        ],
        expected_actions: [
            "toggle unread filter",
            "navigate back to source work",
        ],
        expected_validators: ["slack-validator-002", "slack-validator-004"],
        derived_from_donors: ["Slack", "Linear"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "scenario-blocked-transition",
        node_id: "NODE-DONOR-SCENARIO-002",
        scenario_name: "Blocked Transition",
        feature_class: "workflow",
        source_feature_class: "approval_workflow",
        setup_conditions: [
            "work item in a state with an unavailable or gated transition",
            "required field, permission, or approval missing",
        ],
        expected_states: [
            "current state visible",
            "blocked move visible or explained",
        ],
        expected_actions: [
            "inspect blocked transition",
            "satisfy missing requirement",
            "retry transition",
        ],
        expected_validators: ["linear-validator-005", "github-validator-002"],
        derived_from_donors: ["Linear", "Jira", "GitHub"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "scenario-failed-payment-recovery",
        node_id: "NODE-DONOR-SCENARIO-003",
        scenario_name: "Failed Payment Recovery",
        feature_class: "payments_and_billing_verification",
        source_feature_class: "payments_and_billing_verification",
        setup_conditions: [
            "payment or invoice in failed state",
            "recovery tooling available",
        ],
        expected_states: [
            "failure cause visible",
            "retry/email/automation options visible",
            "mode visible",
        ],
        expected_actions: [
            "inspect decline cause",
            "inspect retry policy",
            "inspect recovery communication path",
        ],
        expected_validators: [
            "stripe-validator-001",
            "stripe-validator-003",
            "stripe-validator-004",
        ],
        derived_from_donors: ["Stripe Dashboard"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "scenario-invite-acceptance",
        node_id: "NODE-DONOR-SCENARIO-004",
        scenario_name: "Invite Acceptance",
        feature_class: "onboarding",
        source_feature_class: "onboarding",
        setup_conditions: [
            "pending invite exists",
            "user not yet active in target org",
        ],
        expected_states: [
            "invite context visible",
            "org and role context visible after acceptance",
        ],
        expected_actions: [
            "open invite",
            "accept invite",
            "land in active org context",
        ],
        expected_validators: [
            "clerk-validator-001",
            "clerk-validator-002",
            "clerk-validator-003",
        ],
        derived_from_donors: ["Clerk"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "scenario-collaboration-handoff",
        node_id: "NODE-DONOR-SCENARIO-005",
        scenario_name: "Collaboration Handoff",
        feature_class: "collaboration_system",
        source_feature_class: "collaboration_system",
        setup_conditions: [
            "shared channel or thread exists",
            "at least one teammate can be invited or mentioned",
        ],
        expected_states: [
            "channel/shared-space actions visible",
            "direct space remains distinct",
        ],
        expected_actions: [
            "invite collaborator",
            "search in collaboration surface",
            "open direct space or personal space",
        ],
        expected_validators: ["slack-validator-001", "slack-validator-003"],
        derived_from_donors: ["Slack"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
    {
        id: "scenario-operator-log-triage",
        node_id: "NODE-DONOR-SCENARIO-006",
        scenario_name: "Operator Log Triage",
        feature_class: "backend_platform",
        source_feature_class: "backend_platform",
        setup_conditions: ["logs or events visible", "filter controls available"],
        expected_states: [
            "mode visible",
            "filters visible",
            "empty or populated results understandable",
        ],
        expected_actions: [
            "filter by date",
            "filter by status",
            "clear or reset filters",
        ],
        expected_validators: ["stripe-validator-001", "stripe-validator-004"],
        derived_from_donors: ["Stripe Dashboard"],
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true,
        promotion_conditions: [...PROMOTION_CONDITIONS],
    },
];
const FEATURE_BINDINGS = [
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-001",
        feature_id: "FEAT-AES-REAL-001",
        feature_type_id: "backend_platform",
    },
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-002",
        feature_id: "FEAT-AES-REAL-002",
        feature_type_id: "backend_platform",
    },
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-003",
        feature_id: "FEAT-AES-REAL-003",
        feature_type_id: "backend_platform",
    },
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-004",
        feature_id: "FEAT-AES-REAL-004",
        feature_type_id: "backend_platform",
    },
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-005",
        feature_id: "FEAT-AES-REAL-005",
        feature_type_id: "backend_platform",
    },
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-006",
        feature_id: "FEAT-AES-REAL-006",
        feature_type_id: "collaboration_system",
    },
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-007",
        feature_id: "FEAT-AES-REAL-007",
        feature_type_id: "notification_system",
    },
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-008",
        feature_id: "FEAT-AES-REAL-008",
        feature_type_id: "onboarding",
    },
    {
        edge_id: "EDGE-DONOR-FEATURE-BINDING-009",
        feature_id: "FEAT-AES-REAL-009",
        feature_type_id: "workflow",
    },
];
const PATTERN_BUNDLE_EDGES = PATTERNS.flatMap((pattern) => VALIDATOR_BUNDLES.filter((bundle) => bundle.derived_from_patterns.includes(pattern.id)).map((bundle, index) => ({
    edge_id: `EDGE-DONOR-PATTERN-BUNDLE-${pattern.id}-${index + 1}`,
    from_id: pattern.id,
    to_id: bundle.id,
})));
const PATTERN_PRESET_EDGES = PATTERNS.flatMap((pattern) => BRIDGE_PRESETS.filter((preset) => preset.derived_from_patterns.includes(pattern.id)).map((preset, index) => ({
    edge_id: `EDGE-DONOR-PATTERN-PRESET-${pattern.id}-${index + 1}`,
    from_id: pattern.id,
    to_id: preset.id,
})));
const PATTERN_SCENARIO_EDGES = [
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-001",
        from_id: "pattern-github-notification-triage",
        to_id: "scenario-quiet-inbox",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-002",
        from_id: "pattern-slack-collaboration-shell",
        to_id: "scenario-quiet-inbox",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-003",
        from_id: "pattern-linear-work-item-detail",
        to_id: "scenario-blocked-transition",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-004",
        from_id: "pattern-github-notification-triage",
        to_id: "scenario-blocked-transition",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-005",
        from_id: "pattern-stripe-recovery-console",
        to_id: "scenario-failed-payment-recovery",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-006",
        from_id: "pattern-stripe-operator-shell",
        to_id: "scenario-failed-payment-recovery",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-007",
        from_id: "pattern-clerk-org-activation",
        to_id: "scenario-invite-acceptance",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-008",
        from_id: "pattern-linear-work-item-detail",
        to_id: "scenario-invite-acceptance",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-009",
        from_id: "pattern-slack-collaboration-shell",
        to_id: "scenario-collaboration-handoff",
    },
    {
        edge_id: "EDGE-DONOR-PATTERN-SCENARIO-010",
        from_id: "pattern-stripe-operator-shell",
        to_id: "scenario-operator-log-triage",
    },
];
async function seedNodes(executor, label, rows) {
    if (rows.length === 0) {
        return;
    }
    await executor.run(`
      UNWIND $rows AS row
      MERGE (node:${label} {id: row.id})
      SET node += row
    `, { rows });
}
async function seedEdges(executor, relationship, edges) {
    if (edges.length === 0) {
        return;
    }
    await executor.run(`
      UNWIND $edges AS edge
      MATCH (from {id: edge.from_id})
      MATCH (to {id: edge.to_id})
      MERGE (from)-[rel:${relationship} {edge_id: edge.edge_id}]->(to)
      SET rel += {
        source: "donor-canonical",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL"
      }
    `, { edges });
}
async function seedCanonicalDonorAssets(executor) {
    await seedNodes(executor, "FeatureType", FEATURE_TYPES);
    await seedNodes(executor, "PatternLibraryEntry", PATTERNS);
    await seedNodes(executor, "ValidatorBundle", VALIDATOR_BUNDLES);
    await seedNodes(executor, "BridgePreset", BRIDGE_PRESETS);
    await seedNodes(executor, "ScenarioPack", SCENARIO_PACKS);
    await seedEdges(executor, "REQUIRES_VALIDATOR_BUNDLE", PATTERN_BUNDLE_EDGES);
    await seedEdges(executor, "FEEDS_BRIDGE_PRESET", PATTERN_PRESET_EDGES);
    await seedEdges(executor, "HAS_SCENARIO_PACK", PATTERN_SCENARIO_EDGES);
    await executor.run(`
      UNWIND $bundles AS bundle
      MATCH (node:ValidatorBundle {id: bundle.id})
      MATCH (featureType:FeatureType {id: bundle.feature_class})
      MERGE (node)-[rel:VALIDATES_FEATURE {edge_id: "EDGE-DONOR-BUNDLE-FEATURE-" + bundle.id}]->(featureType)
      SET rel += {
        source: "donor-canonical",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true
      }
    `, { bundles: VALIDATOR_BUNDLES });
    await executor.run(`
      UNWIND $presets AS preset
      MATCH (node:BridgePreset {id: preset.id})
      MATCH (featureType:FeatureType {id: preset.feature_class})
      MERGE (node)-[rel:APPLIES_TO_FEATURE {edge_id: "EDGE-DONOR-PRESET-FEATURE-" + preset.id}]->(featureType)
      SET rel += {
        source: "donor-canonical",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true
      }
    `, { presets: BRIDGE_PRESETS });
    await executor.run(`
      UNWIND $scenarios AS scenario
      MATCH (node:ScenarioPack {id: scenario.id})
      MATCH (featureType:FeatureType {id: scenario.feature_class})
      MERGE (node)-[rel:TESTS_FEATURE {edge_id: "EDGE-DONOR-SCENARIO-FEATURE-" + scenario.id}]->(featureType)
      SET rel += {
        source: "donor-canonical",
        source_layer: "DERIVED",
        promotion_stage: "CANONICAL",
        authority_tier: "CANONICAL",
        enforceable: true
      }
    `, { scenarios: SCENARIO_PACKS });
    await executor.run(`
      UNWIND $bindings AS binding
      MATCH (feature:FeatureSpec {feature_id: binding.feature_id})
      MATCH (featureType:FeatureType {id: binding.feature_type_id})
      MERGE (feature)-[rel:USES_FEATURE_TYPE {edge_id: binding.edge_id}]->(featureType)
      SET rel += {
        source: "donor-canonical",
        source_layer: "EXECUTION",
        promotion_stage: "EXECUTION_READY",
        enforceable: true
      }
    `, { bindings: FEATURE_BINDINGS });
    return {
        feature_types_seeded: FEATURE_TYPES.length,
        patterns_seeded: PATTERNS.length,
        validator_bundles_seeded: VALIDATOR_BUNDLES.length,
        bridge_presets_seeded: BRIDGE_PRESETS.length,
        scenario_packs_seeded: SCENARIO_PACKS.length,
        feature_bindings_seeded: FEATURE_BINDINGS.length,
    };
}
//# sourceMappingURL=donor-asset-seed.js.map