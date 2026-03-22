/**
 * AES Planning — Donor Feature Matcher
 *
 * Automatically matches Perplexity-identified features to donor observations
 * in the graph. Closes the gap between "Perplexity says this feature exists"
 * and "do we have donor depth for it?"
 *
 * Flow:
 *   1. Perplexity identifies features (breadth)
 *   2. This matcher queries donor data for each feature (depth check)
 *   3. Features with donor matches get high confidence + donor_mappings
 *   4. Features without donor matches get RESEARCH_REQUIRED routing
 *
 * Works with both graph-backed (Neo4j) and in-memory donor data.
 */
import type { DonorMapping } from "../types/app-spec";
import type { CandidateFeature } from "./app-decomposer";
/**
 * A donor observation that can be matched to a feature.
 * Can come from the graph (Neo4j) or from parsed study packets.
 */
export interface DonorObservation {
    observation_id: string;
    donor_name: string;
    feature_area: string;
    finding_summary: string;
    finding_detail: string;
    confidence: "high" | "medium-high" | "medium" | "low";
    /** Keywords extracted from the observation for matching */
    keywords: string[];
}
/**
 * A donor logic candidate that provides buildable depth.
 */
export interface DonorLogicCandidate {
    candidate_id: string;
    donor_name: string;
    canonical_statement: string;
    target_feature_area: string;
    preconditions: string;
    postconditions: string;
    failure_path: string;
    confidence: "high" | "medium-high" | "medium" | "low";
    keywords: string[];
}
/**
 * A donor validator requirement.
 */
export interface DonorValidatorReq {
    validator_id: string;
    donor_name: string;
    requirement_statement: string;
    pass_condition: string;
    blocking_level: "blocking" | "advisory";
    keywords: string[];
}
/**
 * Combined donor knowledge for matching.
 */
export interface DonorKnowledgeBase {
    observations: DonorObservation[];
    logic_candidates: DonorLogicCandidate[];
    validators: DonorValidatorReq[];
}
export interface DonorMatchResult {
    feature_name: string;
    has_donor_depth: boolean;
    confidence_boost: number;
    matched_observations: DonorObservation[];
    matched_logic: DonorLogicCandidate[];
    matched_validators: DonorValidatorReq[];
    donor_mappings: DonorMapping[];
    routing_recommendation: "DIRECT_BUILD" | "CAUTION_BUILD" | "RESEARCH_REQUIRED";
    match_score: number;
    match_explanation: string;
}
/**
 * Match a single feature against the donor knowledge base.
 */
export declare function matchFeatureToDonors(feature: CandidateFeature, kb: DonorKnowledgeBase): DonorMatchResult;
export interface BatchMatchResult {
    matches: DonorMatchResult[];
    features_with_depth: number;
    features_without_depth: number;
    direct_build_count: number;
    caution_build_count: number;
    research_required_count: number;
    coverage_rate: number;
}
/**
 * Match all candidate features against donor knowledge.
 * Returns enriched features with donor mappings and routing recommendations.
 */
export declare function matchAllFeatures(features: CandidateFeature[], kb: DonorKnowledgeBase): BatchMatchResult;
/**
 * Enrich candidate features with donor match results.
 * Features with donor depth get higher confidence and donor_mappings.
 * Features without donor depth keep low confidence.
 */
export declare function enrichFeaturesWithDonorMatches(features: CandidateFeature[], kb: DonorKnowledgeBase): CandidateFeature[];
/**
 * Parse a donor study packet markdown into a DonorKnowledgeBase.
 * Extracts observations, logic candidates, and validator requirements.
 *
 * This is a simplified parser — handles the structured format used
 * in slack_donor_study_packet.md and stripe_donor_study_packet.md.
 */
export declare function parseStudyPacket(markdown: string, donorName: string): DonorKnowledgeBase;
/**
 * Merge multiple knowledge bases into one.
 */
export declare function mergeKnowledgeBases(...bases: DonorKnowledgeBase[]): DonorKnowledgeBase;
//# sourceMappingURL=donor-feature-matcher.d.ts.map