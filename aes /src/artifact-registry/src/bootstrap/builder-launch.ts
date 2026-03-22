import { constants, promises as fs } from "node:fs";
import path from "node:path";
import {
  AesPlatformRuntime,
  type AbortBuilderExecutionResult,
  type PrepareBuildInput,
  type PrepareBuildResult,
  type RecordBuilderArtifactsInput,
  type RecordTestRunInput,
  type RunValidatorsResult,
  type StartBuilderExecutionResult,
} from "../runtime";
import {
  ManagedSessionTimeoutError,
  type ManagedSession,
} from "../sessions";
import type {
  Bridge,
  Build,
  StoredRecord,
  TestRun,
} from "../types";
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
  prepare: Omit<
    PrepareBuildInput,
    | "submit_request"
    | "depends_on_bridge_ids"
    | "predecessor_build_ids"
    | "dependencies_satisfied"
  >;
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

export type BuildProgramFeatureState =
  | "PASSED"
  | "FAILED"
  | "BLOCKED"
  | "ESCALATED"
  | "BUILDER_FAILED"
  | "AWAITING_EVIDENCE";

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

interface BuilderArgContext {
  prompt: string;
  build_id: string;
  bridge_id: string;
  feature_id: string;
  cwd: string;
}

function parseJsonArgs(
  value: string | undefined,
  fallback: string[]
): string[] {
  if (!value) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      Array.isArray(parsed) &&
      parsed.every((entry) => typeof entry === "string")
    ) {
      return parsed;
    }
  } catch (error) {
    throw new Error(
      `AES_BUILDER_ARGS_JSON must be a JSON array of strings: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  throw new Error("AES_BUILDER_ARGS_JSON must be a JSON array of strings.");
}

export function loadBuilderLaunchConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): BuilderLaunchConfig {
  const command = env.AES_BUILDER_COMMAND?.trim() || "claude";

  return {
    command,
    args: parseJsonArgs(env.AES_BUILDER_ARGS_JSON, ["-p", "{{prompt}}"]),
    cwd: env.AES_BUILDER_CWD
      ? path.resolve(cwd, env.AES_BUILDER_CWD)
      : cwd,
    prompt_preamble: env.AES_BUILDER_PROMPT_PREAMBLE?.trim() || null,
  };
}

export function buildBuilderPrompt(
  buildRecord: StoredRecord<Build>,
  bridgeRecord: StoredRecord<Bridge>,
  promptPreamble: string | null = null
): string {
  const instructions = [
    promptPreamble ??
      "You are the AES builder worker. Execute only the bridge below, stay within AES_READ_SCOPE and AES_WRITE_SCOPE, and finish with a concise summary of what changed.",
    `Build ID: ${buildRecord.payload.build_id}`,
    `Bridge ID: ${bridgeRecord.payload.bridge_id}`,
    `Feature ID: ${bridgeRecord.payload.feature_id}`,
    "",
    "Bridge JSON:",
    JSON.stringify(bridgeRecord.payload, null, 2),
  ];

  return instructions.join("\n");
}

function renderArgTemplate(
  template: string,
  context: BuilderArgContext
): string {
  return [
    ["{{prompt}}", context.prompt],
    ["{{build_id}}", context.build_id],
    ["{{bridge_id}}", context.bridge_id],
    ["{{feature_id}}", context.feature_id],
    ["{{cwd}}", context.cwd],
  ].reduce(
    (rendered, [needle, value]) => rendered.split(needle).join(value),
    template
  );
}

export function renderBuilderArgs(
  config: BuilderLaunchConfig,
  buildRecord: StoredRecord<Build>,
  bridgeRecord: StoredRecord<Bridge>,
  prompt: string
): string[] {
  const context: BuilderArgContext = {
    prompt,
    build_id: buildRecord.payload.build_id,
    bridge_id: bridgeRecord.payload.bridge_id,
    feature_id: bridgeRecord.payload.feature_id,
    cwd: config.cwd,
  };

  return config.args.map((arg) => renderArgTemplate(arg, context));
}

function validateBuildProgramInput(program: BuildProgramInput): void {
  if (!program.requested_by.trim()) {
    throw new Error("Build program requested_by must be a non-empty string.");
  }

  if (program.features.length === 0) {
    throw new Error("Build program must contain at least one feature.");
  }

  const featureIds = new Set<string>();
  for (const feature of program.features) {
    const featureId = feature.feature_id.trim();
    if (!featureId) {
      throw new Error("Every build-program feature must include a non-empty feature_id.");
    }

    if (!feature.intent.trim()) {
      throw new Error(`Build-program feature ${featureId} must include a non-empty intent.`);
    }

    if (featureIds.has(featureId)) {
      throw new Error(`Duplicate build-program feature_id: ${featureId}`);
    }

    featureIds.add(featureId);
  }

  for (const feature of program.features) {
    for (const dependencyFeatureId of feature.depends_on_feature_ids ?? []) {
      if (!featureIds.has(dependencyFeatureId)) {
        throw new Error(
          `Build-program feature ${feature.feature_id} depends on unknown feature ${dependencyFeatureId}.`
        );
      }
    }
  }
}

function topologicallyOrderProgramFeatures(
  features: BuildProgramFeatureInput[]
): string[] {
  const dependencyCounts = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  const inputOrder = new Map<string, number>();

  for (let index = 0; index < features.length; index += 1) {
    const feature = features[index]!;
    inputOrder.set(feature.feature_id, index);
    dependencyCounts.set(
      feature.feature_id,
      new Set(feature.depends_on_feature_ids ?? []).size
    );
    dependents.set(feature.feature_id, []);
  }

  for (const feature of features) {
    for (const dependencyFeatureId of new Set(feature.depends_on_feature_ids ?? [])) {
      dependents.get(dependencyFeatureId)!.push(feature.feature_id);
    }
  }

  const ready = features
    .filter((feature) => dependencyCounts.get(feature.feature_id) === 0)
    .map((feature) => feature.feature_id)
    .sort((left, right) => inputOrder.get(left)! - inputOrder.get(right)!);
  const ordered: string[] = [];

  while (ready.length > 0) {
    const nextFeatureId = ready.shift()!;
    ordered.push(nextFeatureId);

    for (const dependentFeatureId of dependents.get(nextFeatureId) ?? []) {
      const nextCount = (dependencyCounts.get(dependentFeatureId) ?? 0) - 1;
      dependencyCounts.set(dependentFeatureId, nextCount);
      if (nextCount === 0) {
        ready.push(dependentFeatureId);
        ready.sort((left, right) => inputOrder.get(left)! - inputOrder.get(right)!);
      }
    }
  }

  if (ordered.length !== features.length) {
    const unresolved = features
      .map((feature) => feature.feature_id)
      .filter((featureId) => !ordered.includes(featureId));
    throw new Error(
      `Build program contains a dependency cycle involving: ${unresolved.join(", ")}.`
    );
  }

  return ordered;
}

function makeProgramSummary(
  featureResults: BuildProgramFeatureResult[],
  pendingFeatures: PendingBuildProgramFeature[]
): BuildProgramSummary {
  const summary: BuildProgramSummary = {
    total_features: featureResults.length + pendingFeatures.length,
    passed: 0,
    failed: 0,
    blocked: 0,
    escalated: 0,
    builder_failed: 0,
    awaiting_evidence: 0,
    pending: pendingFeatures.length,
  };

  for (const featureResult of featureResults) {
    if (featureResult.state === "PASSED") {
      summary.passed += 1;
    } else if (featureResult.state === "FAILED") {
      summary.failed += 1;
    } else if (featureResult.state === "BLOCKED") {
      summary.blocked += 1;
    } else if (featureResult.state === "ESCALATED") {
      summary.escalated += 1;
    } else if (featureResult.state === "BUILDER_FAILED") {
      summary.builder_failed += 1;
    } else if (featureResult.state === "AWAITING_EVIDENCE") {
      summary.awaiting_evidence += 1;
    }
  }

  return summary;
}

async function canExecute(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveExecutablePath(
  command: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<string | null> {
  const hasPathSeparator =
    command.includes(path.sep) ||
    (path.sep === "\\" && command.includes("/"));
  if (path.isAbsolute(command) || hasPathSeparator) {
    return (await canExecute(command)) ? command : null;
  }

  const pathEntries = (env.PATH ?? "")
    .split(path.delimiter)
    .filter((entry) => entry.length > 0);
  const extensions =
    process.platform === "win32"
      ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
      : [""];

  for (const entry of pathEntries) {
    for (const extension of extensions) {
      const candidatePath = path.join(entry, `${command}${extension}`);
      if (await canExecute(candidatePath)) {
        return candidatePath;
      }
    }
  }

  return null;
}

export async function verifyBuilderLaunchConfig(
  config: BuilderLaunchConfig,
  env: NodeJS.ProcessEnv = process.env
): Promise<{
  status: "ok" | "error";
  detail: string;
  metadata?: Record<string, unknown>;
}> {
  const commandPath = await resolveExecutablePath(config.command, env);
  if (!commandPath) {
    return {
      status: "error",
      detail: `Builder command "${config.command}" was not found on PATH.`,
    };
  }

  return {
    status: "ok",
    detail: `Builder command resolved to ${commandPath}.`,
    metadata: {
      command: config.command,
      cwd: config.cwd,
      args: config.args,
    },
  };
}

export async function startConfiguredBuilderExecution(
  runtime: AesPlatformRuntime,
  buildId: string,
  config: BuilderLaunchConfig
): Promise<StartBuilderExecutionResult> {
  const buildRecord = await runtime.registry.read<Build>("build", buildId);
  const bridgeRecord = await runtime.registry.read<Bridge>(
    "bridge",
    buildRecord.payload.bridge_id
  );
  const prompt = buildBuilderPrompt(
    buildRecord,
    bridgeRecord,
    config.prompt_preamble
  );

  return runtime.startBuilderExecution({
    build_id: buildId,
    cwd: config.cwd,
    command: config.command,
    args: renderBuilderArgs(config, buildRecord, bridgeRecord, prompt),
    prompt,
  });
}

export async function runConfiguredBuilderWorkflow(
  runtime: AesPlatformRuntime,
  buildId: string,
  config: BuilderLaunchConfig,
  options: RunBuilderWorkflowOptions = {}
): Promise<RunBuilderWorkflowResult> {
  const started = await startConfiguredBuilderExecution(runtime, buildId, config);

  if (!options.wait_for_completion) {
    return {
      started,
      completed: null,
      timed_out: false,
    };
  }

  try {
    return {
      started,
      completed: await runtime.waitForBuilderSession(
        started.session.session_id,
        options.timeout_ms
      ),
      timed_out: false,
    };
  } catch (error) {
    if (error instanceof ManagedSessionTimeoutError) {
      return {
        started,
        completed: null,
        timed_out: true,
      };
    }

    throw error;
  }
}

export async function runBuildProgramWorkflow(
  runtime: AesPlatformRuntime,
  config: BuilderLaunchConfig,
  program: BuildProgramInput
): Promise<BuildProgramWorkflowResult> {
  validateBuildProgramInput(program);

  const featuresById = new Map(
    program.features.map((feature) => [feature.feature_id, feature] as const)
  );
  const executionOrder = topologicallyOrderProgramFeatures(program.features);
  const featureResults: BuildProgramFeatureResult[] = [];
  const featureResultsById = new Map<string, BuildProgramFeatureResult>();
  const pendingFeatures: PendingBuildProgramFeature[] = [];
  const stopOnFailure = program.stop_on_failure !== false;
  let stopReason: string | null = null;

  for (const featureId of executionOrder) {
    const feature = featuresById.get(featureId)!;
    const dependencyFeatureIds = Array.from(
      new Set(feature.depends_on_feature_ids ?? [])
    );

    if (stopReason) {
      pendingFeatures.push({
        feature_id: featureId,
        depends_on_feature_ids: dependencyFeatureIds,
        reason: stopReason,
      });
      continue;
    }

    const unsatisfiedDependencies = dependencyFeatureIds.filter(
      (dependencyFeatureId) =>
        featureResultsById.get(dependencyFeatureId)?.state !== "PASSED"
    );
    if (unsatisfiedDependencies.length > 0) {
      const reason = `Upstream features are not PASSED: ${unsatisfiedDependencies.join(
        ", "
      )}.`;
      pendingFeatures.push({
        feature_id: featureId,
        depends_on_feature_ids: dependencyFeatureIds,
        reason,
      });
      if (stopOnFailure) {
        stopReason = reason;
      }
      continue;
    }

    const dependencyResults = dependencyFeatureIds.map(
      (dependencyFeatureId) => featureResultsById.get(dependencyFeatureId)!
    );
    const prepareInput: PrepareBuildInput = {
      ...feature.prepare,
      submit_request: {
        feature_id: feature.feature_id,
        intent: feature.intent,
        requested_by: program.requested_by,
        risk_domain_tags: feature.risk_domain_tags,
      },
      depends_on_bridge_ids: dependencyResults
        .map((dependencyResult) => dependencyResult.bridge_id)
        .filter((bridgeId): bridgeId is string => typeof bridgeId === "string"),
      predecessor_build_ids: dependencyResults
        .map((dependencyResult) => dependencyResult.build_id)
        .filter((buildId): buildId is string => typeof buildId === "string"),
      dependency_type:
        feature.prepare.dependency_type ??
        (dependencyFeatureIds.length > 0 ? "HARD" : "NONE"),
      dependencies_satisfied: dependencyResults.every(
        (dependencyResult) => dependencyResult.state === "PASSED"
      ),
    };

    const prepareResult = await runtime.prepareBuild(prepareInput);
    const featureResult: BuildProgramFeatureResult = {
      feature_id: featureId,
      depends_on_feature_ids: dependencyFeatureIds,
      build_id: prepareResult.build_record.payload.build_id,
      bridge_id: prepareResult.compiled_bridge_record.payload.bridge_id,
      state: "BLOCKED",
      message: "",
      prepare_result: prepareResult,
    };
    featureResults.push(featureResult);
    featureResultsById.set(featureId, featureResult);

    if (!prepareResult.authorization.allowed) {
      const reasons =
        prepareResult.authorization.reasons.length > 0
          ? prepareResult.authorization.reasons.join(" | ")
          : "Build authorization was blocked.";
      featureResult.state = "BLOCKED";
      featureResult.message = reasons;
      if (stopOnFailure) {
        stopReason = `Feature ${featureId} was blocked: ${reasons}`;
      }
      continue;
    }

    const builderResult = await runConfiguredBuilderWorkflow(
      runtime,
      featureResult.build_id!,
      config,
      {
        wait_for_completion: true,
        timeout_ms: program.builder_timeout_ms,
      }
    );
    featureResult.builder_result = builderResult;

    let abortedBuild: AbortBuilderExecutionResult | null = null;
    if (
      builderResult.timed_out ||
      (builderResult.completed && builderResult.completed.status !== "EXITED")
    ) {
      abortedBuild = await runtime.abortBuilderExecution(featureResult.build_id!);
      featureResult.aborted_build = abortedBuild;
      featureResult.state = "BUILDER_FAILED";
      featureResult.message = builderResult.timed_out
        ? `Builder timed out for feature ${featureId}.`
        : `Builder exited with status ${builderResult.completed?.status ?? "unknown"}.`;
      if (stopOnFailure) {
        stopReason = featureResult.message;
      }
      continue;
    }

    if (!feature.diff || !feature.test_run || feature.run_validators === false) {
      featureResult.state = "AWAITING_EVIDENCE";
      featureResult.message =
        "Builder completed, but the program did not supply diff/test evidence for automatic finalization.";
      if (stopOnFailure) {
        stopReason = `Feature ${featureId} is awaiting evidence before dependents can continue.`;
      }
      continue;
    }

    featureResult.diff_capture = await runtime.recordBuilderArtifacts({
      build_id: featureResult.build_id!,
      ...feature.diff,
    });
    featureResult.test_run_record = await runtime.recordTestRun({
      build_id: featureResult.build_id!,
      ...feature.test_run,
    });
    featureResult.validation = await runtime.runValidators(featureResult.build_id!);

    const finalization = featureResult.validation.finalization;
    if (finalization.state === "FINALIZED") {
      featureResult.state =
        finalization.outcome === "PASSED" ? "PASSED" : "FAILED";
      featureResult.message =
        finalization.outcome === "PASSED"
          ? `Feature ${featureId} finalized successfully.`
          : `Feature ${featureId} finalized as FAILED.`;
    } else {
      featureResult.state = "ESCALATED";
      featureResult.message = `Feature ${featureId} escalated for governance review.`;
    }

    if (featureResult.state !== "PASSED" && stopOnFailure) {
      stopReason = featureResult.message;
    }
  }

  const summary = makeProgramSummary(featureResults, pendingFeatures);

  return {
    app_id: program.app_id?.trim() || null,
    requested_by: program.requested_by,
    program_state:
      pendingFeatures.length > 0
        ? "STOPPED"
        : summary.failed > 0 ||
            summary.blocked > 0 ||
            summary.escalated > 0 ||
            summary.builder_failed > 0 ||
            summary.awaiting_evidence > 0
          ? "FAILED"
          : "PASSED",
    execution_order: executionOrder,
    feature_results: featureResults,
    pending_features: pendingFeatures,
    summary,
  };
}
