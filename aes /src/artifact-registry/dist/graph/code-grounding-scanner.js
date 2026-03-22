"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanRepository = scanRepository;
exports.writeScanToGraph = writeScanToGraph;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
// ─── File Discovery ─────────────────────────────────────────────────────────
const SUPPORTED_EXTENSIONS = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".json": "json",
    ".css": "css",
    ".scss": "scss",
    ".html": "html",
    ".sql": "sql",
    ".cypher": "cypher",
    ".md": "markdown",
};
const IGNORED_DIRS = new Set([
    "node_modules",
    ".git",
    "dist",
    ".next",
    ".turbo",
    "coverage",
    ".claude",
]);
/**
 * Scan a directory tree and extract file-level code grounding data.
 */
function scanRepository(repoRoot, srcPrefix) {
    const scanRoot = srcPrefix ? path.join(repoRoot, srcPrefix) : repoRoot;
    const files = [];
    const imports = [];
    const scannedAt = new Date().toISOString();
    walkDir(scanRoot, repoRoot, files, imports, scannedAt);
    return {
        files,
        imports,
        feature_links: [], // populated separately via feature mapping
        scanned_at: scannedAt,
        file_count: files.length,
        import_count: imports.length,
    };
}
function walkDir(dir, repoRoot, files, imports, scannedAt) {
    let entries;
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!IGNORED_DIRS.has(entry.name)) {
                walkDir(fullPath, repoRoot, files, imports, scannedAt);
            }
            continue;
        }
        if (!entry.isFile())
            continue;
        const ext = path.extname(entry.name);
        const language = SUPPORTED_EXTENSIONS[ext];
        if (!language)
            continue;
        const relativePath = path.relative(repoRoot, fullPath);
        const content = safeReadFile(fullPath);
        if (content === null)
            continue;
        const lineCount = content.split("\n").length;
        const fileHash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
        const fileNode = {
            node_id: `SF-${fileHash}`,
            path: relativePath,
            language,
            file_hash: fileHash,
            last_scanned_at: scannedAt,
            line_count: lineCount,
            scan_source: "import_scan",
            inference_confidence: 1.0,
        };
        files.push(fileNode);
        // Extract imports for TypeScript/JavaScript files
        if (language === "typescript" || language === "javascript") {
            const fileImports = extractImports(content, relativePath, repoRoot, fullPath);
            imports.push(...fileImports);
        }
    }
}
// ─── Import Extraction ──────────────────────────────────────────────────────
/**
 * Extract import statements from TypeScript/JavaScript files.
 * Only tracks relative imports (./  ../) — ignores node_modules packages.
 */
function extractImports(content, fromFile, repoRoot, fullPath) {
    const edges = [];
    const dir = path.dirname(fullPath);
    // Match: import ... from "..." / import ... from '...'
    // Match: require("...") / require('...')
    // Match: export ... from "..."
    const importRegex = /(?:import|export)\s+.*?from\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        const specifier = match[1] ?? match[2];
        if (!specifier)
            continue;
        // Only track relative imports
        if (!specifier.startsWith("."))
            continue;
        const resolvedPath = resolveImportPath(specifier, dir, repoRoot);
        if (!resolvedPath)
            continue;
        const importType = match[0].includes("require") ? "dynamic" : "static";
        edges.push({
            from_file: fromFile,
            to_file: resolvedPath,
            import_type: importType,
            scan_source: "import_scan",
            inference_confidence: 0.95, // high but not 1.0 since resolution is heuristic
        });
    }
    return edges;
}
/**
 * Resolve an import specifier to a relative file path.
 * Tries common TypeScript resolution: .ts, .tsx, /index.ts, /index.tsx
 */
function resolveImportPath(specifier, fromDir, repoRoot) {
    const base = path.resolve(fromDir, specifier);
    const candidates = [
        base + ".ts",
        base + ".tsx",
        base + ".js",
        base + ".jsx",
        path.join(base, "index.ts"),
        path.join(base, "index.tsx"),
        path.join(base, "index.js"),
        base, // exact match
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return path.relative(repoRoot, candidate);
        }
    }
    return null;
}
/**
 * Write scan results to Neo4j.
 * Uses MERGE to be idempotent — safe to run repeatedly.
 */
async function writeScanToGraph(writer, result) {
    let nodesWritten = 0;
    let edgesWritten = 0;
    // Batch SourceFile nodes
    for (const file of result.files) {
        await writer.run(`MERGE (sf:SourceFile {path: $path})
       SET sf += {
         language: $language,
         file_hash: $file_hash,
         last_scanned_at: $last_scanned_at,
         line_count: $line_count,
         scan_source: $scan_source,
         inference_confidence: $inference_confidence
       }`, {
            path: file.path,
            language: file.language,
            file_hash: file.file_hash,
            last_scanned_at: file.last_scanned_at,
            line_count: file.line_count,
            scan_source: file.scan_source,
            inference_confidence: file.inference_confidence,
        });
        nodesWritten++;
    }
    // Batch IMPORTS edges
    for (const imp of result.imports) {
        await writer.run(`MATCH (a:SourceFile {path: $from_file})
       MATCH (b:SourceFile {path: $to_file})
       MERGE (a)-[r:IMPORTS]->(b)
       SET r += {
         import_type: $import_type,
         scan_source: $scan_source,
         inference_confidence: $inference_confidence
       }`, {
            from_file: imp.from_file,
            to_file: imp.to_file,
            import_type: imp.import_type,
            scan_source: imp.scan_source,
            inference_confidence: imp.inference_confidence,
        });
        edgesWritten++;
    }
    // Feature links
    for (const link of result.feature_links) {
        await writer.run(`MATCH (f:FeatureSpec {feature_id: $feature_id})
       MATCH (sf:SourceFile {path: $file_path})
       MERGE (f)-[r:IMPLEMENTED_BY]->(sf)
       SET r += {
         relationship_type: $relationship_type,
         scan_source: $scan_source,
         inference_confidence: $inference_confidence
       }`, {
            feature_id: link.feature_id,
            file_path: link.file_path,
            relationship_type: link.relationship_type,
            scan_source: link.scan_source,
            inference_confidence: link.inference_confidence,
        });
        edgesWritten++;
    }
    return { nodes_written: nodesWritten, edges_written: edgesWritten };
}
// ─── Helpers ────────────────────────────────────────────────────────────────
function safeReadFile(filePath) {
    try {
        return fs.readFileSync(filePath, "utf-8");
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=code-grounding-scanner.js.map