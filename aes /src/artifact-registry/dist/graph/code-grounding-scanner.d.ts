/**
 * AES Graph — Code Grounding Scanner
 *
 * Scans the repository and populates SourceFile nodes and IMPORTS edges
 * in the Neo4j graph. Additive and backward-compatible.
 *
 * Requirements:
 *   - Does not break existing graph schema
 *   - Preserves evidence provenance separately from canonical truth
 *   - Inferred links carry source metadata and inference_confidence
 *   - Source values: import_scan, manual, test_mapping
 */
import type { SourceFileNode, ImportsEdge, ImplementedByEdge } from "../types/governance-types";
export interface ScanResult {
    files: SourceFileNode[];
    imports: ImportsEdge[];
    feature_links: ImplementedByEdge[];
    scanned_at: string;
    file_count: number;
    import_count: number;
}
/**
 * Scan a directory tree and extract file-level code grounding data.
 */
export declare function scanRepository(repoRoot: string, srcPrefix?: string): ScanResult;
export interface Neo4jWriter {
    run(query: string, params?: Record<string, unknown>): Promise<void>;
}
/**
 * Write scan results to Neo4j.
 * Uses MERGE to be idempotent — safe to run repeatedly.
 */
export declare function writeScanToGraph(writer: Neo4jWriter, result: ScanResult): Promise<{
    nodes_written: number;
    edges_written: number;
}>;
//# sourceMappingURL=code-grounding-scanner.d.ts.map