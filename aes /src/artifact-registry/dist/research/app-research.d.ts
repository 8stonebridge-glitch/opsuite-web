/**
 * AES Research — App Research Service
 *
 * Stores research findings about comparable products, frontend UX patterns,
 * backend architecture, security, pitfalls, and operator manual steps as
 * ResearchNote artifacts.
 *
 * The actual Perplexity/external call happens at the HTTP layer.
 * This service receives the content and stores it with proper trust gating.
 *
 * Pattern follows: research-gateway.ts
 */
import type { ArtifactRegistry } from "../registry";
import type { HttpResearchGateway } from "./research-gateway";
import type { ResearchNote, StoredRecord } from "../types";
import type { StructuredResearchSummary } from "../types/research-types";
export type { StructuredResearchSummary } from "../types/research-types";
export interface AppResearchInput {
    app_id: string;
    app_summary: string;
    product_type?: string;
    target_users?: string[];
    /** Research content provided by caller (from Perplexity or other source) */
    research_content: string;
    /** Source identifier (e.g. "perplexity", "manual", "gemini") */
    source: string;
}
export interface AppResearchResult {
    research_notes: StoredRecord<ResearchNote>[];
    structured_summary: StructuredResearchSummary;
}
export declare class AppResearchService {
    readonly registry: ArtifactRegistry;
    private readonly researchGateway;
    readonly now: () => Date;
    constructor(registry: ArtifactRegistry, researchGateway: HttpResearchGateway, now?: () => Date);
    research(input: AppResearchInput): Promise<AppResearchResult>;
    addResearchNote(appId: string, source: string, content: string): Promise<StoredRecord<ResearchNote>>;
}
/**
 * Best-effort extraction of structured research summary from raw content.
 * If the content is already JSON with the expected shape, parse it.
 * Otherwise return empty defaults (the caller/decomposer handles raw text).
 */
export declare function parseResearchSummary(content: string): StructuredResearchSummary;
//# sourceMappingURL=app-research.d.ts.map