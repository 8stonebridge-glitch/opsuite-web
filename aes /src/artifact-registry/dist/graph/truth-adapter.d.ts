/**
 * AES Graph Layer — Truth Adapter
 *
 * Defines the read-only graph access seam used by the snapshot and freshness
 * services. The initial in-memory adapter keeps this layer deterministic and
 * testable without requiring a live Neo4j instance.
 */
import type { GraphEdge, GraphNode } from "../types";
export interface FeatureSubgraphQuery {
    feature_id: string;
    query_profile?: string;
}
export interface GraphSubgraph {
    referenced_nodes: GraphNode[];
    referenced_edges: GraphEdge[];
    critical_domain_nodes: string[];
}
export interface CanonicalConstraintSet {
    governance_rules: Array<{
        node_id: string;
        name: string;
        severity: string;
        enforced_by: string;
        authority_tier: string;
    }>;
    validator_bundles: Array<{
        node_id: string;
        bundle_name: string;
        blocking_validators: string[];
        authority_tier: string;
    }>;
    bridge_presets: Array<{
        node_id: string;
        preset_name: string;
        required_outcomes: string[];
        authority_tier: string;
    }>;
}
export interface GraphTruthAdapter {
    fetchFeatureSubgraph(query: FeatureSubgraphQuery): Promise<GraphSubgraph>;
    fetchSubgraphByIds(nodeIds: string[], edgeIds: string[], criticalDomainNodeIds?: string[]): Promise<GraphSubgraph>;
    fetchCanonicalConstraints?(featureId: string): Promise<CanonicalConstraintSet>;
}
export interface FeatureView {
    node_ids: string[];
    edge_ids: string[];
    critical_domain_nodes: string[];
}
/**
 * Read-only in-memory adapter for deterministic tests and local orchestration
 * development. Callers can mutate graph contents only through the explicit
 * helper methods below.
 */
export declare class InMemoryTruthAdapter implements GraphTruthAdapter {
    private readonly nodeMap;
    private readonly edgeMap;
    private readonly featureViews;
    constructor(nodes?: GraphNode[], edges?: GraphEdge[], featureViews?: Record<string, FeatureView>);
    fetchFeatureSubgraph(query: FeatureSubgraphQuery): Promise<GraphSubgraph>;
    fetchSubgraphByIds(nodeIds: string[], edgeIds: string[], criticalDomainNodeIds?: string[]): Promise<GraphSubgraph>;
    fetchCanonicalConstraints(_featureId: string): Promise<CanonicalConstraintSet>;
    upsertNode(node: GraphNode): void;
    upsertEdge(edge: GraphEdge): void;
    removeNode(nodeId: string): void;
    removeEdge(edgeId: string): void;
    setFeatureView(featureId: string, view: FeatureView, queryProfile?: string): void;
    private materializeSubgraph;
}
//# sourceMappingURL=truth-adapter.d.ts.map