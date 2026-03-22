/**
 * AES Artifact Registry — Artifact Metadata
 *
 * Single source of truth for per-artifact-type constants.
 * Both the ID generator and the registry derive from this map,
 * eliminating drift risk between parallel maps.
 */
import type { ArtifactType } from "../types";
export interface ArtifactMeta {
    /** Short prefix for generated IDs (e.g. "BRG") */
    prefix: string;
    /** Payload field that holds the artifact's primary ID (e.g. "bridge_id") */
    idField: string;
}
export declare const ARTIFACT_META: Record<ArtifactType, ArtifactMeta>;
//# sourceMappingURL=artifact-meta.d.ts.map