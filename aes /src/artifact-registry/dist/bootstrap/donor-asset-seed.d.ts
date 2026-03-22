import type { Neo4jQueryExecutor } from "../adapters";
export type CanonicalFeatureClass = "backend_platform" | "collaboration_system" | "notification_system" | "onboarding" | "payments_and_billing_verification" | "workflow";
export interface DonorAssetSeedSummary {
    feature_types_seeded: number;
    patterns_seeded: number;
    validator_bundles_seeded: number;
    bridge_presets_seeded: number;
    scenario_packs_seeded: number;
    feature_bindings_seeded: number;
}
export declare function seedCanonicalDonorAssets(executor: Neo4jQueryExecutor): Promise<DonorAssetSeedSummary>;
//# sourceMappingURL=donor-asset-seed.d.ts.map