#!/usr/bin/env node

import { promises as fs } from "node:fs";
import { OperatorHttpServer } from "../ui";
import {
  bootstrapRuntimeFromEnv,
  loadBootstrapEnvFiles,
  runBuildProgramWorkflow,
  startConfiguredBuilderExecution,
  type BuildProgramInput,
} from "../bootstrap";
import { ManagedSessionTimeoutError } from "../sessions";
import type {
  PrepareBuildInput,
  RecordBuilderArtifactsInput,
  RecordTestRunInput,
} from "../runtime";

type CliCommand =
  | "serve"
  | "health"
  | "prepare-build"
  | "run-build-program"
  | "run-builder"
  | "abort-builder"
  | "record-diff"
  | "record-test-run"
  | "run-validators"
  | "help";

interface ParsedCliCommand {
  command: CliCommand;
  build_id?: string;
  input_path?: string;
  timeout_ms?: number;
}

function usage(): string {
  return [
    "AES platform CLI",
    "",
    "Commands:",
    "  serve  Start the operator HTTP server",
    "  health  Print runtime health as JSON",
    "  prepare-build [--input path|-]  Create and authorize a build from JSON input",
    "  run-build-program [--input path|-]  Run a dependency-ordered multi-feature build program from JSON input",
    "  run-builder <build-id> [--timeout-ms ms]  Launch the configured AES builder command",
    "  abort-builder <build-id>  Terminate the supervised builder session and fail the build",
    "  record-diff <build-id> [--input path|-]  Record builder diff metadata and optional diff text",
    "  record-test-run <build-id> [--input path|-]  Record a test run result",
    "  run-validators <build-id>  Execute validator adapters and finalize the build",
    "  help  Show this message",
    "",
    "Env:",
    "  .env and .env.local are loaded automatically when present",
    "  AES_REGISTRY_MODE=memory|postgres",
    "  AES_POSTGRES_URL=<postgres-url>",
    "  AES_POSTGRES_SCHEMA_FILE=<schema.sql>",
    "  AES_TRUTH_MODE=memory|neo4j",
    "  AES_MEMORY_GRAPH_FILE=<seed.json>",
    "  AES_NEO4J_SEED_FILE=<seed.cypher>",
    "  AES_NEO4J_URI / AES_NEO4J_USERNAME / AES_NEO4J_PASSWORD",
    "  AES_HEALTH_FEATURE_ID=<feature-id>",
    "  AES_ARTIFACT_STORE_DIR=<dir>",
    "  AES_OPERATOR_HOST=<host>",
    "  AES_OPERATOR_PORT=<port>",
    "  AES_BUILDER_COMMAND=<binary>",
    "  AES_BUILDER_ARGS_JSON=[\"-p\",\"{{prompt}}\"]",
    "  AES_BUILDER_CWD=<dir>",
    "",
    "Input:",
    "  JSON payload commands accept --input <path> or stdin with --input -",
  ].join("\n");
}

function parsePositiveInteger(name: string, value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, received "${value}".`);
  }

  return parsed;
}

function parseFlags(argv: string[]): {
  positional: string[];
  input_path?: string;
  timeout_ms?: number;
} {
  const positional: string[] = [];
  let inputPath: string | undefined;
  let timeoutMs: number | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;
    if (token === "--input") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--input requires a path or '-' for stdin.");
      }

      inputPath = value;
      index += 1;
      continue;
    }

    if (token === "--timeout-ms") {
      const value = argv[index + 1];
      if (!value) {
        throw new Error("--timeout-ms requires a numeric value.");
      }

      timeoutMs = parsePositiveInteger("--timeout-ms", value);
      index += 1;
      continue;
    }

    positional.push(token);
  }

  return {
    positional,
    input_path: inputPath,
    timeout_ms: timeoutMs,
  };
}

function parseCommand(argv: string[]): ParsedCliCommand {
  const candidate = argv[2] ?? "help";
  const { positional, input_path, timeout_ms } = parseFlags(argv.slice(3));

  if (
    candidate === "serve" ||
    candidate === "health" ||
    candidate === "prepare-build" ||
    candidate === "run-build-program" ||
    candidate === "help"
  ) {
    return {
      command: candidate,
      input_path,
      timeout_ms,
    };
  }

  if (
    candidate === "run-builder" ||
    candidate === "abort-builder" ||
    candidate === "record-diff" ||
    candidate === "record-test-run" ||
    candidate === "run-validators"
  ) {
    return {
      command: candidate,
      build_id: positional[0],
      input_path,
      timeout_ms,
    };
  }

  return {
    command: "help",
  };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function readJsonInput<T>(
  command: CliCommand,
  inputPath?: string
): Promise<T> {
  const raw =
    inputPath && inputPath !== "-"
      ? await fs.readFile(inputPath, "utf8")
      : !process.stdin.isTTY || inputPath === "-"
        ? await readStdin()
        : null;

  if (raw === null) {
    throw new Error(
      `${command} requires JSON input via --input <path> or stdin (--input -).`
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(
      `Invalid JSON for ${command}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function runServe(loadedEnvFiles: string[]): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();
  const server = new OperatorHttpServer(bootstrap.runtime, {
    builder: bootstrap.config.builder,
  });
  const started = await server.start({
    host: bootstrap.config.operator_host,
    port: bootstrap.config.operator_port,
  });

  writeJson({
    status: "listening",
    url: started.url,
    registry_mode: bootstrap.config.registry_mode,
    truth_mode: bootstrap.config.truth_mode,
    artifact_store_dir: bootstrap.config.artifact_store_dir,
    env_files: loadedEnvFiles,
  });

  let shuttingDown = false;
  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    await server.stop();
    await bootstrap.shutdown();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

async function runHealth(loadedEnvFiles: string[]): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();

  try {
    const health = await bootstrap.runtime.health();
    writeJson({
      env_files: loadedEnvFiles,
      config: bootstrap.config,
      health,
    });
    if (health.status !== "ok") {
      process.exitCode = 1;
    }
  } finally {
    await bootstrap.shutdown();
  }
}

async function runPrepareBuild(
  loadedEnvFiles: string[],
  inputPath?: string
): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();

  try {
    const input = await readJsonInput<PrepareBuildInput>("prepare-build", inputPath);
    const result = await bootstrap.runtime.prepareBuild(input);
    writeJson({
      env_files: loadedEnvFiles,
      build_id: result.build_record.payload.build_id,
      result,
    });
    if (!result.authorization.allowed) {
      process.exitCode = 1;
    }
  } finally {
    await bootstrap.shutdown();
  }
}

async function runBuildProgram(
  loadedEnvFiles: string[],
  inputPath?: string
): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();

  try {
    const input = await readJsonInput<BuildProgramInput>(
      "run-build-program",
      inputPath
    );
    const result = await runBuildProgramWorkflow(
      bootstrap.runtime,
      bootstrap.config.builder,
      input
    );
    writeJson({
      env_files: loadedEnvFiles,
      result,
    });
    if (result.program_state !== "PASSED") {
      process.exitCode = 1;
    }
  } finally {
    await bootstrap.shutdown();
  }
}

async function runAbortBuilder(
  loadedEnvFiles: string[],
  buildId: string
): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();

  try {
    const aborted = await bootstrap.runtime.abortBuilderExecution(buildId);
    writeJson({
      env_files: loadedEnvFiles,
      build_id: buildId,
      aborted,
    });
  } finally {
    await bootstrap.shutdown();
  }
}

async function runRecordDiff(
  loadedEnvFiles: string[],
  buildId: string,
  inputPath?: string
): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();

  try {
    const payload = await readJsonInput<
      Omit<RecordBuilderArtifactsInput, "build_id">
    >("record-diff", inputPath);
    const capture = await bootstrap.runtime.recordBuilderArtifacts({
      build_id: buildId,
      ...payload,
    });
    writeJson({
      env_files: loadedEnvFiles,
      build_id: buildId,
      capture,
    });
  } finally {
    await bootstrap.shutdown();
  }
}

async function runRecordTestRun(
  loadedEnvFiles: string[],
  buildId: string,
  inputPath?: string
): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();

  try {
    const payload = await readJsonInput<
      Omit<RecordTestRunInput, "build_id">
    >("record-test-run", inputPath);
    const testRun = await bootstrap.runtime.recordTestRun({
      build_id: buildId,
      ...payload,
    });
    writeJson({
      env_files: loadedEnvFiles,
      build_id: buildId,
      test_run: testRun,
    });
  } finally {
    await bootstrap.shutdown();
  }
}

async function runValidators(
  loadedEnvFiles: string[],
  buildId: string
): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();

  try {
    const validation = await bootstrap.runtime.runValidators(buildId);
    writeJson({
      env_files: loadedEnvFiles,
      build_id: buildId,
      validation,
    });
  } finally {
    await bootstrap.shutdown();
  }
}

async function runBuilder(
  loadedEnvFiles: string[],
  buildId: string,
  timeoutMs?: number
): Promise<void> {
  const bootstrap = await bootstrapRuntimeFromEnv();
  let startedSessionId: string | null = null;
  let abortOnShutdown = false;
  let shuttingDown = false;

  const shutdown = async (): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    if (abortOnShutdown && startedSessionId) {
      await bootstrap.runtime.abortBuilderExecution(buildId);
    }
    await bootstrap.shutdown();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(1));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(1));
  });

  try {
    const started = await startConfiguredBuilderExecution(
      bootstrap.runtime,
      buildId,
      bootstrap.config.builder
    );
    startedSessionId = started.session.session_id;
    abortOnShutdown = true;

    let completed = null;
    let timedOut = false;
    let aborted = null;

    try {
      completed = await bootstrap.runtime.waitForBuilderSession(
        started.session.session_id,
        timeoutMs
      );
    } catch (error) {
      if (error instanceof ManagedSessionTimeoutError) {
        timedOut = true;
      } else {
        throw error;
      }
    }

    if (timedOut || (completed && completed.status !== "EXITED")) {
      aborted = await bootstrap.runtime.abortBuilderExecution(buildId);
    } else {
      abortOnShutdown = false;
    }

    writeJson({
      env_files: loadedEnvFiles,
      build_id: buildId,
      builder: bootstrap.config.builder,
      started,
      completed,
      timed_out: timedOut,
      aborted,
    });
    process.exitCode = timedOut ? 124 : completed?.status === "EXITED" ? 0 : 1;
  } finally {
    await shutdown();
  }
}

async function main(): Promise<void> {
  const { loaded_files: loadedEnvFiles } = loadBootstrapEnvFiles();
  const parsed = parseCommand(process.argv);

  if (parsed.command === "help") {
    process.stdout.write(`${usage()}\n`);
    return;
  }

  if (parsed.command === "health") {
    await runHealth(loadedEnvFiles);
    return;
  }

  if (parsed.command === "prepare-build") {
    await runPrepareBuild(loadedEnvFiles, parsed.input_path);
    return;
  }

  if (parsed.command === "run-build-program") {
    await runBuildProgram(loadedEnvFiles, parsed.input_path);
    return;
  }

  if (parsed.command === "run-builder") {
    if (!parsed.build_id) {
      throw new Error("run-builder requires a build_id argument.");
    }

    await runBuilder(loadedEnvFiles, parsed.build_id, parsed.timeout_ms);
    return;
  }

  if (parsed.command === "abort-builder") {
    if (!parsed.build_id) {
      throw new Error("abort-builder requires a build_id argument.");
    }

    await runAbortBuilder(loadedEnvFiles, parsed.build_id);
    return;
  }

  if (parsed.command === "record-diff") {
    if (!parsed.build_id) {
      throw new Error("record-diff requires a build_id argument.");
    }

    await runRecordDiff(loadedEnvFiles, parsed.build_id, parsed.input_path);
    return;
  }

  if (parsed.command === "record-test-run") {
    if (!parsed.build_id) {
      throw new Error("record-test-run requires a build_id argument.");
    }

    await runRecordTestRun(loadedEnvFiles, parsed.build_id, parsed.input_path);
    return;
  }

  if (parsed.command === "run-validators") {
    if (!parsed.build_id) {
      throw new Error("run-validators requires a build_id argument.");
    }

    await runValidators(loadedEnvFiles, parsed.build_id);
    return;
  }

  await runServe(loadedEnvFiles);
}

void main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )}\n`
  );
  process.exit(1);
});
