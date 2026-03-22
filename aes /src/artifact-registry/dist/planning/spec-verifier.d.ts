/**
 * AES Planning — Spec Verifier
 *
 * Processes verification results (from Gemini or another independent reviewer)
 * into a structured VerificationReport. Stores the verification as a ResearchNote.
 *
 * The actual Gemini call happens at the HTTP layer.
 * This service receives the structured or raw result and normalizes it.
 */
import type { ArtifactRegistry } from "../registry";
import type { HttpResearchGateway } from "../research/research-gateway";
import type { AppSpec, FeatureSpec } from "../types/app-spec";
import type { VerificationReport } from "../types/promotion-types";
import type { ResearchNote, StoredRecord } from "../types";
export interface VerifySpecInput {
    app: AppSpec;
    features: FeatureSpec[];
    /** Verification content from Gemini (JSON or prose) */
    verification_content: string;
    /** Source identifier */
    source?: string;
}
export interface VerifySpecResult {
    report: VerificationReport;
    research_note: StoredRecord<ResearchNote>;
}
export declare class SpecVerifier {
    readonly registry: ArtifactRegistry;
    private readonly researchGateway;
    private readonly now;
    constructor(registry: ArtifactRegistry, researchGateway: HttpResearchGateway, now?: () => Date);
    verify(input: VerifySpecInput): Promise<VerifySpecResult>;
    buildReport(appId: string, rawVerification: string, features: FeatureSpec[]): VerificationReport;
}
//# sourceMappingURL=spec-verifier.d.ts.map