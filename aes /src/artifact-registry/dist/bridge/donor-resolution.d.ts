import type { AcceptanceCriterion, GraphEdge, GraphNode, TestCase, TieredConstraint } from "../types";
export interface DonorExecutionPayload {
    feature_class: string | null;
    pattern_ids: string[];
    validator_bundle_ids: string[];
    bridge_preset_id: string | null;
    scenario_pack_ids: string[];
    source_donor_lineage: string[];
    pattern_summaries: Array<{
        id: string;
        pattern_name: string;
        summary: string;
    }>;
    validator_bundles: Array<{
        id: string;
        bundle_name: string;
        blocking_validators: string[];
        advisory_validators: string[];
    }>;
    bridge_preset: {
        id: string;
        preset_name: string;
        required_outcomes: string[];
        approved_surface_scope: string[];
        required_validators: string[];
    } | null;
    scenario_packs: Array<{
        id: string;
        scenario_name: string;
        setup_conditions: string[];
        expected_states: string[];
        expected_actions: string[];
        expected_validators: string[];
    }>;
}
export interface DonorResolvedBridgeInputs {
    feature_class: string | null;
    patterns: string[];
    constraints: string[];
    tiered_constraints: TieredConstraint[];
    anti_patterns: string[];
    acceptance_criteria: AcceptanceCriterion[];
    test_cases: TestCase[];
    execution_payload: DonorExecutionPayload;
}
export declare function resolveDonorBridgeInputs(featureId: string, referencedNodes: GraphNode[], referencedEdges: GraphEdge[]): DonorResolvedBridgeInputs;
//# sourceMappingURL=donor-resolution.d.ts.map