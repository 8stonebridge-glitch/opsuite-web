"use strict";
/**
 * AES Build Strategy Selector
 *
 * Decides HOW a feature should be built based on:
 *   - risk level
 *   - historical success rate (from graph)
 *   - donor coverage
 *   - feature complexity
 *
 * Strategies:
 *   ONE_PASS  — standard build, bridge + builder in one shot
 *   TWO_PASS  — types/signatures first (typecheck), then implementation (test)
 *   SKELETON  — provide reference skeleton in bridge, builder fills in logic
 *   ESCALATE  — too risky for automated build, needs human design
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildStrategySelector = void 0;
const DEFAULT_THRESHOLDS = {
    two_pass_threshold: 0.70,
    skeleton_threshold: 0.50,
    escalate_threshold: 0.30,
    min_builds_for_history: 3,
    complex_criteria_threshold: 8,
    always_two_pass_risks: ["high", "critical"],
    always_escalate_domains: ["billing", "permissions", "destructive"],
};
// ─── Selector ────────────────────────────────────────────────────────────────
class BuildStrategySelector {
    constructor(_registry, thresholds, _now = () => new Date()) {
        this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    }
    select(input) {
        const reasoning = [];
        const recommendations = [];
        let strategy = "ONE_PASS";
        let confidence = 0.8;
        // Rule 1: Always-escalate domains
        if (input.domain_tags.some(t => this.thresholds.always_escalate_domains.includes(t))) {
            strategy = "ESCALATE";
            reasoning.push(`Domain tags ${input.domain_tags.join(", ")} require human review`);
            return this.buildResult(strategy, 0.95, reasoning, recommendations, input);
        }
        // Rule 2: Critical risk always escalates
        if (input.risk === "critical") {
            strategy = "ESCALATE";
            reasoning.push("Critical risk features require human design");
            return this.buildResult(strategy, 0.95, reasoning, recommendations, input);
        }
        // Rule 3: High risk → at least TWO_PASS
        if (this.thresholds.always_two_pass_risks.includes(input.risk)) {
            strategy = "TWO_PASS";
            reasoning.push(`Risk level '${input.risk}' defaults to TWO_PASS`);
            confidence = 0.7;
        }
        // Rule 4: Historical success rate (if we have enough data)
        if (input.historical_success_rate !== null &&
            input.prior_build_count >= this.thresholds.min_builds_for_history) {
            const rate = input.historical_success_rate;
            if (rate < this.thresholds.escalate_threshold) {
                strategy = "ESCALATE";
                reasoning.push(`Historical success rate ${(rate * 100).toFixed(0)}% is below escalate threshold ${(this.thresholds.escalate_threshold * 100).toFixed(0)}%`);
                confidence = 0.9;
            }
            else if (rate < this.thresholds.skeleton_threshold) {
                strategy = "SKELETON";
                reasoning.push(`Historical success rate ${(rate * 100).toFixed(0)}% is below skeleton threshold — providing reference implementation`);
                confidence = 0.85;
                recommendations.push("Include type definitions and function signatures in bridge");
                recommendations.push("Include test template in bridge");
                recommendations.push("Include known failure modes in bridge");
            }
            else if (rate < this.thresholds.two_pass_threshold) {
                if (strategy !== "SKELETON") {
                    strategy = "TWO_PASS";
                    reasoning.push(`Historical success rate ${(rate * 100).toFixed(0)}% is below two-pass threshold`);
                    confidence = 0.75;
                }
            }
            else {
                reasoning.push(`Historical success rate ${(rate * 100).toFixed(0)}% is above all thresholds`);
            }
        }
        else if (input.prior_build_count < this.thresholds.min_builds_for_history) {
            reasoning.push(`Only ${input.prior_build_count} prior builds — insufficient history, using conservative strategy`);
            if (input.risk === "high" && strategy === "TWO_PASS") {
                strategy = "SKELETON";
                reasoning.push("Upgrading to SKELETON due to high risk + no history");
                recommendations.push("Research this feature type before building");
            }
        }
        // Rule 5: Complex features → at least TWO_PASS
        if (input.acceptance_criteria_count >= this.thresholds.complex_criteria_threshold &&
            strategy === "ONE_PASS") {
            strategy = "TWO_PASS";
            reasoning.push(`${input.acceptance_criteria_count} acceptance criteria exceeds complexity threshold`);
        }
        // Rule 6: No donor coverage + no research → recommend research
        if (!input.has_donor_coverage && !input.has_research_evidence) {
            recommendations.push("No donor or research evidence — recommend Perplexity research before build");
            if (strategy === "ONE_PASS") {
                strategy = "TWO_PASS";
                reasoning.push("No evidence coverage — upgrading to TWO_PASS for safety");
            }
        }
        // Rule 7: Donor coverage boosts confidence
        if (input.has_donor_coverage) {
            confidence = Math.min(confidence + 0.1, 0.95);
            reasoning.push("Donor coverage available — confidence boosted");
        }
        // Rule 8: Research evidence boosts confidence
        if (input.has_research_evidence) {
            confidence = Math.min(confidence + 0.05, 0.95);
            reasoning.push("Research evidence available — confidence boosted");
        }
        return this.buildResult(strategy, confidence, reasoning, recommendations, input);
    }
    buildResult(strategy, confidence, reasoning, recommendations, input) {
        return {
            strategy,
            confidence,
            reasoning,
            recommendations,
            requires_skeleton: strategy === "SKELETON",
            requires_two_pass: strategy === "TWO_PASS" || strategy === "SKELETON",
            requires_research: !input.has_donor_coverage && !input.has_research_evidence,
            requires_human_review: strategy === "ESCALATE",
            artifact_refs: [],
        };
    }
}
exports.BuildStrategySelector = BuildStrategySelector;
//# sourceMappingURL=build-strategy-selector.js.map