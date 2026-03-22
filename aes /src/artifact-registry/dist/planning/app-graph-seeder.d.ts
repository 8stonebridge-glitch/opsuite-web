/**
 * AES Planning — App Graph Seeder
 *
 * Seeds promoted AppSpec + FeatureSpec[] into Neo4j as graph truth.
 * Only accepts PROMOTED packages. Creates FeatureSpec nodes,
 * DEPENDS_ON edges, and USES_FEATURE_TYPE edges.
 *
 * All seeded nodes start at authority_tier: PROVISIONAL.
 * They become CANONICAL through the write-back path after successful builds.
 *
 * Pattern follows: bootstrap/donor-asset-seed.ts (Cypher MERGE)
 */
import type { Neo4jQueryExecutor } from "../adapters";
import type { AppSpec, FeatureSpec } from "../types/app-spec";
import type { PromotionEvaluation } from "../types/promotion-types";
export interface SeedAppGraphInput {
    app: AppSpec;
    features: FeatureSpec[];
    promotion_evaluation: PromotionEvaluation;
}
export interface SeedAppGraphResult {
    app_node_id: string;
    feature_node_ids: Record<string, string>;
    dependency_edge_count: number;
    feature_type_edge_count: number;
    cypher_statements: string[];
}
export declare class NotPromotedError extends Error {
    constructor(appId: string, decision: string);
}
export declare class AppGraphSeeder {
    private readonly executor;
    private readonly now;
    constructor(executor: Neo4jQueryExecutor, now?: () => Date);
    seed(input: SeedAppGraphInput): Promise<SeedAppGraphResult>;
}
//# sourceMappingURL=app-graph-seeder.d.ts.map