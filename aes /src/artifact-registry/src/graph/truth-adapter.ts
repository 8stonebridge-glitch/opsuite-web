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
  fetchSubgraphByIds(
    nodeIds: string[],
    edgeIds: string[],
    criticalDomainNodeIds?: string[]
  ): Promise<GraphSubgraph>;
  fetchCanonicalConstraints?(featureId: string): Promise<CanonicalConstraintSet>;
}

export interface FeatureView {
  node_ids: string[];
  edge_ids: string[];
  critical_domain_nodes: string[];
}

function featureViewKey(featureId: string, queryProfile?: string): string {
  return queryProfile ? `${featureId}::${queryProfile}` : featureId;
}

function cloneValue<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Read-only in-memory adapter for deterministic tests and local orchestration
 * development. Callers can mutate graph contents only through the explicit
 * helper methods below.
 */
export class InMemoryTruthAdapter implements GraphTruthAdapter {
  private readonly nodeMap = new Map<string, GraphNode>();
  private readonly edgeMap = new Map<string, GraphEdge>();
  private readonly featureViews = new Map<string, FeatureView>();

  constructor(
    nodes: GraphNode[] = [],
    edges: GraphEdge[] = [],
    featureViews: Record<string, FeatureView> = {}
  ) {
    for (const node of nodes) {
      this.upsertNode(node);
    }

    for (const edge of edges) {
      this.upsertEdge(edge);
    }

    for (const [key, view] of Object.entries(featureViews)) {
      this.featureViews.set(key, cloneValue(view));
    }
  }

  async fetchFeatureSubgraph(
    query: FeatureSubgraphQuery
  ): Promise<GraphSubgraph> {
    const exactView = this.featureViews.get(
      featureViewKey(query.feature_id, query.query_profile)
    );
    const fallbackView = this.featureViews.get(query.feature_id);
    const view = exactView ?? fallbackView;

    if (!view) {
      throw new Error(
        `No feature view configured for ${featureViewKey(
          query.feature_id,
          query.query_profile
        )}`
      );
    }

    return this.materializeSubgraph(
      view.node_ids,
      view.edge_ids,
      view.critical_domain_nodes,
      true
    );
  }

  async fetchSubgraphByIds(
    nodeIds: string[],
    edgeIds: string[],
    criticalDomainNodeIds: string[] = []
  ): Promise<GraphSubgraph> {
    return this.materializeSubgraph(
      nodeIds,
      edgeIds,
      criticalDomainNodeIds,
      false
    );
  }

  async fetchCanonicalConstraints(_featureId: string): Promise<CanonicalConstraintSet> {
    const rules: CanonicalConstraintSet["governance_rules"] = [];
    const bundles: CanonicalConstraintSet["validator_bundles"] = [];
    const presets: CanonicalConstraintSet["bridge_presets"] = [];

    for (const node of this.nodeMap.values()) {
      if (node.properties["authority_tier"] !== "CANONICAL") continue;

      if (node.label === "GovernanceRule") {
        rules.push({
          node_id: node.node_id,
          name: String(node.properties["name"] ?? ""),
          severity: String(node.properties["severity"] ?? ""),
          enforced_by: String(node.properties["enforced_by"] ?? ""),
          authority_tier: "CANONICAL",
        });
      } else if (
        node.label === "ValidatorBundle" &&
        node.properties["enforceable"] === true
      ) {
        bundles.push({
          node_id: node.node_id,
          bundle_name: String(node.properties["bundle_name"] ?? ""),
          blocking_validators: Array.isArray(node.properties["blocking_validators"])
            ? (node.properties["blocking_validators"] as string[])
            : [],
          authority_tier: "CANONICAL",
        });
      } else if (
        node.label === "BridgePreset" &&
        node.properties["enforceable"] === true
      ) {
        presets.push({
          node_id: node.node_id,
          preset_name: String(node.properties["preset_name"] ?? ""),
          required_outcomes: Array.isArray(node.properties["required_outcomes"])
            ? (node.properties["required_outcomes"] as string[])
            : [],
          authority_tier: "CANONICAL",
        });
      }
    }

    return { governance_rules: rules, validator_bundles: bundles, bridge_presets: presets };
  }

  upsertNode(node: GraphNode): void {
    this.nodeMap.set(node.node_id, cloneValue(node));
  }

  upsertEdge(edge: GraphEdge): void {
    this.edgeMap.set(edge.edge_id, cloneValue(edge));
  }

  removeNode(nodeId: string): void {
    this.nodeMap.delete(nodeId);
  }

  removeEdge(edgeId: string): void {
    this.edgeMap.delete(edgeId);
  }

  setFeatureView(featureId: string, view: FeatureView, queryProfile?: string): void {
    this.featureViews.set(
      featureViewKey(featureId, queryProfile),
      cloneValue(view)
    );
  }

  private materializeSubgraph(
    nodeIds: string[],
    edgeIds: string[],
    criticalDomainNodeIds: string[],
    strict: boolean
  ): GraphSubgraph {
    const referenced_nodes = nodeIds.flatMap((nodeId) => {
      const node = this.nodeMap.get(nodeId);
      if (!node) {
        if (strict) {
          throw new Error(`Unknown graph node: ${nodeId}`);
        }

        return [];
      }

      return [cloneValue(node)];
    });

    const referenced_edges = edgeIds.flatMap((edgeId) => {
      const edge = this.edgeMap.get(edgeId);
      if (!edge) {
        if (strict) {
          throw new Error(`Unknown graph edge: ${edgeId}`);
        }

        return [];
      }

      return [cloneValue(edge)];
    });

    return {
      referenced_nodes,
      referenced_edges,
      critical_domain_nodes: criticalDomainNodeIds.filter((nodeId) =>
        referenced_nodes.some((node) => node.node_id === nodeId)
      ),
    };
  }
}
