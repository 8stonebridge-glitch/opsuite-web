"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadBootstrapConfig = loadBootstrapConfig;
exports.bootstrapRuntimeFromEnv = bootstrapRuntimeFromEnv;
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const registry_1 = require("../registry");
const graph_1 = require("../graph");
const adapters_1 = require("../adapters");
const runtime_1 = require("../runtime");
const builder_launch_1 = require("./builder-launch");
const donor_asset_seed_1 = require("./donor-asset-seed");
function parseOptionalPath(value, cwd) {
    if (!value || value.trim() === "") {
        return null;
    }
    return node_path_1.default.resolve(cwd, value);
}
function resolveDefaultPath(cwd, relativePath) {
    const resolvedPath = node_path_1.default.resolve(cwd, relativePath);
    return (0, node_fs_1.existsSync)(resolvedPath) ? resolvedPath : null;
}
function parsePort(value, fallback) {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeMode(value, allowed, fallback) {
    if (!value) {
        return fallback;
    }
    return allowed.includes(value) ? value : fallback;
}
function loadBootstrapConfig(env = process.env, cwd = process.cwd()) {
    const postgresUrl = env.AES_POSTGRES_URL ?? env.DATABASE_URL ?? null;
    const registryMode = normalizeMode(env.AES_REGISTRY_MODE, ["memory", "postgres"], postgresUrl ? "postgres" : "memory");
    const truthMode = normalizeMode(env.AES_TRUTH_MODE, ["memory", "neo4j"], env.AES_NEO4J_URI ? "neo4j" : "memory");
    const artifactStoreDir = env.AES_ARTIFACT_STORE_DIR
        ? node_path_1.default.resolve(cwd, env.AES_ARTIFACT_STORE_DIR)
        : node_path_1.default.resolve(cwd, ".aes-artifacts");
    const memoryGraphFile = env.AES_MEMORY_GRAPH_FILE
        ? node_path_1.default.resolve(cwd, env.AES_MEMORY_GRAPH_FILE)
        : null;
    const postgresSchemaFile = parseOptionalPath(env.AES_POSTGRES_SCHEMA_FILE, cwd) ??
        resolveDefaultPath(cwd, "schema.sql");
    const neo4jSeedFile = parseOptionalPath(env.AES_NEO4J_SEED_FILE, cwd) ??
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
        builder: (0, builder_launch_1.loadBuilderLaunchConfig)(env, cwd),
    };
}
async function loadMemoryTruthAdapter(memoryGraphFile) {
    if (!memoryGraphFile) {
        return new graph_1.InMemoryTruthAdapter();
    }
    const parsed = JSON.parse(await node_fs_1.promises.readFile(memoryGraphFile, "utf8"));
    return new graph_1.InMemoryTruthAdapter(parsed.nodes ?? [], parsed.edges ?? [], parsed.feature_views ?? {});
}
async function createTruthAdapter(config, env) {
    if (config.truth_mode === "neo4j") {
        const executor = await adapters_1.BoltNeo4jQueryExecutor.connectFromEnv(env);
        const adapter = new adapters_1.Neo4jTruthAdapter(executor);
        return {
            adapter,
            health_checks: [
                {
                    name: "truth_adapter",
                    run: async () => {
                        await executor.run("RETURN 1 AS ok");
                        const metadata = {
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
                    await (0, donor_asset_seed_1.seedCanonicalDonorAssets)(executor);
                    return;
                }
                const cypher = (await node_fs_1.promises.readFile(config.neo4j_seed_file, "utf8")).trim();
                if (cypher) {
                    await executor.run(cypher);
                }
                await (0, donor_asset_seed_1.seedCanonicalDonorAssets)(executor);
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
async function createRegistry(config) {
    if (config.registry_mode === "postgres") {
        if (!config.postgres_url) {
            throw new Error("AES_REGISTRY_MODE=postgres requires AES_POSTGRES_URL or DATABASE_URL.");
        }
        // Dynamic load keeps the package usable without forcing pg in all contexts.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pg = require("pg");
        const pool = new pg.Pool({
            connectionString: config.postgres_url,
        });
        return {
            registry: new registry_1.ArtifactRegistry(new registry_1.PostgresStorage(pool)),
            health_checks: [
                {
                    name: "artifact_registry",
                    run: async () => {
                        const result = await pool.query("SELECT to_regclass('artifact_registry')::text AS registry_table");
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
                await pool.query(await node_fs_1.promises.readFile(config.postgres_schema_file, "utf8"));
            },
            shutdown: async () => {
                await pool.end();
            },
        };
    }
    return {
        registry: new registry_1.ArtifactRegistry(new registry_1.InMemoryStorage()),
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
async function bootstrapRuntimeFromEnv(env = process.env, cwd = process.cwd()) {
    const mergedEnv = {
        ...process.env,
        ...env,
    };
    const config = loadBootstrapConfig(env, cwd);
    if (config.artifact_store_dir) {
        await node_fs_1.promises.mkdir(config.artifact_store_dir, { recursive: true });
    }
    const [{ registry, health_checks: registryHealthChecks, initialize: initializeRegistry, shutdown: shutdownRegistry, }, { adapter, health_checks: truthHealthChecks, initialize: initializeTruth, shutdown: shutdownTruth, },] = await Promise.all([createRegistry(config), createTruthAdapter(config, env)]);
    await Promise.all([initializeRegistry(), initializeTruth()]);
    const runtime = config.registry_mode === "memory" && config.artifact_store_dir
        ? (0, runtime_1.createLocalPlatformRuntime)({
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
                    run: async () => (0, builder_launch_1.verifyBuilderLaunchConfig)(config.builder, mergedEnv),
                },
            ],
        })
        : runtime_1.AesPlatformRuntime.create({
            registry,
            truth_adapter: adapter,
            blob_store: config.artifact_store_dir
                ? new adapters_1.LocalFileArtifactStore(config.artifact_store_dir)
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
                    run: async () => (0, builder_launch_1.verifyBuilderLaunchConfig)(config.builder, mergedEnv),
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
//# sourceMappingURL=runtime-bootstrap.js.map