import { AesPlatformRuntime } from "../runtime";
import { type BuilderLaunchConfig } from "./builder-launch";
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
export declare function loadBootstrapConfig(env?: NodeJS.ProcessEnv, cwd?: string): RuntimeBootstrapConfig;
export declare function bootstrapRuntimeFromEnv(env?: NodeJS.ProcessEnv, cwd?: string): Promise<RuntimeBootstrapResult>;
//# sourceMappingURL=runtime-bootstrap.d.ts.map