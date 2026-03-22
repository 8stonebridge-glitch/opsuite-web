import {
  ArtifactRegistry,
  InMemoryStorage,
  generateArtifactId,
} from "../registry";
import {
  BridgeCompiler,
  BridgeValidator,
  resolveDonorBridgeInputs,
} from "../bridge";
import {
  FreshnessChecker,
  GraphSnapshotService,
  type GraphTruthAdapter,
} from "../graph";
import { PolicyEngine, type PolicyEvaluation } from "../policy";
import { OrchestratorCore, type AuthorizationResult } from "../orchestrator";
import {
  BuilderSessionAdapter,
  ScopeGuard,
  type CaptureBuilderOutputsInput,
  type CaptureBuilderOutputsResult,
  type ProtectedDomainRule,
} from "../builder";
import {
  ValidatorCoordinator,
  type ValidatorAdapter,
  type ValidatorFinalizationResult,
} from "../postbuild";
import { GovernanceGateway } from "../governance";
import { RequestIntakeService, type SubmitRequestInput } from "../intake";
import { OperatorConsoleService } from "../operator";
import { TelemetryService } from "../metrics";
import {
  ClaudeCodeSessionManager,
  type ManagedSession,
  ManagedSessionNotFoundError,
} from "../sessions";
import {
  HttpResearchGateway,
  type CaptureResearchFromUrlInput,
  type ResearchFetchResult,
} from "../research";
import {
  DiffScopeValidator,
  LocalFileArtifactStore,
  TestRunOutcomeValidator,
  type ArtifactBlobStore,
} from "../adapters";
import type {
  AcceptanceCriterion,
  ApiContract,
  ArtifactRef,
  Bridge,
  Build,
  ComponentBoundary,
  ConfidenceBreakdown,
  DependencyRecord,
  DbTouch,
  DependencyType,
  EventDefinition,
  FreshnessCheck,
  GraphSnapshot,
  MetricRecord,
  Request,
  ScopeDefinition,
  StoredRecord,
  TestCase,
  TestFailure,
  TestRun,
  ValidatorRun,
} from "../types";

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

export interface RecordBuilderArtifactsInput
  extends Omit<CaptureBuilderOutputsInput, "blob_ref"> {
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

export interface CreateLocalRuntimeOptions
  extends Omit<AesPlatformRuntimeOptions, "registry" | "blob_store"> {
  registry?: ArtifactRegistry;
  artifact_store_root_dir?: string;
}

export interface AbortBuilderExecutionResult {
  session: ManagedSession | null;
  build_record: StoredRecord<Build>;
}

function mergeArtifactRefs(...groups: ArtifactRef[][]): ArtifactRef[] {
  const seen = new Set<string>();
  const merged: ArtifactRef[] = [];

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

function requestArtifactRefs(request: Request): ArtifactRef[] {
  return [
    {
      artifact_type: "request",
      artifact_id: request.request_id,
      role: "evidence_source",
    },
  ];
}

function makeDependencyRecordInput(
  bridge: Bridge,
  featureId: string,
  dependenciesSatisfied: boolean,
  artifactRefs: ArtifactRef[],
  nowIso: string
): DependencyRecord {
  return {
    dependency_record_id: generateArtifactId("dependency_record"),
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

function mergeUniqueStrings(
  ...groups: Array<ReadonlyArray<string> | null | undefined>
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

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

function mergeAcceptanceCriteria(
  ...groups: Array<ReadonlyArray<AcceptanceCriterion> | null | undefined>
): AcceptanceCriterion[] {
  const seen = new Set<string>();
  const merged: AcceptanceCriterion[] = [];

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

function mergeTestCases(
  ...groups: Array<ReadonlyArray<TestCase> | null | undefined>
): TestCase[] {
  const seen = new Set<string>();
  const merged: TestCase[] = [];

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

async function ensureRequestAccepted(
  intake: RequestIntakeService,
  requestRecord: StoredRecord<Request>
): Promise<StoredRecord<Request>> {
  if (requestRecord.payload.status === "PENDING") {
    return intake.acceptRequest(requestRecord.payload.request_id);
  }

  return requestRecord;
}

async function ensureRequestProcessing(
  intake: RequestIntakeService,
  requestRecord: StoredRecord<Request>
): Promise<StoredRecord<Request>> {
  if (requestRecord.payload.status === "ACCEPTED") {
    return intake.markProcessing(requestRecord.payload.request_id);
  }

  return requestRecord;
}

export class MissingRequestInputError extends Error {
  constructor() {
    super("prepareBuild requires either request_id or submit_request input.");
    this.name = "MissingRequestInputError";
  }
}

export class BuilderExecutionStateError extends Error {
  constructor(buildId: string, status: Build["status"]) {
    super(
      `Build ${buildId} must be AUTHORIZED before a builder session starts, got ${status}.`
    );
    this.name = "BuilderExecutionStateError";
  }
}

export class AesPlatformRuntime {
  readonly services: RuntimeServices;
  readonly blobStore: ArtifactBlobStore | null;
  readonly validatorAdapters: ValidatorAdapter[];
  readonly healthChecks: RuntimeHealthCheck[];

  constructor(
    private readonly registryStore: ArtifactRegistry,
    private readonly now: () => Date,
    services: RuntimeServices,
    validatorAdapters: ValidatorAdapter[],
    blobStore: ArtifactBlobStore | null,
    healthChecks: RuntimeHealthCheck[]
  ) {
    this.services = services;
    this.validatorAdapters = validatorAdapters;
    this.blobStore = blobStore;
    this.healthChecks = healthChecks;
  }

  static create(options: AesPlatformRuntimeOptions): AesPlatformRuntime {
    const now = options.now ?? (() => new Date());
    const scopeGuard =
      options.services?.scope_guard ??
      new ScopeGuard(
        options.registry,
        { protected_domains: options.protected_domains },
        now
      );
    const governanceGateway =
      options.services?.governance_gateway ??
      new GovernanceGateway(
        options.registry,
        { scope_guard: scopeGuard },
        now
      );
    const services: RuntimeServices = {
      request_intake:
        options.services?.request_intake ??
        new RequestIntakeService(options.registry, now),
      snapshot_service:
        options.services?.snapshot_service ??
        new GraphSnapshotService(options.registry, options.truth_adapter, now),
      freshness_checker:
        options.services?.freshness_checker ??
        new FreshnessChecker(options.registry, options.truth_adapter, now),
      bridge_compiler:
        options.services?.bridge_compiler ??
        new BridgeCompiler(options.registry, now),
      bridge_validator:
        options.services?.bridge_validator ?? new BridgeValidator(options.registry),
      policy_engine: options.services?.policy_engine ?? new PolicyEngine(),
      orchestrator:
        options.services?.orchestrator ??
        new OrchestratorCore(options.registry, now),
      scope_guard: scopeGuard,
      builder_session_adapter:
        options.services?.builder_session_adapter ??
        new BuilderSessionAdapter(options.registry, scopeGuard, now),
      session_manager:
        options.services?.session_manager ?? new ClaudeCodeSessionManager(),
      validator_coordinator:
        options.services?.validator_coordinator ??
        new ValidatorCoordinator(options.registry, now),
      governance_gateway: governanceGateway,
      operator_console:
        options.services?.operator_console ??
        new OperatorConsoleService(options.registry, {
          governance_gateway: governanceGateway,
        }),
      telemetry_service:
        options.services?.telemetry_service ??
        new TelemetryService(options.registry, now),
      research_gateway:
        options.services?.research_gateway ??
        new HttpResearchGateway(
          options.registry,
          globalThis.fetch as typeof globalThis.fetch,
          now
        ),
    };

    return new AesPlatformRuntime(
      options.registry,
      now,
      services,
      options.validator_adapters ?? [
        new DiffScopeValidator(),
        new TestRunOutcomeValidator(),
      ],
      options.blob_store ?? null,
      options.health_checks ?? []
    );
  }

  async prepareBuild(input: PrepareBuildInput): Promise<PrepareBuildResult> {
    const requestRecord = await this.resolveRequest(input);
    const mergedRefs = mergeArtifactRefs(
      requestArtifactRefs(requestRecord.payload),
      input.artifact_refs ?? []
    );
    const buildId = generateArtifactId("build");

    const snapshotRecord = await this.services.snapshot_service.capture({
      feature_id: requestRecord.payload.feature_id,
      query_profile: input.query_profile,
      artifact_refs: mergedRefs,
    });
    const donorBridgeInputs = resolveDonorBridgeInputs(
      requestRecord.payload.feature_id,
      snapshotRecord.payload.referenced_nodes,
      snapshotRecord.payload.referenced_edges
    );
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
      constraints: mergeUniqueStrings(
        donorBridgeInputs.constraints,
        input.constraints
      ),
      patterns: mergeUniqueStrings(donorBridgeInputs.patterns, input.patterns),
      anti_patterns: mergeUniqueStrings(
        donorBridgeInputs.anti_patterns,
        input.anti_patterns
      ),
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
      acceptance_criteria: mergeAcceptanceCriteria(
        donorBridgeInputs.acceptance_criteria,
        input.acceptance_criteria
      ),
      test_cases: mergeTestCases(
        donorBridgeInputs.test_cases,
        input.test_cases
      ),
      confidence_breakdown: input.confidence_breakdown,
      artifact_refs: bridgeRefs,
    });
    const freshness = await this.services.freshness_checker.checkBridge(
      compiledBridgeRecord.payload,
      bridgeRefs
    );
    const dependenciesSatisfied = input.dependencies_satisfied ?? true;
    const validatedBridgeResult = await this.services.bridge_validator.validate({
      bridge: compiledBridgeRecord.payload,
      dependencies_satisfied: dependenciesSatisfied,
      is_fresh: freshness.is_fresh,
    });
    const validatedBridgeRecord = validatedBridgeResult.record;
    const dependencyRecord =
      validatedBridgeRecord.payload.dependency_type !== "NONE" ||
      validatedBridgeRecord.payload.depends_on_bridge_ids.length > 0 ||
      validatedBridgeRecord.payload.predecessor_build_ids.length > 0
        ? await this.registry.write(
            "dependency_record",
            makeDependencyRecordInput(
              validatedBridgeRecord.payload,
              requestRecord.payload.feature_id,
              dependenciesSatisfied,
              mergeArtifactRefs(bridgeRefs, [
                {
                  artifact_type: "bridge",
                  artifact_id: validatedBridgeRecord.payload.bridge_id,
                  role: "dependency_source",
                },
              ]),
              this.now().toISOString()
            )
          )
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

  async startBuilderExecution(
    input: StartBuilderExecutionInput
  ): Promise<StartBuilderExecutionResult> {
    const buildRecord = await this.registry.read<Build>("build", input.build_id);
    if (buildRecord.payload.status !== "AUTHORIZED") {
      throw new BuilderExecutionStateError(
        buildRecord.payload.build_id,
        buildRecord.payload.status
      );
    }

    const bridgeRecord = await this.registry.read<Bridge>(
      "bridge",
      buildRecord.payload.bridge_id
    );
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
    const runningBuildRecord =
      await this.services.orchestrator.markBuildRunningByBuilder(
        buildRecord.payload.build_id,
        session.session_id
      );

    return {
      session,
      build_record: runningBuildRecord,
      bridge_record: bridgeRecord,
    };
  }

  waitForBuilderSession(
    sessionId: string,
    timeoutMs?: number
  ): Promise<ManagedSession> {
    return this.services.session_manager.waitForBuilderSession(sessionId, timeoutMs);
  }

  terminateBuilderSession(sessionId: string): Promise<ManagedSession> {
    return this.services.session_manager.terminateBuilderSession(sessionId);
  }

  async abortBuilderExecution(
    buildId: string
  ): Promise<AbortBuilderExecutionResult> {
    const buildRecord = await this.registry.read<Build>("build", buildId);
    let terminatedSession: ManagedSession | null = null;

    if (buildRecord.payload.builder_session_id) {
      try {
        terminatedSession = await this.services.session_manager.terminateBuilderSession(
          buildRecord.payload.builder_session_id
        );
      } catch (error) {
        if (!(error instanceof ManagedSessionNotFoundError)) {
          throw error;
        }
      }
    }

    const latestBuildRecord = await this.registry.read<Build>("build", buildId);
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

  async recordBuilderArtifacts(
    input: RecordBuilderArtifactsInput
  ): Promise<CaptureBuilderOutputsResult> {
    let blobRef: string | null = null;
    if (this.blobStore && input.diff_text) {
      blobRef = await this.blobStore.writeText(
        "builder-diffs",
        input.diff_blob_name ?? `${input.build_id}-diff.patch`,
        input.diff_text
      );
    }

    return this.services.builder_session_adapter.captureOutputs({
      build_id: input.build_id,
      changed_files: input.changed_files,
      interface_touches: input.interface_touches,
      blob_ref: blobRef,
      artifact_refs: input.artifact_refs,
    });
  }

  async recordTestRun(
    input: RecordTestRunInput
  ): Promise<StoredRecord<TestRun>> {
    const buildRecord = await this.registry.read<Build>("build", input.build_id);
    const bridgeRecord = await this.registry.read<Bridge>(
      "bridge",
      buildRecord.payload.bridge_id
    );
    let blobRef: string | null = null;
    if (this.blobStore && input.output_text) {
      blobRef = await this.blobStore.writeText(
        "test-runs",
        input.output_blob_name ?? `${input.build_id}-test-output.txt`,
        input.output_text
      );
    }

    return this.registry.write("test_run", {
      test_run_id: generateArtifactId("test_run"),
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
      artifact_refs: mergeArtifactRefs(
        buildRecord.payload.artifact_refs,
        [
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
        ],
        input.artifact_refs ?? []
      ),
    });
  }

  async runValidators(buildId: string): Promise<RunValidatorsResult> {
    const execution = await this.services.validator_coordinator.executeValidators(
      buildId,
      this.validatorAdapters
    );
    const buildRecord = await this.registry.read<Build>("build", buildId);
    const metricRecords = await this.captureMetrics(
      buildRecord.payload.feature_id,
      buildId
    );

    return {
      validator_runs: execution.validator_runs,
      finalization: execution.finalization,
      metric_records: metricRecords,
    };
  }

  captureResearchFromUrl(
    input: CaptureResearchFromUrlInput
  ): Promise<ResearchFetchResult> {
    return this.services.research_gateway.captureFromUrl(input);
  }

  async health(): Promise<RuntimeHealth> {
    const dependencies = await Promise.all(
      this.healthChecks.map(async (check): Promise<RuntimeHealthDependency> => {
        try {
          return {
            name: check.name,
            ...(await check.run()),
          };
        } catch (error) {
          return {
            name: check.name,
            status: "error",
            detail: error instanceof Error ? error.message : String(error),
          };
        }
      })
    );
    let totalRecords: number | null = null;
    let pendingEscalations: number | null = null;

    try {
      totalRecords = await this.registry.totalRecords();
    } catch (error) {
      dependencies.push({
        name: "registry_totals",
        status: "error",
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    try {
      pendingEscalations = (
        await this.services.governance_gateway.pendingDecisionQueue()
      ).length;
    } catch (error) {
      dependencies.push({
        name: "governance_queue",
        status: "error",
        detail: error instanceof Error ? error.message : String(error),
      });
    }

    const status =
      totalRecords === null ||
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

  attentionQueue(options: {
    current_graph_truth_hash?: string;
  } = {}) {
    return this.services.operator_console.attentionQueue(options);
  }

  buildReplay(buildId: string) {
    return this.services.operator_console.buildReplay(buildId);
  }

  featureAudit(featureId: string) {
    return this.services.operator_console.featureAudit(featureId);
  }

  get registry(): ArtifactRegistry {
    return this.registryStore;
  }

  private async resolveRequest(
    input: PrepareBuildInput
  ): Promise<StoredRecord<Request>> {
    let requestRecord: StoredRecord<Request>;

    if (input.request_id) {
      requestRecord = await this.registry.read<Request>("request", input.request_id);
    } else if (input.submit_request) {
      requestRecord = await this.services.request_intake.submitRequest(
        input.submit_request
      );
    } else {
      throw new MissingRequestInputError();
    }

    requestRecord = await ensureRequestAccepted(
      this.services.request_intake,
      requestRecord
    );
    requestRecord = await ensureRequestProcessing(
      this.services.request_intake,
      requestRecord
    );

    return requestRecord;
  }

  private async captureMetrics(
    featureId: string,
    buildId: string
  ): Promise<StoredRecord<MetricRecord>[]> {
    const buildMetrics = await this.services.telemetry_service.captureBuildMetrics(
      buildId
    );
    const featureMetrics =
      await this.services.telemetry_service.captureFeatureMetrics(featureId);

    return [...buildMetrics, ...featureMetrics];
  }
}

export function createLocalPlatformRuntime(
  options: CreateLocalRuntimeOptions
): AesPlatformRuntime {
  return AesPlatformRuntime.create({
    ...options,
    registry: options.registry ?? new ArtifactRegistry(new InMemoryStorage()),
    blob_store: options.artifact_store_root_dir
      ? new LocalFileArtifactStore(options.artifact_store_root_dir)
      : undefined,
  });
}
