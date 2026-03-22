import { AesPlatformRuntime, type AbortBuilderExecutionResult, type PrepareBuildInput, type PrepareBuildResult, type RecordBuilderArtifactsInput, type RecordTestRunInput, type RunValidatorsResult, type StartBuilderExecutionResult } from "../runtime";
import { type ManagedSession } from "../sessions";
import type { Bridge, Build, StoredRecord, TestRun } from "../types";
import type { CaptureBuilderOutputsResult } from "../builder";
export interface BuilderLaunchConfig {
    command: string;
    args: string[];
    cwd: string;
    prompt_preamble: string | null;
}
export interface RunBuilderWorkflowOptions {
    wait_for_completion?: boolean;
    timeout_ms?: number;
}
export interface RunBuilderWorkflowResult {
    started: StartBuilderExecutionResult;
    completed: ManagedSession | null;
    timed_out: boolean;
}
export interface BuildProgramFeatureInput {
    feature_id: string;
    intent: string;
    risk_domain_tags?: string[];
    depends_on_feature_ids?: string[];
    prepare: Omit<PrepareBuildInput, "submit_request" | "depends_on_bridge_ids" | "predecessor_build_ids" | "dependencies_satisfied">;
    diff?: Omit<RecordBuilderArtifactsInput, "build_id">;
    test_run?: Omit<RecordTestRunInput, "build_id">;
    run_validators?: boolean;
}
export interface BuildProgramInput {
    app_id?: string;
    requested_by: string;
    builder_timeout_ms?: number;
    stop_on_failure?: boolean;
    features: BuildProgramFeatureInput[];
}
export type BuildProgramFeatureState = "PASSED" | "FAILED" | "BLOCKED" | "ESCALATED" | "BUILDER_FAILED" | "AWAITING_EVIDENCE";
export interface BuildProgramFeatureResult {
    feature_id: string;
    depends_on_feature_ids: string[];
    build_id?: string;
    bridge_id?: string;
    state: BuildProgramFeatureState;
    message: string;
    prepare_result?: PrepareBuildResult;
    builder_result?: RunBuilderWorkflowResult;
    aborted_build?: AbortBuilderExecutionResult | null;
    diff_capture?: CaptureBuilderOutputsResult;
    test_run_record?: StoredRecord<TestRun>;
    validation?: RunValidatorsResult;
}
export interface PendingBuildProgramFeature {
    feature_id: string;
    depends_on_feature_ids: string[];
    reason: string;
}
export interface BuildProgramSummary {
    total_features: number;
    passed: number;
    failed: number;
    blocked: number;
    escalated: number;
    builder_failed: number;
    awaiting_evidence: number;
    pending: number;
}
export interface BuildProgramWorkflowResult {
    app_id: string | null;
    requested_by: string;
    program_state: "PASSED" | "FAILED" | "STOPPED";
    execution_order: string[];
    feature_results: BuildProgramFeatureResult[];
    pending_features: PendingBuildProgramFeature[];
    summary: BuildProgramSummary;
}
export declare function loadBuilderLaunchConfig(env?: NodeJS.ProcessEnv, cwd?: string): BuilderLaunchConfig;
export declare function buildBuilderPrompt(buildRecord: StoredRecord<Build>, bridgeRecord: StoredRecord<Bridge>, promptPreamble?: string | null): string;
export declare function renderBuilderArgs(config: BuilderLaunchConfig, buildRecord: StoredRecord<Build>, bridgeRecord: StoredRecord<Bridge>, prompt: string): string[];
export declare function verifyBuilderLaunchConfig(config: BuilderLaunchConfig, env?: NodeJS.ProcessEnv): Promise<{
    status: "ok" | "error";
    detail: string;
    metadata?: Record<string, unknown>;
}>;
export declare function startConfiguredBuilderExecution(runtime: AesPlatformRuntime, buildId: string, config: BuilderLaunchConfig): Promise<StartBuilderExecutionResult>;
export declare function runConfiguredBuilderWorkflow(runtime: AesPlatformRuntime, buildId: string, config: BuilderLaunchConfig, options?: RunBuilderWorkflowOptions): Promise<RunBuilderWorkflowResult>;
export declare function runBuildProgramWorkflow(runtime: AesPlatformRuntime, config: BuilderLaunchConfig, program: BuildProgramInput): Promise<BuildProgramWorkflowResult>;
//# sourceMappingURL=builder-launch.d.ts.map