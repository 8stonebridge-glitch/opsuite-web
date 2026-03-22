"use strict";
/**
 * AES Graph Layer — Canonical Hashing and Drift Detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeGraphSubgraph = normalizeGraphSubgraph;
exports.computeGraphTruthHash = computeGraphTruthHash;
exports.detectGraphDrift = detectGraphDrift;
const crypto_1 = require("crypto");
function canonicalizeValue(value) {
    if (Array.isArray(value)) {
        return value.map((entry) => canonicalizeValue(entry));
    }
    if (value && typeof value === "object") {
        const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
        return Object.fromEntries(entries.map(([key, entry]) => [key, canonicalizeValue(entry)]));
    }
    return value;
}
function canonicalizeNode(node) {
    return {
        node_id: node.node_id,
        label: node.label,
        properties: canonicalizeValue(node.properties),
    };
}
function canonicalizeEdge(edge) {
    return {
        edge_id: edge.edge_id,
        from_node_id: edge.from_node_id,
        to_node_id: edge.to_node_id,
        relationship: edge.relationship,
        properties: canonicalizeValue(edge.properties),
    };
}
function normalizeGraphSubgraph(subgraph) {
    return {
        referenced_nodes: [...subgraph.referenced_nodes]
            .map((node) => canonicalizeNode(node))
            .sort((left, right) => left.node_id.localeCompare(right.node_id)),
        referenced_edges: [...subgraph.referenced_edges]
            .map((edge) => canonicalizeEdge(edge))
            .sort((left, right) => left.edge_id.localeCompare(right.edge_id)),
        critical_domain_nodes: [...subgraph.critical_domain_nodes].sort((left, right) => left.localeCompare(right)),
    };
}
function computeGraphTruthHash(subgraph) {
    const normalized = normalizeGraphSubgraph(subgraph);
    const digest = (0, crypto_1.createHash)("sha256")
        .update(JSON.stringify(normalized))
        .digest("hex");
    return `sha256:${digest}`;
}
function entryFingerprint(entry) {
    return JSON.stringify(canonicalizeValue(entry));
}
function detectGraphDrift(snapshot, current) {
    const previousNodes = new Map(snapshot.referenced_nodes.map((node) => [node.node_id, entryFingerprint(node)]));
    const currentNodes = new Map(current.referenced_nodes.map((node) => [node.node_id, entryFingerprint(node)]));
    const previousEdges = new Map(snapshot.referenced_edges.map((edge) => [edge.edge_id, entryFingerprint(edge)]));
    const currentEdges = new Map(current.referenced_edges.map((edge) => [edge.edge_id, entryFingerprint(edge)]));
    const changed_node_ids = [...new Set([...previousNodes.keys(), ...currentNodes.keys()])]
        .filter((nodeId) => previousNodes.get(nodeId) !== currentNodes.get(nodeId))
        .sort((left, right) => left.localeCompare(right));
    const changed_edge_ids = [...new Set([...previousEdges.keys(), ...currentEdges.keys()])]
        .filter((edgeId) => previousEdges.get(edgeId) !== currentEdges.get(edgeId))
        .sort((left, right) => left.localeCompare(right));
    return { changed_node_ids, changed_edge_ids };
}
//# sourceMappingURL=hash.js.map