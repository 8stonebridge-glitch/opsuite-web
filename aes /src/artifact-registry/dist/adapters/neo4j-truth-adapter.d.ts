import type { CanonicalConstraintSet, FeatureSubgraphQuery, GraphSubgraph, GraphTruthAdapter } from "../graph";
type QueryRow = Record<string, unknown> & {
    get?: (key: string) => unknown;
    keys?: string[];
};
export interface Neo4jQueryExecutor {
    run(cypher: string, params?: Record<string, unknown>): Promise<{
        rows: QueryRow[];
    }>;
    close?(): Promise<void>;
}
export interface Neo4jTruthQueryTemplates {
    feature_subgraph: string;
    subgraph_by_ids: string;
    canonical_constraints_for_feature: string;
}
export interface Neo4jTruthAdapterOptions {
    queries?: Partial<Neo4jTruthQueryTemplates>;
}
export declare const DEFAULT_NEO4J_TRUTH_QUERIES: Neo4jTruthQueryTemplates;
export declare class Neo4jTruthAdapter implements GraphTruthAdapter {
    private readonly executor;
    private readonly queries;
    constructor(executor: Neo4jQueryExecutor, options?: Neo4jTruthAdapterOptions);
    fetchFeatureSubgraph(query: FeatureSubgraphQuery): Promise<GraphSubgraph>;
    fetchCanonicalConstraints(featureId: string): Promise<CanonicalConstraintSet>;
    fetchSubgraphByIds(nodeIds: string[], edgeIds: string[], criticalDomainNodeIds?: string[]): Promise<GraphSubgraph>;
}
export interface BoltNeo4jQueryExecutorOptions {
    uri: string;
    username: string;
    password: string;
    database?: string;
}
export declare class BoltNeo4jQueryExecutor implements Neo4jQueryExecutor {
    private readonly driver;
    private readonly database?;
    static connectFromEnv(env?: NodeJS.ProcessEnv): Promise<BoltNeo4jQueryExecutor>;
    static connect(options: BoltNeo4jQueryExecutorOptions): Promise<BoltNeo4jQueryExecutor>;
    constructor(driver: {
        session(config?: {
            database?: string;
        }): {
            run(cypher: string, params?: Record<string, unknown>): Promise<{
                records: QueryRow[];
            }>;
            close(): Promise<void>;
        };
        close(): Promise<void>;
    }, database?: string | undefined);
    run(cypher: string, params?: Record<string, unknown>): Promise<{
        rows: QueryRow[];
    }>;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=neo4j-truth-adapter.d.ts.map