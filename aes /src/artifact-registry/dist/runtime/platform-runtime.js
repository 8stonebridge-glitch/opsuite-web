"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AesPlatformRuntime = exports.BuilderExecutionStateError = exports.MissingRequestInputError = void 0;
exports.createLocalPlatformRuntime = createLocalPlatformRuntime;
const registry_1 = require("../registry");
const bridge_1 = require("../bridge");
const graph_1 = require("../graph");
const policy_1 = require("../policy");
const orchestrator_1 = require("../orchestrator");
const builder_1 = require("../builder");
const postbuild_1 = require("../postbuild");
const governance_1 = require("../governance");
const intake_1 = require("../intake");
const operator_1 = require("../operator");
const metrics_1 = require("../metrics");
const sessions_1 = require("../sessions");
const research_1 = require("../research");
const adapters_1 = require("../adapters");
function mergeArtifactRefs(...groups) {
    const seen = new Set();
    const merged = [];
    for (const group of groups) {
        for (const artifactRef of group) {
            const key = `${artifactRef.artifact_type}::${artifactRef.artifact_id}::${artifactRef.role}`;
            if (!seen.has(key)) {
                seen.add(key);
                merged.push(artifactRef);
            }
        }
    }
    return merged;
}
function requestArtifactRefs(request) {
    return [
        {
            artifact_type: "request",
            artifact_id: request.request_id,
            role: "evidence_source",
        },
    ];
}
function makeDependencyRecordInput(bridge, featureId, dependenciesSatisfied, artifactRefs, nowIso) {
    return {
        dependency_record_id: (0, registry_1.generateArtifactId)("dependency_record"),
        bridge_id: bridge.bridge_id,
        feature_id: featureId,
        evaluated_at: nowIso,
        depends_on_bridge_ids: bridge.depends_on_bridge_ids,
        predecessor_build_ids: bridge.predecessor_build_ids,
        dependency_type: bridge.dependency_type,
        all_satisfied: dependenciesSatisfied,
        unsatisfied_dependencies: dependenciesSatisfied
            ? []
            : [
                ...bridge.depends_on_bridge_ids.map((bridgeId) => ({
                    bridge_id: bridgeId,
                    reason: `Upstream bridge ${bridgeId} is not yet satisfied.`,
                })),
                ...bridge.predecessor_build_ids.map((buildId) => ({
                    build_id: buildId,
                    reason: `Predecessor build ${buildId} has not reached a passing terminal state.`,
                })),
            ],
        artifact_refs: artifactRefs,
    };
}
function mergeUniqueStrings(...groups) {
    const seen = new Set();
    const merged = [];
    for (const group of groups) {
        if (!group) {
            continue;
        }
        for (const value of group) {
            if (typeof value !== "string" || value.trim() === "" || seen.has(value)) {
                continue;
            }
            seen.add(value);
            merged.push(value);
        }
    }
    return merged;
}
function mergeAcceptanceCriteria(...groups) {
    const seen = new Set();
    const merged = [];
    for (const group of groups) {
        if (!group) {
            continue;
        }
        for (const criterion of group) {
            const key = `${criterion.id}::${criterion.description}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            merged.push(criterion);
        }
    }
    return merged;
}
function mergeTestCases(...groups) {
    const seen = new Set();
    const merged = [];
    for (const group of groups) {
        if (!group) {
            continue;
        }
        for (const testCase of group) {
            const key = `${testCase.id}::${testCase.description}`;
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            merged.push(testCase);
        }
    }
    return merged;
}
async function ensureRequestAccepted(intake, requestRecord) {
    if (requestRecord.payload.status === "PENDING") {
        return intake.acceptRequest(requestRecord.payload.request_id);
    }
    return requestRecord;
}
async function ensureRequestProcessing(intake, requestRecord) {
    if (requestRecord.payload.status === "ACCEPTED") {
        return intake.markProcessing(requestRecord.payload.request_id);
    }
    return requestRecord;
}
class MissingRequestInputError extends Error {
    constructor() {
        super("prepareBuild requires either request_id or submit_request input.");
        this.name = "MissingRequestInputError";
    }
}
exports.MissingRequestInputError = MissingRequestInputError;
class BuilderExecutionStateError extends Error {
    constructor(buildId, status) {
        super(`Build ${buildId} must be AUTHORIZED before a builder session starts, got ${status}.`);
        this.name = "BuilderExecutionStateError";
    }
}
exports.BuilderExecutionStateError = BuilderExecutionStateError;
class AesPlatformRuntime {
    constructor(registryStore, now, services, validatorAdapters, blobStore, healthChecks) {
        this.registryStore = registryStore;
        this.now = now;
        this.services = services;
        this.validatorAdapters = validatorAdapters;
        this.blobStore = blobStore;
        this.healthChecks = healthChecks;
    }
    static create(options) {
        const now = options.now ?? (() => new Date());
        const scopeGuard = options.services?.scope_guard ??
            new builder_1.ScopeGuard(options.registry, { protected_domains: options.protected_domains }, now);
        const governanceGateway = options.services?.governance_gateway ??
            new governance_1.GovernanceGateway(options.registry, { scope_guard: scopeGuard }, now);
        const services = {
            request_intake: options.services?.request_intake ??
                new intake_1.RequestIntakeService(options.registry, now),
            snapshot_service: options.services?.snapshot_service ??
                new graph_1.GraphSnapshotService(options.registry, options.truth_adapter, now),
            freshness_checker: options.services?.freshness_checker ??
                new graph_1.FreshnessChecker(options.registry, options.truth_adapter, now),
            bridge_compiler: options.services?.bridge_compiler ??
                new bridge_1.BridgeCompiler(options.registry, now),
            bridge_validator: options.services?.bridge_validator ?? new bridge_1.BridgeValidator(options.registry),
            policy_engine: options.services?.policy_engine ?? new policy_1.PolicyEngine(),
            orchestrator: options.services?.orchestrator ??
                new orchestrator_1.OrchestratorCore(options.registry, now),
            scope_guard: scopeGuard,
            builder_session_adapter: options.services?.builder_session_adapter ??
                new builder_1.BuilderSessionAdapter(options.registry, scopeGuard, now),
            session_manager: options.services?.session_manager ?? new sessions_1.ClaudeCodeSessionManager(),
            validator_coordinator: options.services?.validator_coordinator ??
                new postbuild_1.ValidatorCoordinator(options.registry, now),
            governance_gateway: governanceGateway,
            operator_console: options.services?.operator_console ??
                new operator_1.OperatorConsoleService(options.registry, {
                    governance_gateway: governanceGateway,
                }),
            telemetry_service: options.services?.telemetry_service ??
                new metrics_1.TelemetryService(options.registry, now),
            research_gateway: options.services?.research_gateway ??
                new research_1.HttpResearchGateway(options.registry, globalThis.fetch, now),
        };
        return new AesPlatformRuntime(options.registry, now, services, options.validator_adapters ?? [
            new adapters_1.DiffScopeValidator(),
            new adapters_1.TestRunOutcomeValidator(),
        ], options.blob_store ?? null, options.health_checks ?? []);
    }
    async prepareBuild(input) {
        const requestRecord = await this.resolveRequest(input);
        const mergedRefs = mergeArtifactRefs(requestArtifactRefs(requestRecord.payload), input.artifact_refs ?? []);
        const buildId = (0, registry_1.generateArtifactId)("build");
        const snapshotRecord = await this.services.snapshot_service.capture({
            feature_id: requestRecord.payload.feature_id,
            query_profile: input.query_profile,
            artifact_refs: mergedRefs,
        });
        const donorBridgeInputs = (0, bridge_1.resolveDonorBridgeInputs)(requestRecord.payload.feature_id, snapshotRecord.payload.referenced_nodes, snapshotRecord.payload.referenced_edges);
        const bridgeRefs = mergeArtifactRefs(mergedRefs, [
            {
                artifact_type: "graph_snapshot",
                artifact_id: snapshotRecord.payload.graph_snapshot_id,
                role: "graph_snapshot_source",
            },
        ]);
        const compiledBridgeRecord = await this.services.bridge_compiler.compile({
            build_id: buildId,
            feature_id: requestRecord.payload.feature_id,
            graph_snapshot: snapshotRecord.payload,
            intent: requestRecord.payload.intent,
            scope: input.scope,
            out_of_scope: input.out_of_scope,
            constraints: mergeUniqueStrings(donorBridgeInputs.constraints, input.constraints),
            patterns: mergeUniqueStrings(donorBridgeInputs.patterns, input.patterns),
            anti_patterns: mergeUniqueStrings(donorBridgeInputs.anti_patterns, input.anti_patterns),
            data_model: donorBridgeInputs.execution_payload.feature_class
                ? {
                    ...(input.data_model ?? {}),
                    donor_execution_payload: donorBridgeInputs.execution_payload,
                }
                : input.data_model,
            api_contracts: input.api_contracts,
            events: input.events,
            db_touches: input.db_touches,
            component_boundaries: input.component_boundaries,
            read_scope: input.read_scope ?? input.scope,
            write_scope: input.write_scope ?? input.scope,
            read_scope_amendments: input.read_scope_amendments,
            depends_on_bridge_ids: input.depends_on_bridge_ids,
            predecessor_build_ids: input.predecessor_build_ids,
            dependency_type: input.dependency_type,
            acceptance_criteria: mergeAcceptanceCriteria(donorBridgeInputs.acceptance_criteria, input.acceptance_criteria),
            test_cases: mergeTestCases(donorBridgeInputs.test_cases, input.test_cases),
            confidence_breakdown: input.confidence_breakdown,
            artifact_refs: bridgeRefs,
        });
        const freshness = await this.services.freshness_checker.checkBridge(compiledBridgeRecord.payload, bridgeRefs);
        const dependenciesSatisfied = input.dependencies_satisfied ?? true;
        const validatedBridgeResult = await this.services.bridge_validator.validate({
            bridge: compiledBridgeRecord.payload,
            dependencies_satisfied: dependenciesSatisfied,
            is_fresh: freshness.is_fresh,
        });
        const validatedBridgeRecord = validatedBridgeResult.record;
        const dependencyRecord = validatedBridgeRecord.payload.dependency_type !== "NONE" ||
            validatedBridgeRecord.payload.depends_on_bridge_ids.length > 0 ||
            validatedBridgeRecord.payload.predecessor_build_ids.length > 0
            ? await this.registry.write("dependency_record", makeDependencyRecordInput(validatedBridgeRecord.payload, requestRecord.payload.feature_id, dependenciesSatisfied, mergeArtifactRefs(bridgeRefs, [
                {
                    artifact_type: "bridge",
                    artifact_id: validatedBridgeRecord.payload.bridge_id,
                    role: "dependency_source",
                },
            ]), this.now().toISOString()))
            : undefined;
        const policy = this.services.policy_engine.evaluate({
            bridge: validatedBridgeRecord.payload,
            is_fresh: freshness.is_fresh,
            dependencies_satisfied: dependenciesSatisfied,
            confidence_breakdown: input.confidence_breakdown,
            ...input.policy_overrides,
        });
        await this.services.orchestrator.queueBuild({
            build_id: buildId,
            bridge_id: validatedBridgeRecord.payload.bridge_id,
            feature_id: requestRecord.payload.feature_id,
            artifact_refs: mergeArtifactRefs(bridgeRefs, [
                {
                    artifact_type: "bridge",
                    artifact_id: validatedBridgeRecord.payload.bridge_id,
                    role: "constraint_source",
                },
            ]),
        });
        const authorization = await this.services.orchestrator.authorizeBuild(buildId, {
            policy_evaluation: {
                hard_blocked: policy.hard_blocked,
                final_route: policy.final_route,
                hard_vetoes: policy.hard_vetoes,
            },
        });
        return {
            request_record: requestRecord,
            snapshot_record: snapshotRecord,
            compiled_bridge_record: compiledBridgeRecord,
            freshness_record: freshness.record,
            validated_bridge_record: validatedBridgeRecord,
            dependency_record: dependencyRecord,
            policy_evaluation: policy,
            build_record: authorization.build_record,
            authorization,
        };
    }
    async startBuilderExecution(input) {
        const buildRecord = await this.registry.read("build", input.build_id);
        if (buildRecord.payload.status !== "AUTHORIZED") {
            throw new BuilderExecutionStateError(buildRecord.payload.build_id, buildRecord.payload.status);
        }
        const bridgeRecord = await this.registry.read("bridge", buildRecord.payload.bridge_id);
        const session = await this.services.session_manager.startBuilderSession({
            build_record: buildRecord,
            bridge_record: bridgeRecord,
            cwd: input.cwd,
            command: input.command,
            args: input.args,
            prompt: input.prompt,
            env: input.env,
            max_buffer_bytes: input.max_buffer_bytes,
        });
        const runningBuildRecord = await this.services.orchestrator.markBuildRunningByBuilder(buildRecord.payload.build_id, session.session_id);
        return {
            session,
            build_record: runningBuildRecord,
            bridge_record: bridgeRecord,
        };
    }
    waitForBuilderSession(sessionId, timeoutMs) {
        return this.services.session_manager.waitForBuilderSession(sessionId, timeoutMs);
    }
    terminateBuilderSession(sessionId) {
        return this.services.session_manager.terminateBuilderSession(sessionId);
    }
    async abortBuilderExecution(buildId) {
        const buildRecord = await this.registry.read("build", buildId);
        let terminatedSession = null;
        if (buildRecord.payload.builder_session_id) {
            try {
                terminatedSession = await this.services.session_manager.terminateBuilderSession(buildRecord.payload.builder_session_id);
            }
            catch (error) {
                if (!(error instanceof sessions_1.ManagedSessionNotFoundError)) {
                    throw error;
                }
            }
        }
        const latestBuildRecord = await this.registry.read("build", buildId);
        if (latestBuildRecord.payload.status !== "RUNNING") {
            return {
                session: terminatedSession,
                build_record: latestBuildRecord,
            };
        }
        return {
            session: terminatedSession,
            build_record: await this.services.orchestrator.markBuildFailed(buildId),
        };
    }
    async recordBuilderArtifacts(input) {
        let blobRef = null;
        if (this.blobStore && input.diff_text) {
            blobRef = await this.blobStore.writeText("builder-diffs", input.diff_blob_name ?? `${input.build_id}-diff.patch`, input.diff_text);
        }
        return this.services.builder_session_adapter.captureOutputs({
            build_id: input.build_id,
            changed_files: input.changed_files,
            interface_touches: input.interface_touches,
            blob_ref: blobRef,
            artifact_refs: input.artifact_refs,
        });
    }
    async recordTestRun(input) {
        const buildRecord = await this.registry.read("build", input.build_id);
        const bridgeRecord = await this.registry.read("bridge", buildRecord.payload.bridge_id);
        let blobRef = null;
        if (this.blobStore && input.output_text) {
            blobRef = await this.blobStore.writeText("test-runs", input.output_blob_name ?? `${input.build_id}-test-output.txt`, input.output_text);
        }
        return this.registry.write("test_run", {
            test_run_id: (0, registry_1.generateArtifactId)("test_run"),
            build_id: buildRecord.payload.build_id,
            bridge_id: bridgeRecord.payload.bridge_id,
            feature_id: buildRecord.payload.feature_id,
            executed_at: this.now().toISOString(),
            test_cases_run: input.test_cases_run,
            passed: input.passed,
            failed: input.failed,
            skipped: input.skipped,
            status: input.status,
            failure_details: input.failure_details ?? [],
            blob_ref: blobRef,
            artifact_refs: mergeArtifactRefs(buildRecord.payload.artifact_refs, [
                {
                    artifact_type: "build",
                    artifact_id: buildRecord.payload.build_id,
                    role: "test_source",
                },
                {
                    artifact_type: "bridge",
                    artifact_id: bridgeRecord.payload.bridge_id,
                    role: "test_source",
                },
            ], input.artifact_refs ?? []),
        });
    }
    async runValidators(buildId) {
        const execution = await this.services.validator_coordinator.executeValidators(buildId, this.validatorAdapters);
        const buildRecord = await this.registry.read("build", buildId);
        const metricRecords = await this.captureMetrics(buildRecord.payload.feature_id, buildId);
        return {
            validator_runs: execution.validator_runs,
            finalization: execution.finalization,
            metric_records: metricRecords,
        };
    }
    captureResearchFromUrl(input) {
        return this.services.research_gateway.captureFromUrl(input);
    }
    async health() {
        const dependencies = await Promise.all(this.healthChecks.map(async (check) => {
            try {
                return {
                    name: check.name,
                    ...(await check.run()),
                };
            }
            catch (error) {
                return {
                    name: check.name,
                    status: "error",
                    detail: error instanceof Error ? error.message : String(error),
                };
            }
        }));
        let totalRecords = null;
        let pendingEscalations = null;
        try {
            totalRecords = await this.registry.totalRecords();
        }
        catch (error) {
            dependencies.push({
                name: "registry_totals",
                status: "error",
                detail: error instanceof Error ? error.message : String(error),
            });
        }
        try {
            pendingEscalations = (await this.services.governance_gateway.pendingDecisionQueue()).length;
        }
        catch (error) {
            dependencies.push({
                name: "governance_queue",
                status: "error",
                detail: error instanceof Error ? error.message : String(error),
            });
        }
        const status = totalRecords === null ||
            pendingEscalations === null ||
            dependencies.some((dependency) => dependency.status === "error")
            ? "degraded"
            : "ok";
        return {
            status,
            total_records: totalRecords,
            builder_sessions: this.services.session_manager.listBuilderSessions().length,
            pending_escalations: pendingEscalations,
            dependencies,
        };
    }
    attentionQueue(options = {}) {
        return this.services.operator_console.attentionQueue(options);
    }
    buildReplay(buildId) {
        return this.services.operator_console.buildReplay(buildId);
    }
    featureAudit(featureId) {
        return this.services.operator_console.featureAudit(featureId);
    }
    get registry() {
        return this.registryStore;
    }
    async resolveRequest(input) {
        let requestRecord;
        if (input.request_id) {
            requestRecord = await this.registry.read("request", input.request_id);
        }
        else if (input.submit_request) {
            requestRecord = await this.services.request_intake.submitRequest(input.submit_request);
        }
        else {
            throw new MissingRequestInputError();
        }
        requestRecord = await ensureRequestAccepted(this.services.request_intake, requestRecord);
        requestRecord = await ensureRequestProcessing(this.services.request_intake, requestRecord);
        return requestRecord;
    }
    async captureMetrics(featureId, buildId) {
        const buildMetrics = await this.services.telemetry_service.captureBuildMetrics(buildId);
        const featureMetrics = await this.services.telemetry_service.captureFeatureMetrics(featureId);
        return [...buildMetrics, ...featureMetrics];
    }
}
exports.AesPlatformRuntime = AesPlatformRuntime;
function createLocalPlatformRuntime(options) {
    return AesPlatformRuntime.create({
        ...options,
        registry: options.registry ?? new registry_1.ArtifactRegistry(new registry_1.InMemoryStorage()),
        blob_store: options.artifact_store_root_dir
            ? new adapters_1.LocalFileArtifactStore(options.artifact_store_root_dir)
            : undefined,
    });
}
//# sourceMappingURL=platform-runtime.js.map