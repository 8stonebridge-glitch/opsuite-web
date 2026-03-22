/**
 * AES Story Generator Agent
 *
 * Generates user stories, usage narratives, and journey states for each feature.
 * Merges founder intent with research-derived expectations.
 *
 * Rule: founder intent sets product direction, research adds realism.
 * Research NEVER overwrites the invention.
 *
 * Pipeline position: runs AFTER research observers, BEFORE decomposer finalizes.
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { FeatureSpec } from "../types/app-spec";
import type { StructuredResearchSummary } from "../types/research-types";
import type { FeatureUserContext, ClassifiedResearchFinding, FounderIntent } from "../types/user-story-types";
export interface GenerateStoriesInput {
    feature: FeatureSpec;
    app_id: string;
    founder_intent: FounderIntent;
    research_summary?: StructuredResearchSummary;
    /** Pre-classified findings from user review. If absent, system classifies. */
    user_classified_findings?: ClassifiedResearchFinding[];
}
export interface GenerateStoriesResult {
    context: FeatureUserContext;
    /** Whether this needs user review before proceeding */
    needs_user_review: boolean;
    /** Questions for the user if review needed */
    review_questions: string[];
}
export declare class StoryGenerator {
    private readonly now;
    constructor(_registry: ArtifactRegistry, now?: () => Date);
    generate(input: GenerateStoriesInput): GenerateStoriesResult;
    /**
     * When the user hasn't classified research findings, the system does it
     * using the founder intent as the filter.
     *
     * Rule: if a finding conflicts with founder intent → REJECTED
     *       if a finding supports founder intent → BORROW
     *       if a finding represents user expectation → EXPECT
     *       if a finding is a known anti-pattern → AVOID
     */
    private autoClassifyFindings;
    private classifyFinding;
    private synthesize;
    private generateUserStories;
    private inferSoThat;
    private inferPriority;
    private generateNarratives;
    private inferTrigger;
    private inferFirstAction;
    private inferNeededInfo;
    private inferDecisionPoint;
    private inferFailureModes;
    private inferNextSteps;
    private inferTrustMoments;
    private inferDropOffRisks;
    private generateJourneys;
    private inferMainFlow;
    private inferAlternateFlows;
    private inferFailureFlows;
    private computeConfidence;
    private generateReviewQuestions;
}
//# sourceMappingURL=story-generator.d.ts.map