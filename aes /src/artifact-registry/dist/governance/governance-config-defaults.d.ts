/**
 * AES Governance — Default Config Factory
 *
 * Creates the baseline GovernanceConfig artifact with all current
 * hardcoded values extracted into the trainable/frozen structure.
 *
 * These are the exact values from the current codebase:
 *   - confidence weights from common.ts computeConfidence()
 *   - routing thresholds from confidence-engine.ts routeConfidence()
 *   - authority tier weights from common.ts AUTHORITY_TIER_WEIGHTS
 *   - hard veto codes from common.ts HardVetoCode
 *   - promotion thresholds from promotion-engine.ts
 */
import type { GovernanceConfig, TrainableGovernance, FrozenGovernance } from "../types/governance-types";
export declare function createDefaultTrainable(): TrainableGovernance;
export declare function createDefaultFrozen(): FrozenGovernance;
/**
 * Create the initial baseline GovernanceConfig.
 * This is the v1 CANONICAL config that the loop measures improvements against.
 */
export declare function createBaselineGovernanceConfig(): GovernanceConfig;
/**
 * Validate that a governance config is structurally sound.
 * Used before writing to the registry.
 */
export declare function validateGovernanceConfig(config: GovernanceConfig): {
    valid: boolean;
    issues: string[];
};
//# sourceMappingURL=governance-config-defaults.d.ts.map