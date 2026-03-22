/**
 * AES Governance — Synthetic Scenario Generator
 *
 * Generates replay scenarios from donor data and feature class knowledge.
 * Produces a mix of successful builds, failures, edge cases, and
 * intentional failure injections for governance training.
 *
 * Sources:
 *   - Donor scenario packs (already in the repo)
 *   - Feature class definitions from the graph
 *   - Known failure patterns
 *   - Intentional failure injections
 */
import type { ReplayScenario } from "../types/governance-types";
/**
 * Generate the baseline set of synthetic scenarios.
 * These cover the common build patterns and known failure modes.
 */
export declare function generateSyntheticScenarios(): ReplayScenario[];
//# sourceMappingURL=synthetic-scenarios.d.ts.map