/**
 * AES Graph Layer — Canonical Hashing and Drift Detection
 */
import type { GraphSnapshot } from "../types";
import type { GraphSubgraph } from "./truth-adapter";
export interface GraphDrift {
    changed_node_ids: string[];
    changed_edge_ids: string[];
}
export declare function normalizeGraphSubgraph(subgraph: GraphSubgraph): GraphSubgraph;
export declare function computeGraphTruthHash(subgraph: GraphSubgraph): string;
export declare function detectGraphDrift(snapshot: Pick<GraphSnapshot, "referenced_nodes" | "referenced_edges" | "critical_domain_nodes">, current: GraphSubgraph): GraphDrift;
//# sourceMappingURL=hash.d.ts.map