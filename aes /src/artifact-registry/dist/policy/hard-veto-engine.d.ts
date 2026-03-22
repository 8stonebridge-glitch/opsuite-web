/**
 * AES Policy Layer — Hard Veto Engine
 *
 * Evaluates non-negotiable stop conditions before confidence routing.
 */
import type { Bridge, HardVeto, TieredConstraint } from "../types";
export interface HardVetoInput {
    bridge: Pick<Bridge, "status" | "test_cases" | "acceptance_criteria" | "constraints" | "dependency_type" | "depends_on_bridge_ids" | "write_scope" | "read_scope" | "api_contracts" | "events" | "db_touches" | "component_boundaries">;
    is_fresh: boolean;
    dependencies_satisfied: boolean;
    critical_graph_truth_changed?: boolean;
    unresolved_validator_hard_fail?: boolean;
    critical_rule_contradiction?: boolean;
    invalid_bridge_boundary?: boolean;
    canonical_constraints?: TieredConstraint[];
    /** Feature touches auth but auth model is ambiguous or undefined */
    auth_ambiguity?: boolean;
    /** Feature touches permissions but permission model is ambiguous */
    permission_ambiguity?: boolean;
    /** Feature has data ownership that is unresolved across features */
    missing_data_ownership?: boolean;
    /** Feature includes destructive behavior without confirmation/undo */
    undefined_destructive_behavior?: boolean;
    /** Feature has unresolved dependency conflicts */
    unresolved_dependency_conflict?: boolean;
    /** Feature has incomplete acceptance tests for critical flows */
    incomplete_critical_acceptance_tests?: boolean;
    /** Risk domain tags for the feature */
    risk_domain_tags?: string[];
}
export declare function evaluateHardVetoes(input: HardVetoInput): HardVeto[];
//# sourceMappingURL=hard-veto-engine.d.ts.map