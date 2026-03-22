/**
 * AES Artifact Registry — ID Generator
 *
 * Produces stable, sortable, type-prefixed IDs.
 * Format: <PREFIX>-<timestamp_ms>-<random_hex>
 *
 * Prefixes are chosen to make IDs human-readable in logs and graph nodes
 * without requiring a lookup table.
 */
import type { ArtifactType } from "../types";
/**
 * Generate a new artifact ID for the given artifact type.
 *
 * Collision probability at 8 random hex bytes (~64 bits) is negligible
 * for the expected registry volumes.
 */
export declare function generateArtifactId(type: ArtifactType): string;
/**
 * Extract the artifact type from a prefixed ID.
 * Returns null if the prefix is unrecognised.
 */
export declare function artifactTypeFromId(id: string): ArtifactType | null;
//# sourceMappingURL=id-generator.d.ts.map