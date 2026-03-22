import { ArtifactRegistry } from "../registry";
import type { ArtifactRef, ResearchNote, StoredRecord } from "../types";
export interface RecordResearchNoteInput {
    feature_id: string;
    source: string;
    content: string;
    trust_status?: ResearchNote["trust_status"];
    filtered_by?: string | null;
    artifact_refs?: ArtifactRef[];
}
export interface CaptureResearchFromUrlInput {
    feature_id: string;
    url: string;
    source?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    max_chars?: number;
    trust_status?: ResearchNote["trust_status"];
    artifact_refs?: ArtifactRef[];
}
export interface ResearchFetchResult {
    record: StoredRecord<ResearchNote>;
    status: number;
    content_type: string | null;
}
type FetchLike = (input: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}) => Promise<{
    status: number;
    headers: {
        get(name: string): string | null;
    };
    text(): Promise<string>;
}>;
export declare class HttpResearchGateway {
    private readonly registry;
    private readonly fetchFn;
    private readonly now;
    constructor(registry: ArtifactRegistry, fetchFn?: FetchLike, now?: () => Date);
    recordNote(input: RecordResearchNoteInput): Promise<StoredRecord<ResearchNote>>;
    captureFromUrl(input: CaptureResearchFromUrlInput): Promise<ResearchFetchResult>;
    markFiltered(researchNoteId: string, filteredBy: string, artifactRefs?: ArtifactRef[]): Promise<StoredRecord<ResearchNote>>;
    markRecorded(researchNoteId: string, filteredBy: string, artifactRefs?: ArtifactRef[]): Promise<StoredRecord<ResearchNote>>;
}
export {};
//# sourceMappingURL=research-gateway.d.ts.map