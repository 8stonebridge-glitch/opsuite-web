/**
 * AES Artifact Registry — ID Generator
 *
 * Produces stable, sortable, type-prefixed IDs.
 * Format: <PREFIX>-<timestamp_ms>-<random_hex>
 *
 * Prefixes are chosen to make IDs human-readable in logs and graph nodes
 * without requiring a lookup table.
 */

import { randomBytes } from "crypto";
import type { ArtifactType } from "../types";
import { ARTIFACT_META } from "./artifact-meta";

/**
 * Generate a new artifact ID for the given artifact type.
 *
 * Collision probability at 8 random hex bytes (~64 bits) is negligible
 * for the expected registry volumes.
 */
export function generateArtifactId(type: ArtifactType): string {
  const prefix = ARTIFACT_META[type].prefix;
  const ts = Date.now();
  const rand = randomBytes(8).toString("hex");
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Extract the artifact type from a prefixed ID.
 * Returns null if the prefix is unrecognised.
 */
export function artifactTypeFromId(id: string): ArtifactType | null {
  const prefix = id.split("-")[0];
  const entry = Object.entries(ARTIFACT_META).find(
    ([, meta]) => meta.prefix === prefix
  );
  return entry ? (entry[0] as ArtifactType) : null;
}
