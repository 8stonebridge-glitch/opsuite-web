/**
 * AES Planning — App Decomposer
 *
 * Validates and structures a feature decomposition.
 * The actual decomposition intelligence comes from the operator/Claude
 * at the HTTP layer. This service validates the structured output,
 * generates IDs, checks coverage, and orders dependencies.
 *
 * When research is provided, the decomposer enriches features:
 *   - frontend_surfaces ← from research common_screens
 *   - failure_states ← from research empty/loading/error states + security risks
 *   - auth_requirements ← from research auth_pitfalls
 *   - integrations ← from research stack_guides
 *   - acceptance_criteria ← from security checklist items
 *   - confidence scores ← research coverage depth
 *
 * All output starts as CANDIDATE — never PROMOTED.
 */
import type { AppSpec, FeatureSpec } from "../types/app-spec";
import type { StructuredResearchSummary } from "../types/research-types";
import type { OperatorManualSteps, Pitfall } from "../types/research-types";
export interface DecomposeAppInput {
    app: AppSpec;
    /** Structured features from Claude / the operator */
    candidate_features: CandidateFeature[];
    research_summary?: StructuredResearchSummary;
}
/**
 * What the caller provides — a feature proposal without IDs or status.
 * The decomposer normalizes this into a full FeatureSpec.
 */
export interface CandidateFeature {
    name: string;
    description: string;
    feature_type: string;
    donor_mappings?: FeatureSpec["donor_mappings"];
    /** References other candidate features by name (resolved to IDs) */
    depends_on?: string[];
    user_roles?: string[];
    backend_surfaces?: FeatureSpec["backend_surfaces"];
    frontend_surfaces?: FeatureSpec["frontend_surfaces"];
    auth_requirements?: FeatureSpec["auth_requirements"];
    data_entities?: FeatureSpec["data_entities"];
    events?: FeatureSpec["events"];
    integrations?: FeatureSpec["integrations"];
    failure_states?: FeatureSpec["failure_states"];
    destructive_actions?: FeatureSpec["destructive_actions"];
    acceptance_criteria?: FeatureSpec["acceptance_criteria"];
    test_cases?: FeatureSpec["test_cases"];
    missing_questions?: string[];
    confidence?: Partial<FeatureSpec["confidence_summary"]>;
}
export interface DecomposeAppResult {
    features: FeatureSpec[];
    dependency_order: string[];
    coverage_report: CoverageReport;
    /** Operator manual steps extracted from research (empty if no research) */
    operator_checklist: OperatorManualSteps;
    /** Pitfalls the operator must handle (who_fixes_it !== "claude") */
    operator_pitfalls: Pitfall[];
}
export interface CoverageReport {
    backend_surface_count: number;
    frontend_surface_count: number;
    role_coverage: Record<string, string[]>;
    missing_coverage: string[];
    /** How many research domains had data */
    research_domains_covered: number;
    /** Total research domains possible */
    research_domains_total: number;
}
export declare class AppDecomposer {
    private readonly now;
    constructor(now?: () => Date);
    decompose(input: DecomposeAppInput): DecomposeAppResult;
    checkCoverage(features: FeatureSpec[], app: AppSpec, researchDepth: {
        domainsCovered: number;
        domainsTotal: number;
    }): CoverageReport;
}
//# sourceMappingURL=app-decomposer.d.ts.map