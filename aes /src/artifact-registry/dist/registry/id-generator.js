"use strict";
/**
 * AES Artifact Registry — ID Generator
 *
 * Produces stable, sortable, type-prefixed IDs.
 * Format: <PREFIX>-<timestamp_ms>-<random_hex>
 *
 * Prefixes are chosen to make IDs human-readable in logs and graph nodes
 * without requiring a lookup table.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateArtifactId = generateArtifactId;
exports.artifactTypeFromId = artifactTypeFromId;
const crypto_1 = require("crypto");
const artifact_meta_1 = require("./artifact-meta");
/**
 * Generate a new artifact ID for the given artifact type.
 *
 * Collision probability at 8 random hex bytes (~64 bits) is negligible
 * for the expected registry volumes.
 */
function generateArtifactId(type) {
    const prefix = artifact_meta_1.ARTIFACT_META[type].prefix;
    const ts = Date.now();
    const rand = (0, crypto_1.randomBytes)(8).toString("hex");
    return `${prefix}-${ts}-${rand}`;
}
/**
 * Extract the artifact type from a prefixed ID.
 * Returns null if the prefix is unrecognised.
 */
function artifactTypeFromId(id) {
    const prefix = id.split("-")[0];
    const entry = Object.entries(artifact_meta_1.ARTIFACT_META).find(([, meta]) => meta.prefix === prefix);
    return entry ? entry[0] : null;
}
//# sourceMappingURL=id-generator.js.map