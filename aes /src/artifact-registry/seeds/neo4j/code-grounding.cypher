// ─── Code Grounding Schema ──────────────────────────────────────────────────
// Adds file-level code topology to the graph.
// Additive only — does not modify existing schema.
//
// Node labels: SourceFile
// Relationships: IMPORTS, IMPLEMENTED_BY
// All inferred links carry scan_source and inference_confidence metadata.

// ─── Indexes for SourceFile ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS FOR (sf:SourceFile) ON (sf.path);
CREATE INDEX IF NOT EXISTS FOR (sf:SourceFile) ON (sf.language);
CREATE INDEX IF NOT EXISTS FOR (sf:SourceFile) ON (sf.file_hash);

// ─── Constraint: unique file path ───────────────────────────────────────────
CREATE CONSTRAINT IF NOT EXISTS FOR (sf:SourceFile) REQUIRE sf.path IS UNIQUE;

// ─── Example seed: AES core entrypoints ─────────────────────────────────────
// These will be populated by the ingestion scanner, but seeding known
// entrypoints gives the graph an initial code-grounding layer.

MERGE (sf1:SourceFile {path: "src/artifact-registry/src/ui/operator-http-server.ts"})
SET sf1 += {
  language: "typescript",
  file_hash: "",
  last_scanned_at: "",
  line_count: 0,
  scan_source: "manual",
  inference_confidence: 1.0
}

MERGE (sf2:SourceFile {path: "src/artifact-registry/src/runtime/platform-runtime.ts"})
SET sf2 += {
  language: "typescript",
  file_hash: "",
  last_scanned_at: "",
  line_count: 0,
  scan_source: "manual",
  inference_confidence: 1.0
}

MERGE (sf3:SourceFile {path: "src/artifact-registry/src/policy/policy-engine.ts"})
SET sf3 += {
  language: "typescript",
  file_hash: "",
  last_scanned_at: "",
  line_count: 0,
  scan_source: "manual",
  inference_confidence: 1.0
}

MERGE (sf4:SourceFile {path: "src/artifact-registry/src/policy/confidence-engine.ts"})
SET sf4 += {
  language: "typescript",
  file_hash: "",
  last_scanned_at: "",
  line_count: 0,
  scan_source: "manual",
  inference_confidence: 1.0
}

MERGE (sf5:SourceFile {path: "src/artifact-registry/src/policy/hard-veto-engine.ts"})
SET sf5 += {
  language: "typescript",
  file_hash: "",
  last_scanned_at: "",
  line_count: 0,
  scan_source: "manual",
  inference_confidence: 1.0
}

MERGE (sf6:SourceFile {path: "src/artifact-registry/src/planning/promotion-engine.ts"})
SET sf6 += {
  language: "typescript",
  file_hash: "",
  last_scanned_at: "",
  line_count: 0,
  scan_source: "manual",
  inference_confidence: 1.0
}

MERGE (sf7:SourceFile {path: "src/artifact-registry/src/governance/governance-gateway.ts"})
SET sf7 += {
  language: "typescript",
  file_hash: "",
  last_scanned_at: "",
  line_count: 0,
  scan_source: "manual",
  inference_confidence: 1.0
}

MERGE (sf8:SourceFile {path: "src/artifact-registry/src/registry/registry.ts"})
SET sf8 += {
  language: "typescript",
  file_hash: "",
  last_scanned_at: "",
  line_count: 0,
  scan_source: "manual",
  inference_confidence: 1.0
}

// ─── IMPLEMENTED_BY: Link features to their source files ────────────────────

MATCH (f:FeatureSpec {feature_id: "FEAT-AES-REAL-001"})
MATCH (sf:SourceFile {path: "src/artifact-registry/src/ui/operator-http-server.ts"})
MERGE (f)-[r:IMPLEMENTED_BY]->(sf)
SET r += {
  relationship_type: "primary",
  scan_source: "manual",
  inference_confidence: 1.0
}

MATCH (f:FeatureSpec {feature_id: "FEAT-AES-REAL-002"})
MATCH (sf:SourceFile {path: "src/artifact-registry/src/runtime/platform-runtime.ts"})
MERGE (f)-[r:IMPLEMENTED_BY]->(sf)
SET r += {
  relationship_type: "primary",
  scan_source: "manual",
  inference_confidence: 1.0
}

// ─── IMPORTS: Known import relationships ────────────────────────────────────

MATCH (a:SourceFile {path: "src/artifact-registry/src/policy/policy-engine.ts"})
MATCH (b:SourceFile {path: "src/artifact-registry/src/policy/confidence-engine.ts"})
MERGE (a)-[r:IMPORTS]->(b)
SET r += {
  import_type: "static",
  scan_source: "manual",
  inference_confidence: 1.0
}

MATCH (a:SourceFile {path: "src/artifact-registry/src/policy/policy-engine.ts"})
MATCH (b:SourceFile {path: "src/artifact-registry/src/policy/hard-veto-engine.ts"})
MERGE (a)-[r:IMPORTS]->(b)
SET r += {
  import_type: "static",
  scan_source: "manual",
  inference_confidence: 1.0
}
