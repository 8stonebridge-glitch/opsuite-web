import { AgentActivityTracker } from "./agent-pipeline-view";
import { type BuilderLaunchConfig } from "../bootstrap";
import { AesPlatformRuntime } from "../runtime";
export interface OperatorHttpServerOptions {
    host?: string;
    port?: number;
}
export interface StartedOperatorHttpServer {
    host: string;
    port: number;
    url: string;
}
export interface OperatorHttpServerDependencies {
    builder?: BuilderLaunchConfig;
}
export declare class OperatorHttpServer {
    private readonly runtime;
    private readonly dependencies;
    private server;
    readonly agentTracker: AgentActivityTracker;
    constructor(runtime: AesPlatformRuntime, dependencies?: OperatorHttpServerDependencies);
    start(options?: OperatorHttpServerOptions): Promise<StartedOperatorHttpServer>;
    stop(): Promise<void>;
    private handleRequest;
    private requireBuilderConfig;
}
//# sourceMappingURL=operator-http-server.d.ts.map