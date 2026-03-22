"use strict";
/**
 * AES Bridge Layer — System Context Provider
 *
 * Provides the builder with existing system context so it builds
 * against what already exists instead of inventing parallel structures.
 *
 * Three context layers:
 *   1. Database context — Postgres schema + Neo4j graph model
 *   2. API context — existing HTTP routes and contracts
 *   3. Component context — existing TypeScript interfaces and boundaries
 *
 * The bridge compiler injects this context into the bridge so the
 * builder knows: what tables exist, what API routes exist, what
 * types/interfaces exist, and what the data model looks like.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPostgresContext = buildPostgresContext;
exports.buildNeo4jContext = buildNeo4jContext;
exports.buildApiContext = buildApiContext;
exports.buildComponentContext = buildComponentContext;
exports.buildSystemContext = buildSystemContext;
exports.serializeContextForBridge = serializeContextForBridge;
// ─── Context Builders ────────────────────────────────────────────────────────
/**
 * Build the core Postgres database context from the schema.
 */
function buildPostgresContext() {
    return {
        tables: [
            {
                name: "artifact_registry",
                description: "Append-only AES artifact store. Every row is immutable after INSERT.",
                columns: [
                    { name: "internal_id", type: "BIGSERIAL", nullable: false, description: "Auto-incrementing primary key" },
                    { name: "artifact_type", type: "TEXT", nullable: false, description: "Discriminant: request, bridge, build, validator_run, etc." },
                    { name: "artifact_id", type: "TEXT", nullable: false, description: "Logical artifact ID (e.g., BRG-xxx, BLD-xxx)" },
                    { name: "sequence_number", type: "INTEGER", nullable: false, description: "Monotonically increasing per (artifact_type, artifact_id)" },
                    { name: "payload", type: "JSONB", nullable: false, description: "Immutable JSON payload" },
                    { name: "written_at", type: "TIMESTAMPTZ", nullable: false, description: "Wall clock time of write" },
                ],
                primary_key: ["internal_id"],
                unique_constraints: ["(artifact_type, artifact_id, sequence_number)"],
            },
        ],
        views: [
            { name: "artifact_registry_latest", description: "Latest version of each artifact", base_table: "artifact_registry" },
            { name: "bridge_status_latest", description: "Current status of all bridges", base_table: "artifact_registry" },
            { name: "build_status_latest", description: "Current status of all builds", base_table: "artifact_registry" },
        ],
        constraints: [
            "No UPDATE or DELETE allowed — enforced by database trigger",
            "Every state change produces a new row with incremented sequence_number",
            "Queries for current state use MAX(sequence_number) or DISTINCT ON",
        ],
    };
}
/**
 * Build the Neo4j graph context from the live runtime seed.
 */
function buildNeo4jContext() {
    return {
        node_labels: [
            {
                label: "FeatureSpec",
                properties: [
                    { name: "feature_id", type: "string", required: true },
                    { name: "name", type: "string", required: true },
                    { name: "critical_domain", type: "boolean", required: false },
                    { name: "status", type: "string", required: true },
                    { name: "owner", type: "string", required: false },
                    { name: "authority_tier", type: "string", required: true },
                ],
                description: "A feature in the AES system",
            },
            {
                label: "RuntimeService",
                properties: [
                    { name: "service_id", type: "string", required: true },
                    { name: "name", type: "string", required: true },
                    { name: "entrypoint", type: "string", required: false },
                ],
                description: "A runtime service (registry, orchestrator, etc.)",
            },
            {
                label: "InterfaceSurface",
                properties: [
                    { name: "surface_id", type: "string", required: true },
                    { name: "name", type: "string", required: true },
                    { name: "type", type: "string", required: true },
                ],
                description: "An interface surface (HTTP, CLI, UI)",
            },
            {
                label: "SourceFile",
                properties: [
                    { name: "path", type: "string", required: true },
                    { name: "language", type: "string", required: true },
                    { name: "file_hash", type: "string", required: true },
                    { name: "line_count", type: "number", required: false },
                ],
                description: "A source file in the repository (code grounding)",
            },
            {
                label: "FeatureType",
                properties: [
                    { name: "feature_class", type: "string", required: true },
                    { name: "display_name", type: "string", required: true },
                ],
                description: "A canonical feature class (backend_platform, collaboration_system, etc.)",
            },
            {
                label: "PatternLibraryEntry",
                properties: [
                    { name: "pattern_name", type: "string", required: true },
                    { name: "summary", type: "string", required: true },
                    { name: "status", type: "string", required: true },
                ],
                description: "A reusable pattern derived from donor studies",
            },
            {
                label: "ValidatorBundle",
                properties: [
                    { name: "bundle_name", type: "string", required: true },
                    { name: "blocking_validators", type: "string[]", required: true },
                    { name: "advisory_validators", type: "string[]", required: false },
                ],
                description: "A set of validators for a feature class",
            },
            {
                label: "BridgePreset",
                properties: [
                    { name: "preset_name", type: "string", required: true },
                    { name: "required_outcomes", type: "string[]", required: true },
                    { name: "forbidden_shortcuts", type: "string[]", required: false },
                ],
                description: "Pre-configured bridge constraints for a feature class",
            },
        ],
        relationship_types: [
            { type: "IMPLEMENTS", from_label: "RuntimeService", to_label: "FeatureSpec", properties: [], description: "Service implements feature" },
            { type: "EXPOSES", from_label: "RuntimeService", to_label: "InterfaceSurface", properties: [], description: "Service exposes interface" },
            { type: "USES_FEATURE_TYPE", from_label: "FeatureSpec", to_label: "FeatureType", properties: [], description: "Feature uses a canonical feature class" },
            { type: "IMPORTS", from_label: "SourceFile", to_label: "SourceFile", properties: [{ name: "import_type", type: "string" }], description: "File imports another" },
            { type: "IMPLEMENTED_BY", from_label: "FeatureSpec", to_label: "SourceFile", properties: [{ name: "relationship_type", type: "string" }], description: "Feature implemented by source files" },
            { type: "VALIDATES_FEATURE", from_label: "ValidatorBundle", to_label: "FeatureType", properties: [], description: "Bundle validates feature type" },
            { type: "APPLIES_TO_FEATURE", from_label: "BridgePreset", to_label: "FeatureType", properties: [], description: "Preset applies to feature type" },
        ],
        indexes: [
            "CREATE INDEX IF NOT EXISTS idx_source_file_path ON SourceFile(path)",
            "CREATE INDEX IF NOT EXISTS idx_feature_spec_id ON FeatureSpec(feature_id)",
        ],
    };
}
/**
 * Build API context from the existing HTTP routes.
 */
function buildApiContext() {
    return {
        base_path: "/api",
        routes: [
            // Build workflow
            { method: "POST", path: "/build/prepare", description: "Prepare a build: snapshot, compile bridge, check freshness, evaluate policy, queue", request_shape: "PrepareBuildInput", response_shape: "PrepareBuildResult", category: "build_workflow" },
            { method: "POST", path: "/build/:buildId/run-builder", description: "Start supervised builder execution", request_shape: "{ timeout_ms?: number }", response_shape: "BuilderWorkflowResult", category: "build_workflow" },
            { method: "POST", path: "/build/:buildId/abort-builder", description: "Abort a running builder session", request_shape: "{}", response_shape: "{ build: Build }", category: "build_workflow" },
            { method: "POST", path: "/build/:buildId/record-diff", description: "Record diff metadata after build", request_shape: "RecordDiffPayload", response_shape: "{ diff: DiffArtifact }", category: "build_workflow" },
            { method: "POST", path: "/build/:buildId/record-test-run", description: "Record test run results", request_shape: "RecordTestRunPayload", response_shape: "{ test_run: TestRun }", category: "build_workflow" },
            { method: "POST", path: "/build/:buildId/run-validators", description: "Execute validators and finalize build", request_shape: "{}", response_shape: "ValidatorResult", category: "build_workflow" },
            // Build program
            { method: "POST", path: "/build-program/run", description: "Run a multi-feature build program in dependency order", request_shape: "BuildProgramInput", response_shape: "BuildProgramWorkflowResult", category: "build_program" },
            // Operator
            { method: "GET", path: "/health", description: "Runtime health check", request_shape: undefined, response_shape: "HealthResult", category: "operator" },
            { method: "GET", path: "/attention-queue", description: "Blocked builds, pending escalations, stale bridges", request_shape: undefined, response_shape: "AttentionQueue", category: "operator" },
            { method: "GET", path: "/dashboard", description: "Registry stats and recent artifacts", request_shape: undefined, response_shape: "DashboardData", category: "operator" },
            // Governance
            { method: "GET", path: "/governance/queue", description: "Pending escalation decisions", request_shape: undefined, response_shape: "EscalationRecord[]", category: "governance" },
            { method: "GET", path: "/governance/:escalationId", description: "Full decision context for an escalation", request_shape: undefined, response_shape: "GovernanceDecisionContext", category: "governance" },
            { method: "POST", path: "/governance/:escalationId/approve", description: "Approve an escalation", request_shape: "GovernanceDecisionPayload", response_shape: "GovernanceDecisionResult", category: "governance" },
            { method: "POST", path: "/governance/:escalationId/reject", description: "Reject an escalation", request_shape: "GovernanceDecisionPayload", response_shape: "GovernanceDecisionResult", category: "governance" },
            { method: "POST", path: "/governance/:escalationId/defer", description: "Defer an escalation", request_shape: "GovernanceDecisionPayload", response_shape: "GovernanceDecisionResult", category: "governance" },
            // App planning pipeline
            { method: "POST", path: "/app/intake", description: "Submit a new app for planning", request_shape: "AppIntakeInput", response_shape: "AppSpec", category: "app_planning" },
            { method: "POST", path: "/app/:id/research", description: "Run external research on an app", request_shape: "{ urls: string[] }", response_shape: "ResearchSummary", category: "app_planning" },
            { method: "POST", path: "/app/:id/decompose", description: "Decompose app into features", request_shape: "{ candidate_features: CandidateFeature[] }", response_shape: "DecomposeAppResult", category: "app_planning" },
            { method: "POST", path: "/app/:id/verify", description: "Verify feature specs", request_shape: "{}", response_shape: "VerificationReport", category: "app_planning" },
            { method: "POST", path: "/app/:id/promote", description: "Evaluate promotion gates", request_shape: "{}", response_shape: "PromotionResult", category: "app_planning" },
            { method: "POST", path: "/app/:id/seed", description: "Seed promoted specs into graph", request_shape: "{}", response_shape: "SeedResult", category: "app_planning" },
            { method: "POST", path: "/app/:id/build-program", description: "Generate and run build program for app", request_shape: "{ stop_on_failure?: boolean }", response_shape: "BuildProgramWorkflowResult", category: "app_planning" },
        ],
    };
}
/**
 * Build component/interface context from the existing TypeScript types.
 */
function buildComponentContext() {
    return {
        interfaces: [
            {
                name: "Bridge",
                file_path: "src/types/artifacts.ts",
                description: "The bridge contract between orchestrator and builder",
                fields: [
                    { name: "bridge_id", type: "string", optional: false },
                    { name: "build_id", type: "string", optional: false },
                    { name: "feature_id", type: "string", optional: false },
                    { name: "intent", type: "string", optional: false },
                    { name: "scope", type: "ScopeDefinition", optional: false },
                    { name: "read_scope", type: "ScopeDefinition", optional: false },
                    { name: "write_scope", type: "ScopeDefinition", optional: false },
                    { name: "constraints", type: "string[]", optional: false },
                    { name: "patterns", type: "string[]", optional: false },
                    { name: "anti_patterns", type: "string[]", optional: false },
                    { name: "acceptance_criteria", type: "AcceptanceCriterion[]", optional: false },
                    { name: "test_cases", type: "TestCase[]", optional: false },
                    { name: "confidence", type: "number", optional: false },
                    { name: "status", type: "BridgeStatus", optional: false },
                ],
            },
            {
                name: "Build",
                file_path: "src/types/artifacts.ts",
                description: "A build execution record",
                fields: [
                    { name: "build_id", type: "string", optional: false },
                    { name: "bridge_id", type: "string", optional: false },
                    { name: "feature_id", type: "string", optional: false },
                    { name: "status", type: "BuildStatus", optional: false },
                    { name: "blocked_reasons", type: "BlockedReason[]", optional: false },
                ],
            },
            {
                name: "FeatureSpec",
                file_path: "src/types/app-spec.ts",
                description: "A typed feature specification for decomposition and building",
                fields: [
                    { name: "feature_id", type: "string", optional: false },
                    { name: "name", type: "string", optional: false },
                    { name: "feature_type", type: "string", optional: false },
                    { name: "dependencies", type: "string[]", optional: false },
                    { name: "auth_requirements", type: "AuthRequirement[]", optional: false },
                    { name: "data_entities", type: "DataEntity[]", optional: false },
                    { name: "acceptance_criteria", type: "AcceptanceCriterion[]", optional: false },
                    { name: "confidence_summary", type: "SpecConfidenceSummary", optional: false },
                    { name: "promotion_status", type: "AppPromotionStatus", optional: false },
                ],
            },
            {
                name: "GovernanceConfig",
                file_path: "src/types/governance-types.ts",
                description: "Versioned governance configuration with trainable and frozen sections",
                fields: [
                    { name: "governance_config_id", type: "string", optional: false },
                    { name: "version", type: "number", optional: false },
                    { name: "trainable", type: "TrainableGovernance", optional: false },
                    { name: "frozen", type: "FrozenGovernance", optional: false },
                    { name: "promotion_status", type: "string", optional: false },
                ],
            },
        ],
        modules: [
            { name: "registry", file_path: "src/registry/", exports: ["ArtifactRegistry", "InMemoryStorage", "generateArtifactId"], description: "Append-only artifact storage" },
            { name: "policy", file_path: "src/policy/", exports: ["PolicyEngine", "evaluateConfidence", "evaluateHardVetoes"], description: "Confidence routing and hard veto evaluation" },
            { name: "bridge", file_path: "src/bridge/", exports: ["BridgeCompiler", "BridgeValidator", "resolveDonorBridgeInputs"], description: "Bridge compilation and validation" },
            { name: "orchestrator", file_path: "src/orchestrator/", exports: ["OrchestratorCore"], description: "Build lifecycle state machine" },
            { name: "governance", file_path: "src/governance/", exports: ["GovernanceGateway", "runGovernanceLoop", "loadHistoricalScenarios"], description: "Governance training and escalation handling" },
            { name: "planning", file_path: "src/planning/", exports: ["AppDecomposer", "evaluatePromotion", "generateBuildProgram", "matchAllFeatures"], description: "App decomposition and promotion" },
            { name: "intake", file_path: "src/intake/", exports: ["AppIntakeService", "RequestIntakeService"], description: "App and request intake" },
            { name: "runtime", file_path: "src/runtime/", exports: ["AesPlatformRuntime"], description: "Main runtime wiring all subsystems" },
        ],
        type_imports: [
            { from: "src/types/common", types: ["ArtifactType", "BridgeStatus", "BuildStatus", "ConfidenceBreakdown", "ConfidenceRoute", "HardVetoCode", "AuthorityTier", "AcceptanceCriterion", "TestCase", "ApiContract", "EventDefinition", "DbTouch", "ComponentBoundary"] },
            { from: "src/types/artifacts", types: ["Bridge", "Build", "ValidatorRun", "DiffArtifact", "TestRun", "WriteBackRecord", "Request", "GraphSnapshot", "EscalationRecord"] },
            { from: "src/types/app-spec", types: ["AppSpec", "FeatureSpec", "BackendSurface", "FrontendSurface", "AuthRequirement", "DataEntity", "DonorMapping"] },
            { from: "src/types/governance-types", types: ["GovernanceConfig", "ReplayScenario", "ReplayReport", "GovernanceProposal"] },
        ],
    };
}
// ─── Full System Context ─────────────────────────────────────────────────────
/**
 * Build the full system context for a given feature type.
 * This is what gets injected into the bridge for the builder.
 */
function buildSystemContext(featureType) {
    const postgres = buildPostgresContext();
    const neo4j = buildNeo4jContext();
    const api = buildApiContext();
    const components = buildComponentContext();
    // Feature-specific context based on feature type
    const featureSpecific = {};
    if (featureType) {
        // Add feature-type-specific hints
        switch (featureType) {
            case "payments_and_billing_verification":
                featureSpecific.storage_notes = [
                    "All payment state changes must be append-only artifacts",
                    "Use JSONB payload for payment-specific fields",
                    "Financial calculations must be auditable via artifact history",
                ];
                featureSpecific.api_notes = [
                    "Payment endpoints must validate webhook signatures",
                    "Idempotency keys required on all charge creation endpoints",
                ];
                break;
            case "collaboration_system":
                featureSpecific.storage_notes = [
                    "Messages are append-only — edits create new versions",
                    "Channel membership changes are recorded as artifacts",
                    "Real-time events flow through EventDefinition contracts",
                ];
                featureSpecific.api_notes = [
                    "WebSocket connections managed separately from REST endpoints",
                    "Presence updates are ephemeral — not stored as artifacts",
                ];
                break;
            case "notification_system":
                featureSpecific.storage_notes = [
                    "Notification preferences stored per-user per-channel",
                    "Delivery receipts are artifacts (append-only)",
                ];
                featureSpecific.api_notes = [
                    "Push notification delivery is async — use event system",
                    "Email digests are scheduled, not real-time",
                ];
                break;
            case "backend_platform":
                featureSpecific.storage_notes = [
                    "All admin actions must produce audit trail artifacts",
                    "Config changes are versioned via registry sequence_number",
                ];
                featureSpecific.api_notes = [
                    "Health endpoints must check all dependencies",
                    "Dashboard queries use artifact_registry_latest view",
                ];
                break;
            case "onboarding":
                featureSpecific.storage_notes = [
                    "Onboarding progress tracked as artifacts per user",
                    "Template instantiation creates real artifacts (not copies)",
                ];
                break;
            case "workflow":
                featureSpecific.storage_notes = [
                    "Workflow definitions are versioned artifacts",
                    "Execution runs produce artifact trails like builds",
                    "Trigger conditions evaluated against event stream",
                ];
                break;
        }
    }
    return {
        database: { postgres, neo4j },
        api,
        components,
        feature_specific: featureSpecific,
    };
}
/**
 * Serialize system context to a compact format suitable for bridge injection.
 * Strips unnecessary detail for the builder prompt.
 */
function serializeContextForBridge(context) {
    return {
        existing_database: {
            postgres_tables: context.database.postgres.tables.map(t => ({
                name: t.name,
                columns: t.columns.map(c => `${c.name} ${c.type}${c.nullable ? "" : " NOT NULL"}`),
                constraints: t.unique_constraints,
            })),
            postgres_views: context.database.postgres.views.map(v => v.name),
            postgres_rules: context.database.postgres.constraints,
            neo4j_labels: context.database.neo4j.node_labels.map(n => n.label),
            neo4j_relationships: context.database.neo4j.relationship_types.map(r => `(${r.from_label})-[:${r.type}]->(${r.to_label})`),
        },
        existing_api: {
            base_path: context.api.base_path,
            routes: context.api.routes.map(r => `${r.method} ${r.path} — ${r.description}`),
        },
        existing_types: context.components.type_imports.map(t => ({
            from: t.from,
            types: t.types,
        })),
        existing_modules: context.components.modules.map(m => ({
            name: m.name,
            path: m.file_path,
            exports: m.exports,
        })),
        feature_specific: context.feature_specific,
    };
}
//# sourceMappingURL=system-context-provider.js.map