/**
 * AES Governance — Historical Scenario Converter
 *
 * Converts real build artifacts from a full end-to-end project build
 * into ReplayScenario records for governance training.
 *
 * A single "build Slack" run produces one scenario per feature build,
 * plus cross-feature scenarios for dependency ordering, orchestration
 * pauses, and integration-level outcomes.
 *
 * Input: ArtifactRegistry containing real build artifacts
 * Output: ReplayScenario[] ready for the governance training loop
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ReplayScenario } from "../types/governance-types";
/**
 * Load all historical scenarios from the artifact registry.
 *
 * Scans for all completed builds, resolves their associated artifacts,
 * and converts each into a ReplayScenario. Also generates cross-feature
 * scenarios for dependency and orchestration testing.
 */
export declare function loadHistoricalScenarios(registry: ArtifactRegistry): Promise<ReplayScenario[]>;
/**
 * Load scenarios for a specific app build only.
 */
export declare function loadAppScenarios(registry: ArtifactRegistry, appId: string): Promise<ReplayScenario[]>;
//# sourceMappingURL=historical-scenario-converter.d.ts.map