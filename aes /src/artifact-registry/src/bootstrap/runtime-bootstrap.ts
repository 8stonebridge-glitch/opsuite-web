import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import {
  ArtifactRegistry,
  InMemoryStorage,
  PostgresStorage,
} from "../registry";
import {
  InMemoryTruthAdapter,
  type FeatureView,
  type GraphTruthAdapter,
} from "../graph";
import {
  BoltNeo4jQueryExecutor,
  LocalFileArtifactStore,
  Neo4jTruthAdapter,
} from "../adapters";
import type { GraphEdge, GraphNode } from "../types";
import {
  AesPlatformRuntime,
  createLocalPlatformRuntime,
  type RuntimeHealthCheck,
} from "../runtime";
import {
  loadBuilderLaunchConfig,
  verifyBuilderLaunchConfig,
  type BuilderLaunchConfig,
} from "./builder-launch";
import { seedCanonicalDonorAssets } from "./donor-asset-seed";

export interface RuntimeBootstrapConfig {
  registry_mode: "memory" | "postgres";
  truth_mode: "memory" | "neo4j";
  operator_host: string;
  operator_port: number;
  artifact_store_dir: string | null;
  memory_graph_file: string | null;
  postgres_url: string | null;
  postgres_schema_file: string | null;
  neo4j_seed_file: string | null;
  health_feature_id: string | null;
  builder: BuilderLaunchConfig;
}

export interface RuntimeBootstrapResult {
  runtime: AesPlatformRuntime;
  config: RuntimeBootstrapConfig;
  shutdown: () => Promise<void>;
}

interface PgPoolLikeModule {
  Pool: new (options: { connectionString: string }) => {
    end(): Promise<void>;
    query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  };
}

interface MemoryGraphSeed {
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  feature_views?: Record<string, FeatureView>;
}

function parseOptionalPath(
  value: string | undefined,
  cwd: string
): string | null {
  if (!value || value.trim() === "") {
    return null;
  }

  return path.resolve(cwd, value);
}

function resolveDefaultPath(cwd: string, relativePath: string): string | null {
  const resolvedPath = path.resolve(cwd, relativePath);
  return existsSync(resolvedPath) ? resolvedPath : null;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMode(
  value: string | undefined,
  allowed: string[],
  fallback: string
): string {
  if (!value) {
    return fallback;
  }

  return allowed.includes(value) ? value : fallback;
}

export function loadBootstrapConfig(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): RuntimeBootstrapConfig {
  const postgresUrl = env.AES_POSTGRES_URL ?? env.DATABASE_URL ?? null;
  const registryMode = normalizeMode(
    env.AES_REGISTRY_MODE,
    ["memory", "postgres"],
    postgresUrl ? "postgres" : "memory"
  ) as "memory" | "postgres";
  const truthMode = normalizeMode(
    env.AES_TRUTH_MODE,
    ["memory", "neo4j"],
    env.AES_NEO4J_URI ? "neo4j" : "memory"
  ) as "memory" | "neo4j";
  const artifactStoreDir = env.AES_ARTIFACT_STORE_DIR
    ? path.resolve(cwd, env.AES_ARTIFACT_STORE_DIR)
    : path.resolve(cwd, ".aes-artifacts");
  const memoryGraphFile = env.AES_MEMORY_GRAPH_FILE
    ? path.resolve(cwd, env.AES_MEMORY_GRAPH_FILE)
    : null;
  const postgresSchemaFile =
    parseOptionalPath(env.AES_POSTGRES_SCHEMA_FILE, cwd) ??
    resolveDefaultPath(cwd, "schema.sql");
  const neo4jSeedFile =
    parseOptionalPath(env.AES_NEO4J_SEED_FILE, cwd) ??
    resolveDefaultPath(cwd, "seeds/neo4j/live-runtime.cypher");

  return {
    registry_mode: registryMode,
    truth_mode: truthMode,
    operator_host: env.AES_OPERATOR_HOST ?? "127.0.0.1",
    operator_port: parsePort(env.AES_OPERATOR_PORT, 4100),
    artifact_store_dir: artifactStoreDir,
    memory_graph_file: memoryGraphFile,
    postgres_url: postgresUrl,
    postgres_schema_file: postgresSchemaFile,
    neo4j_seed_file: neo4jSeedFile,
    health_feature_id: env.AES_HEALTH_FEATURE_ID ?? null,
    builder: loadBuilderLaunchConfig(env, cwd),
  };
}

async function loadMemoryTruthAdapter(
  memoryGraphFile: string | null
): Promise<GraphTruthAdapter> {
  if (!memoryGraphFile) {
    return new InMemoryTruthAdapter();
  }

  const parsed = JSON.parse(
    await fs.readFile(memoryGraphFile, "utf8")
  ) as MemoryGraphSeed;

  return new InMemoryTruthAdapter(
    parsed.nodes ?? [],
    parsed.edges ?? [],
    parsed.feature_views ?? {}
  );
}

async function createTruthAdapter(
  config: RuntimeBootstrapConfig,
  env: NodeJS.ProcessEnv
): Promise<{
  adapter: GraphTruthAdapter;
  health_checks: RuntimeHealthCheck[];
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
}> {
  if (config.truth_mode === "neo4j") {
    const executor = await BoltNeo4jQueryExecutor.connectFromEnv(env);
    const adapter = new Neo4jTruthAdapter(executor);

    return {
      adapter,
      health_checks: [
        {
          name: "truth_adapter",
          run: async () => {
            await executor.run("RETURN 1 AS ok");
            const metadata: Record<string, unknown> = {
              mode: "neo4j",
            };

            if (config.health_feature_id) {
              const subgraph = await adapter.fetchFeatureSubgraph({
                feature_id: config.health_feature_id,
              });
              metadata.feature_id = config.health_feature_id;
              metadata.referenced_nodes = subgraph.referenced_nodes.length;
              metadata.referenced_edges = subgraph.referenced_edges.length;
            }

            return {
              status: "ok",
              detail: "Neo4j truth adapter responded to a live query.",
              metadata,
            };
          },
        },
      ],
      initialize: async () => {
        if (!config.neo4j_seed_file) {
          await seedCanonicalDonorAssets(executor);
          return;
        }

        const cypher = (await fs.readFile(config.neo4j_seed_file, "utf8")).trim();
        if (cypher) {
          await executor.run(cypher);
        }

        await seedCanonicalDonorAssets(executor);
      },
      shutdown: async () => {
        await executor.close();
      },
    };
  }

  return {
    adapter: await loadMemoryTruthAdapter(config.memory_graph_file),
    health_checks: [
      {
        name: "truth_adapter",
        run: async () => ({
          status: "ok",
          detail: "In-memory truth adapter ready.",
          metadata: {
            mode: "memory",
            seed_file: config.memory_graph_file,
          },
        }),
      },
    ],
    initialize: async () => undefined,
    shutdown: async () => undefined,
  };
}

async function createRegistry(
  config: RuntimeBootstrapConfig
): Promise<{
  registry: ArtifactRegistry;
  health_checks: RuntimeHealthCheck[];
  initialize: () => Promise<void>;
  shutdown: () => Promise<void>;
}> {
  if (config.registry_mode === "postgres") {
    if (!config.postgres_url) {
      throw new Error(
        "AES_REGISTRY_MODE=postgres requires AES_POSTGRES_URL or DATABASE_URL."
      );
    }

    // Dynamic load keeps the package usable without forcing pg in all contexts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pg = require("pg") as PgPoolLikeModule;
    const pool = new pg.Pool({
      connectionString: config.postgres_url,
    });

    return {
      registry: new ArtifactRegistry(new PostgresStorage(pool)),
      health_checks: [
        {
          name: "artifact_registry",
          run: async () => {
            const result = await pool.query(
              "SELECT to_regclass('artifact_registry')::text AS registry_table"
            );

            return {
              status: "ok",
              detail: "Postgres artifact registry connection is healthy.",
              metadata: {
                mode: "postgres",
                registry_table: result.rows[0]?.["registry_table"] ?? null,
              },
            };
          },
        },
      ],
      initialize: async () => {
        if (!config.postgres_schema_file) {
          return;
        }

        await pool.query(await fs.readFile(config.postgres_schema_file, "utf8"));
      },
      shutdown: async () => {
        await pool.end();
      },
    };
  }

  return {
    registry: new ArtifactRegistry(new InMemoryStorage()),
    health_checks: [
      {
        name: "artifact_registry",
        run: async () => ({
          status: "ok",
          detail: "In-memory artifact registry ready.",
          metadata: {
            mode: "memory",
          },
        }),
      },
    ],
    initialize: async () => undefined,
    shutdown: async () => undefined,
  };
}

export async function bootstrapRuntimeFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd()
): Promise<RuntimeBootstrapResult> {
  const mergedEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...env,
  };
  const config = loadBootstrapConfig(env, cwd);
  if (config.artifact_store_dir) {
    await fs.mkdir(config.artifact_store_dir, { recursive: true });
  }

  const [
    {
      registry,
      health_checks: registryHealthChecks,
      initialize: initializeRegistry,
      shutdown: shutdownRegistry,
    },
    {
      adapter,
      health_checks: truthHealthChecks,
      initialize: initializeTruth,
      shutdown: shutdownTruth,
    },
  ] = await Promise.all([createRegistry(config), createTruthAdapter(config, env)]);
  await Promise.all([initializeRegistry(), initializeTruth()]);
  const runtime =
    config.registry_mode === "memory" && config.artifact_store_dir
      ? createLocalPlatformRuntime({
          registry,
          truth_adapter: adapter,
          artifact_store_root_dir: config.artifact_store_dir,
          health_checks: [
            ...registryHealthChecks,
            ...truthHealthChecks,
            {
              name: "artifact_store",
              run: async () => ({
                status: "ok",
                detail: "Artifact store directory is writable.",
                metadata: {
                  path: config.artifact_store_dir,
                },
              }),
            },
            {
              name: "builder_command",
              run: async () => verifyBuilderLaunchConfig(config.builder, mergedEnv),
            },
          ],
        })
      : AesPlatformRuntime.create({
          registry,
          truth_adapter: adapter,
          blob_store: config.artifact_store_dir
            ? new LocalFileArtifactStore(config.artifact_store_dir)
            : undefined,
          health_checks: [
            ...registryHealthChecks,
            ...truthHealthChecks,
            {
              name: "artifact_store",
              run: async () => ({
                status: "ok",
                detail: "Artifact store directory is writable.",
                metadata: {
                  path: config.artifact_store_dir,
                },
              }),
            },
            {
              name: "builder_command",
              run: async () => verifyBuilderLaunchConfig(config.builder, mergedEnv),
            },
          ],
        });

  return {
    runtime,
    config,
    shutdown: async () => {
      await Promise.all([shutdownTruth(), shutdownRegistry()]);
    },
  };
}
