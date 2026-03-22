"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoltNeo4jQueryExecutor = exports.Neo4jTruthAdapter = exports.DEFAULT_NEO4J_TRUTH_QUERIES = void 0;
exports.DEFAULT_NEO4J_TRUTH_QUERIES = {
    feature_subgraph: `
    MATCH (n {feature_id: $feature_id})
    OPTIONAL MATCH path = (n)-[*1..3]-(m)
    WITH
      n,
      collect(path) AS paths
    WITH
      reduce(
        nodeAcc = [n],
        path IN [candidate IN paths WHERE candidate IS NOT NULL] |
          nodeAcc + [node IN nodes(path) WHERE node IS NOT NULL]
      ) AS raw_nodes,
      reduce(
        relAcc = [],
        path IN [candidate IN paths WHERE candidate IS NOT NULL] |
          relAcc + [rel IN relationships(path) WHERE rel IS NOT NULL]
      ) AS raw_rels
    UNWIND raw_nodes AS node
    WITH collect(DISTINCT node) AS nodes, raw_rels
    UNWIND CASE WHEN size(raw_rels) = 0 THEN [null] ELSE raw_rels END AS rel
    WITH nodes, collect(DISTINCT rel) AS rels
    RETURN
      [node IN nodes WHERE node IS NOT NULL | {
        node_id: coalesce(node.node_id, toString(id(node))),
        label: head(labels(node)),
        properties: properties(node)
      }] AS referenced_nodes,
      [rel IN rels WHERE rel IS NOT NULL | {
        edge_id: coalesce(rel.edge_id, toString(id(rel))),
        from_node_id: coalesce(startNode(rel).node_id, toString(id(startNode(rel)))),
        to_node_id: coalesce(endNode(rel).node_id, toString(id(endNode(rel)))),
        relationship: type(rel),
        properties: properties(rel)
      }] AS referenced_edges,
      [node IN nodes WHERE node IS NOT NULL AND coalesce(node.critical_domain, false) = true |
        coalesce(node.node_id, toString(id(node)))
      ] AS critical_domain_nodes
  `,
    subgraph_by_ids: `
    MATCH (n)
    WHERE coalesce(n.node_id, toString(id(n))) IN $node_ids
    OPTIONAL MATCH ()-[r]-()
    WHERE coalesce(r.edge_id, toString(id(r))) IN $edge_ids
    WITH collect(DISTINCT n) AS nodes, collect(DISTINCT r) AS rels
    RETURN
      [node IN nodes WHERE node IS NOT NULL | {
        node_id: coalesce(node.node_id, toString(id(node))),
        label: head(labels(node)),
        properties: properties(node)
      }] AS referenced_nodes,
      [rel IN rels WHERE rel IS NOT NULL | {
        edge_id: coalesce(rel.edge_id, toString(id(rel))),
        from_node_id: coalesce(startNode(rel).node_id, toString(id(startNode(rel)))),
        to_node_id: coalesce(endNode(rel).node_id, toString(id(endNode(rel)))),
        relationship: type(rel),
        properties: properties(rel)
      }] AS referenced_edges,
      [nodeId IN $critical_domain_node_ids WHERE nodeId IN [node IN nodes | coalesce(node.node_id, toString(id(node)))] |
        nodeId
      ] AS critical_domain_nodes
  `,
    canonical_constraints_for_feature: `
    MATCH (f:FeatureSpec {feature_id: $feature_id})
    OPTIONAL MATCH (f)-[:ENFORCES]->(r:GovernanceRule {authority_tier: "CANONICAL"})
    OPTIONAL MATCH (f)-[:USES_FEATURE_TYPE]->(ft:FeatureType)
    OPTIONAL MATCH (ft)<-[:VALIDATES_FEATURE]-(vb:ValidatorBundle {authority_tier: "CANONICAL", enforceable: true})
    OPTIONAL MATCH (ft)<-[:APPLIES_TO_FEATURE]-(bp:BridgePreset {authority_tier: "CANONICAL", enforceable: true})
    RETURN
      [r2 IN collect(DISTINCT r) WHERE r2 IS NOT NULL | {
        node_id: coalesce(r2.node_id, toString(id(r2))),
        name: r2.name,
        severity: r2.severity,
        enforced_by: r2.enforced_by,
        authority_tier: r2.authority_tier
      }] AS governance_rules,
      [vb2 IN collect(DISTINCT vb) WHERE vb2 IS NOT NULL | {
        node_id: coalesce(vb2.node_id, toString(id(vb2))),
        bundle_name: vb2.bundle_name,
        blocking_validators: vb2.blocking_validators,
        authority_tier: vb2.authority_tier
      }] AS validator_bundles,
      [bp2 IN collect(DISTINCT bp) WHERE bp2 IS NOT NULL | {
        node_id: coalesce(bp2.node_id, toString(id(bp2))),
        preset_name: bp2.preset_name,
        required_outcomes: bp2.required_outcomes,
        authority_tier: bp2.authority_tier
      }] AS bridge_presets
  `,
};
function rowValue(row, key) {
    if (typeof row.get === "function") {
        return row.get(key);
    }
    return row[key];
}
function normalizeNode(value) {
    const node = value;
    if (typeof node?.["node_id"] !== "string" ||
        typeof node?.["label"] !== "string" ||
        typeof node?.["properties"] !== "object" ||
        node["properties"] === null) {
        throw new Error("Neo4j truth query returned an invalid GraphNode shape.");
    }
    return {
        node_id: node["node_id"],
        label: node["label"],
        properties: node["properties"],
    };
}
function normalizeEdge(value) {
    const edge = value;
    if (typeof edge?.["edge_id"] !== "string" ||
        typeof edge?.["from_node_id"] !== "string" ||
        typeof edge?.["to_node_id"] !== "string" ||
        typeof edge?.["relationship"] !== "string" ||
        typeof edge?.["properties"] !== "object" ||
        edge["properties"] === null) {
        throw new Error("Neo4j truth query returned an invalid GraphEdge shape.");
    }
    return {
        edge_id: edge["edge_id"],
        from_node_id: edge["from_node_id"],
        to_node_id: edge["to_node_id"],
        relationship: edge["relationship"],
        properties: edge["properties"],
    };
}
function normalizeGraphSubgraphRow(row) {
    const referencedNodes = rowValue(row, "referenced_nodes");
    const referencedEdges = rowValue(row, "referenced_edges");
    const criticalDomainNodes = rowValue(row, "critical_domain_nodes");
    return {
        referenced_nodes: Array.isArray(referencedNodes)
            ? referencedNodes.map(normalizeNode)
            : [],
        referenced_edges: Array.isArray(referencedEdges)
            ? referencedEdges.map(normalizeEdge)
            : [],
        critical_domain_nodes: Array.isArray(criticalDomainNodes)
            ? criticalDomainNodes.filter((value) => typeof value === "string")
            : [],
    };
}
class Neo4jTruthAdapter {
    constructor(executor, options = {}) {
        this.executor = executor;
        this.queries = {
            ...exports.DEFAULT_NEO4J_TRUTH_QUERIES,
            ...options.queries,
        };
    }
    async fetchFeatureSubgraph(query) {
        const result = await this.executor.run(this.queries.feature_subgraph, {
            feature_id: query.feature_id,
            query_profile: query.query_profile ?? null,
        });
        if (result.rows.length === 0) {
            return {
                referenced_nodes: [],
                referenced_edges: [],
                critical_domain_nodes: [],
            };
        }
        return normalizeGraphSubgraphRow(result.rows[0]);
    }
    async fetchCanonicalConstraints(featureId) {
        const result = await this.executor.run(this.queries.canonical_constraints_for_feature, { feature_id: featureId });
        if (result.rows.length === 0) {
            return { governance_rules: [], validator_bundles: [], bridge_presets: [] };
        }
        const row = result.rows[0];
        const rawRules = rowValue(row, "governance_rules");
        const rawBundles = rowValue(row, "validator_bundles");
        const rawPresets = rowValue(row, "bridge_presets");
        return {
            governance_rules: Array.isArray(rawRules)
                ? rawRules.map((r) => {
                    const o = r;
                    return {
                        node_id: String(o["node_id"] ?? ""),
                        name: String(o["name"] ?? ""),
                        severity: String(o["severity"] ?? ""),
                        enforced_by: String(o["enforced_by"] ?? ""),
                        authority_tier: String(o["authority_tier"] ?? "CANONICAL"),
                    };
                })
                : [],
            validator_bundles: Array.isArray(rawBundles)
                ? rawBundles.map((b) => {
                    const o = b;
                    return {
                        node_id: String(o["node_id"] ?? ""),
                        bundle_name: String(o["bundle_name"] ?? ""),
                        blocking_validators: Array.isArray(o["blocking_validators"])
                            ? o["blocking_validators"]
                            : [],
                        authority_tier: String(o["authority_tier"] ?? "CANONICAL"),
                    };
                })
                : [],
            bridge_presets: Array.isArray(rawPresets)
                ? rawPresets.map((p) => {
                    const o = p;
                    return {
                        node_id: String(o["node_id"] ?? ""),
                        preset_name: String(o["preset_name"] ?? ""),
                        required_outcomes: Array.isArray(o["required_outcomes"])
                            ? o["required_outcomes"]
                            : [],
                        authority_tier: String(o["authority_tier"] ?? "CANONICAL"),
                    };
                })
                : [],
        };
    }
    async fetchSubgraphByIds(nodeIds, edgeIds, criticalDomainNodeIds = []) {
        const result = await this.executor.run(this.queries.subgraph_by_ids, {
            node_ids: nodeIds,
            edge_ids: edgeIds,
            critical_domain_node_ids: criticalDomainNodeIds,
        });
        if (result.rows.length === 0) {
            return {
                referenced_nodes: [],
                referenced_edges: [],
                critical_domain_nodes: [],
            };
        }
        return normalizeGraphSubgraphRow(result.rows[0]);
    }
}
exports.Neo4jTruthAdapter = Neo4jTruthAdapter;
class BoltNeo4jQueryExecutor {
    static async connectFromEnv(env = process.env) {
        const uri = env.AES_NEO4J_URI ?? env.NEO4J_URI;
        const username = env.AES_NEO4J_USERNAME ?? env.NEO4J_USERNAME ?? env.NEO4J_USER;
        const password = env.AES_NEO4J_PASSWORD ?? env.NEO4J_PASSWORD;
        if (!uri || !username || !password) {
            throw new Error("Missing Neo4j env config. Expected AES_NEO4J_URI, AES_NEO4J_USERNAME, AES_NEO4J_PASSWORD.");
        }
        return this.connect({
            uri,
            username,
            password,
            database: env.AES_NEO4J_DATABASE ?? env.NEO4J_DATABASE,
        });
    }
    static async connect(options) {
        // Dynamic load keeps the package usable without forcing the driver.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const neo4j = require("neo4j-driver");
        const driver = neo4j.driver(options.uri, neo4j.auth.basic(options.username, options.password));
        return new BoltNeo4jQueryExecutor(driver, options.database);
    }
    constructor(driver, database) {
        this.driver = driver;
        this.database = database;
    }
    async run(cypher, params = {}) {
        const session = this.driver.session(this.database ? { database: this.database } : undefined);
        try {
            const result = await session.run(cypher, params);
            return {
                rows: result.records.map((record) => typeof record.get === "function" ? record : record),
            };
        }
        finally {
            await session.close();
        }
    }
    async close() {
        await this.driver.close();
    }
}
exports.BoltNeo4jQueryExecutor = BoltNeo4jQueryExecutor;
//# sourceMappingURL=neo4j-truth-adapter.js.map