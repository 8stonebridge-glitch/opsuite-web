import { ArtifactRegistry } from "../registry";
import { BridgeCompiler, BridgeValidator } from "../bridge";
import { FreshnessChecker, GraphSnapshotService, type GraphTruthAdapter } from "../graph";
import { PolicyEngine, type PolicyEvaluation } from "../policy";
import { OrchestratorCore, type AuthorizationResult } from "../orchestrator";
import { BuilderSessionAdapter, ScopeGuard, type CaptureBuilderOutputsInput, type CaptureBuilderOutputsResult, type ProtectedDomainRule } from "../builder";
import { ValidatorCoordinator, type ValidatorAdapter, type ValidatorFinalizationResult } from "../postbuild";
import { GovernanceGateway } from "../governance";
import { RequestIntakeService, type SubmitRequestInput } from "../intake";
import { OperatorConsoleService } from "../operator";
import { TelemetryService } from "../metrics";
import { ClaudeCodeSessionManager, type ManagedSession } from "../sessions";
import { HttpResearchGateway, type CaptureResearchFromUrlInput, type ResearchFetchResult } from "../research";
import { type ArtifactBlobStore } from "../adapters";
import type { AcceptanceCriterion, ApiContract, ArtifactRef, Bridge, Build, ComponentBoundary, ConfidenceBreakdown, DependencyRecord, DbTouch, DependencyType, EventDefinition, FreshnessCheck, GraphSnapshot, MetricRecord, Request, ScopeDefinition, StoredRecord, TestCase, TestFailure, TestRun, ValidatorRun } from "../types";
export interface RuntimeServiceOverrides {
    request_intake?: RequestIntakeService;
    snapshot_service?: GraphSnapshotService;
    freshness_checker?: FreshnessChecker;
    bridge_compiler?: BridgeCompiler;
    bridge_validator?: BridgeValidator;
    policy_engine?: PolicyEngine;
    orchestrator?: OrchestratorCore;
    scope_guard?: ScopeGuard;
    builder_session_adapter?: BuilderSessionAdapter;
    session_manager?: ClaudeCodeSessionManager;
    validator_coordinator?: ValidatorCoordinator;
    governance_gateway?: GovernanceGateway;
    operator_console?: OperatorConsoleService;
    telemetry_service?: TelemetryService;
    research_gateway?: HttpResearchGateway;
}
export interface AesPlatformRuntimeOptions {
    registry: ArtifactRegistry;
    truth_adapter: GraphTruthAdapter;
    blob_store?: ArtifactBlobStore;
    validator_adapters?: ValidatorAdapter[];
    protected_domains?: ProtectedDomainRule[];
    health_checks?: RuntimeHealthCheck[];
    now?: () => Date;
    services?: RuntimeServiceOverrides;
}
export interface RuntimeServices {
    request_intake: RequestIntakeService;
    snapshot_service: GraphSnapshotService;
    freshness_checker: FreshnessChecker;
    bridge_compiler: BridgeCompiler;
    bridge_validator: BridgeValidator;
    policy_engine: PolicyEngine;
    orchestrator: OrchestratorCore;
    scope_guard: ScopeGuard;
    builder_session_adapter: BuilderSessionAdapter;
    session_manager: ClaudeCodeSessionManager;
    validator_coordinator: ValidatorCoordinator;
    governance_gateway: GovernanceGateway;
    operator_console: OperatorConsoleService;
    telemetry_service: TelemetryService;
    research_gateway: HttpResearchGateway;
}
export interface PrepareBuildInput {
    request_id?: string;
    submit_request?: SubmitRequestInput;
    query_profile?: string;
    scope: ScopeDefinition;
    read_scope?: ScopeDefinition;
    write_scope?: ScopeDefinition;
    out_of_scope?: string[];
    constraints?: string[];
    patterns?: string[];
    anti_patterns?: string[];
    data_model?: Record<string, unknown>;
    api_contracts?: ApiContract[];
    events?: EventDefinition[];
    db_touches?: DbTouch[];
    component_boundaries?: ComponentBoundary[];
    read_scope_amendments?: string[];
    depends_on_bridge_ids?: string[];
    predecessor_build_ids?: string[];
    dependency_type?: DependencyType;
    acceptance_criteria?: AcceptanceCriterion[];
    test_cases?: TestCase[];
    confidence_breakdown: ConfidenceBreakdown;
    dependencies_satisfied?: boolean;
    artifact_refs?: ArtifactRef[];
    policy_overrides?: {
        critical_graph_truth_changed?: boolean;
        unresolved_validator_hard_fail?: boolean;
        critical_rule_contradiction?: boolean;
        invalid_bridge_boundary?: boolean;
    };
}
export interface PrepareBuildResult {
    request_record: StoredRecord<Request>;
    snapshot_record: StoredRecord<GraphSnapshot>;
    compiled_bridge_record: StoredRecord<Bridge>;
    freshness_record: StoredRecord<FreshnessCheck>;
    validated_bridge_record: StoredRecord<Bridge>;
    dependency_record?: StoredRecord<DependencyRecord>;
    policy_evaluation: PolicyEvaluation;
    build_record: StoredRecord<Build>;
    authorization: AuthorizationResult;
}
export interface StartBuilderExecutionInput {
    build_id: string;
    cwd: string;
    command: string;
    args?: string[];
    prompt?: string;
    env?: Record<string, string>;
    max_buffer_bytes?: number;
}
export interface StartBuilderExecutionResult {
    session: ManagedSession;
    build_record: StoredRecord<Build>;
    bridge_record: StoredRecord<Bridge>;
}
export interface RecordBuilderArtifactsInput extends Omit<CaptureBuilderOutputsInput, "blob_ref"> {
    diff_text?: string;
    diff_blob_name?: string;
}
export interface RecordTestRunInput {
    build_id: string;
    status: TestRun["status"];
    test_cases_run: number;
    passed: number;
    failed: number;
    skipped: number;
    failure_details?: TestFailure[];
    output_text?: string;
    output_blob_name?: string;
    artifact_refs?: ArtifactRef[];
}
export interface RunValidatorsResult {
    validator_runs: StoredRecord<ValidatorRun>[];
    finalization: ValidatorFinalizationResult;
    metric_records: StoredRecord<MetricRecord>[];
}
export interface RuntimeHealth {
    status: "ok" | "degraded";
    total_records: number | null;
    builder_sessions: number;
    pending_escalations: number | null;
    dependencies: RuntimeHealthDependency[];
}
export interface RuntimeHealthDependency {
    name: string;
    status: "ok" | "error";
    detail: string;
    metadata?: Record<string, unknown>;
}
export interface RuntimeHealthCheck {
    name: string;
    run: () => Promise<Omit<RuntimeHealthDependency, "name">>;
}
export interface CreateLocalRuntimeOptions extends Omit<AesPlatformRuntimeOptions, "registry" | "blob_store"> {
    registry?: ArtifactRegistry;
    artifact_store_root_dir?: string;
}
export interface AbortBuilderExecutionResult {
    session: ManagedSession | null;
    build_record: StoredRecord<Build>;
}
export declare class MissingRequestInputError extends Error {
    constructor();
}
export declare class BuilderExecutionStateError extends Error {
    constructor(buildId: string, status: Build["status"]);
}
export declare class AesPlatformRuntime {
    private readonly registryStore;
    private readonly now;
    readonly services: RuntimeServices;
    readonly blobStore: ArtifactBlobStore | null;
    readonly validatorAdapters: ValidatorAdapter[];
    readonly healthChecks: RuntimeHealthCheck[];
    constructor(registryStore: ArtifactRegistry, now: () => Date, services: RuntimeServices, validatorAdapters: ValidatorAdapter[], blobStore: ArtifactBlobStore | null, healthChecks: RuntimeHealthCheck[]);
    static create(options: AesPlatformRuntimeOptions): AesPlatformRuntime;
    prepareBuild(input: PrepareBuildInput): Promise<PrepareBuildResult>;
    startBuilderExecution(input: StartBuilderExecutionInput): Promise<StartBuilderExecutionResult>;
    waitForBuilderSession(sessionId: string, timeoutMs?: number): Promise<ManagedSession>;
    terminateBuilderSession(sessionId: string): Promise<ManagedSession>;
    abortBuilderExecution(buildId: string): Promise<AbortBuilderExecutionResult>;
    recordBuilderArtifacts(input: RecordBuilderArtifactsInput): Promise<CaptureBuilderOutputsResult>;
    recordTestRun(input: RecordTestRunInput): Promise<StoredRecord<TestRun>>;
    runValidators(buildId: string): Promise<RunValidatorsResult>;
    captureResearchFromUrl(input: CaptureResearchFromUrlInput): Promise<ResearchFetchResult>;
    health(): Promise<RuntimeHealth>;
    attentionQueue(options?: {
        current_graph_truth_hash?: string;
    }): Promise<import("../operator").AttentionQueue>;
    buildReplay(buildId: string): Promise<import("../operator").BuildReplay>;
    featureAudit(featureId: string): Promise<import("../operator").FeatureAudit>;
    get registry(): ArtifactRegistry;
    private resolveRequest;
    private captureMetrics;
}
export declare function createLocalPlatformRuntime(options: CreateLocalRuntimeOptions): AesPlatformRuntime;
//# sourceMappingURL=platform-runtime.d.ts.map