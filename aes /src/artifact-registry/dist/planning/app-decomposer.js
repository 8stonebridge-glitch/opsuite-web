"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDecomposer = void 0;
const promotion_engine_1 = require("./promotion-engine");
// ─── Decomposer ────────────────────────────────────────────────────────────────
class AppDecomposer {
    constructor(now = () => new Date()) {
        this.now = now;
    }
    decompose(input) {
        const { app, candidate_features, research_summary } = input;
        const nowStr = this.now().toISOString();
        // Build name-to-ID map for dependency resolution
        const nameToId = new Map();
        let counter = 1;
        for (const cf of candidate_features) {
            const featureId = `FEAT-${slugify(app.name)}-${String(counter).padStart(3, "0")}`;
            nameToId.set(cf.name, featureId);
            counter++;
        }
        // Compute research depth for confidence scoring
        // No research = 0.3 floor (same as original behavior)
        const researchDepth = research_summary
            ? computeResearchDepth(research_summary)
            : { coverage: 0.3, domainsCovered: 0, domainsTotal: 5 };
        // Convert candidates to full FeatureSpecs
        const features = candidate_features.map((cf) => {
            const featureId = nameToId.get(cf.name);
            // Resolve dependency names to IDs
            const dependencies = (cf.depends_on ?? [])
                .map((depName) => nameToId.get(depName) ?? depName)
                .filter((id) => id !== featureId); // no self-deps
            // Enrich from research if available
            const enrichedFrontendSurfaces = enrichFrontendSurfaces(cf.frontend_surfaces ?? [], cf, research_summary);
            const enrichedFailureStates = enrichFailureStates(cf.failure_states ?? [], cf, research_summary);
            const enrichedAcceptanceCriteria = enrichAcceptanceCriteria(cf.acceptance_criteria ?? [], research_summary);
            // Build evidence sources list
            const evidenceSources = [];
            if (research_summary) {
                if (research_summary.comparable_products.length > 0)
                    evidenceSources.push("perplexity-market");
                if (research_summary.frontend_patterns.common_screens.length > 0)
                    evidenceSources.push("perplexity-frontend");
                if (research_summary.backend_architecture.recommended_patterns.length > 0)
                    evidenceSources.push("perplexity-backend");
                if (research_summary.security.frontend_security.length > 0 || research_summary.security.backend_security.length > 0)
                    evidenceSources.push("perplexity-security");
                if (research_summary.pitfalls.frontend_pitfalls.length > 0)
                    evidenceSources.push("perplexity-pitfalls");
                if (evidenceSources.length === 0)
                    evidenceSources.push("perplexity-research");
            }
            const confidence = cf.confidence ?? {};
            return {
                feature_id: featureId,
                app_id: app.app_id,
                name: cf.name,
                description: cf.description,
                feature_type: cf.feature_type,
                donor_mappings: cf.donor_mappings ?? [],
                dependencies,
                user_roles: cf.user_roles ?? [],
                backend_surfaces: cf.backend_surfaces ?? [],
                frontend_surfaces: enrichedFrontendSurfaces,
                auth_requirements: cf.auth_requirements ?? [],
                data_entities: cf.data_entities ?? [],
                events: cf.events ?? [],
                integrations: cf.integrations ?? [],
                failure_states: enrichedFailureStates,
                destructive_actions: cf.destructive_actions ?? [],
                acceptance_criteria: enrichedAcceptanceCriteria,
                test_cases: cf.test_cases ?? [],
                missing_questions: cf.missing_questions ?? [],
                evidence_summary: {
                    sources: evidenceSources,
                    research_note_ids: [],
                    total_evidence_count: evidenceSources.length,
                },
                confidence_summary: {
                    decomposition_confidence: confidence.decomposition_confidence ?? 0.7,
                    research_coverage: confidence.research_coverage ?? researchDepth.coverage,
                    verification_score: confidence.verification_score ?? 0,
                    overall: confidence.overall ?? 0.5,
                },
                promotion_status: "CANDIDATE",
                created_at: nowStr,
                updated_at: nowStr,
            };
        });
        // Compute dependency order
        const { order } = (0, promotion_engine_1.computeDependencyOrder)(features);
        // Check coverage
        const coverageReport = this.checkCoverage(features, app, researchDepth);
        // Extract operator-facing outputs from research
        const operatorChecklist = research_summary?.operator_manual_steps ?? {
            account_setup: [],
            env_configuration: [],
            dns_and_domains: [],
            third_party_dashboards: [],
            compliance_steps: [],
            monitoring_setup: [],
            deployment_steps: [],
        };
        const operatorPitfalls = research_summary
            ? extractOperatorPitfalls(research_summary)
            : [];
        return {
            features,
            dependency_order: order.length > 0 ? order : features.map((f) => f.feature_id),
            coverage_report: coverageReport,
            operator_checklist: operatorChecklist,
            operator_pitfalls: operatorPitfalls,
        };
    }
    checkCoverage(features, app, researchDepth) {
        const missing = [];
        let backendCount = 0;
        let frontendCount = 0;
        for (const f of features) {
            backendCount += f.backend_surfaces.length;
            frontendCount += f.frontend_surfaces.length;
        }
        if (backendCount === 0) {
            missing.push("No backend surfaces defined in any feature");
        }
        if (frontendCount === 0) {
            missing.push("No frontend surfaces defined in any feature");
        }
        // Check role coverage
        const roleCoverage = {};
        for (const role of app.roles) {
            const coveringFeatures = features
                .filter((f) => f.user_roles.includes(role))
                .map((f) => f.feature_id);
            roleCoverage[role] = coveringFeatures;
            if (coveringFeatures.length === 0) {
                missing.push(`Role "${role}" not covered by any feature`);
            }
        }
        // Check for features with no surfaces at all
        for (const f of features) {
            if (f.backend_surfaces.length === 0 && f.frontend_surfaces.length === 0) {
                missing.push(`${f.feature_id} (${f.name}) has no surfaces`);
            }
        }
        // Check security coverage
        const hasSecurityFeature = features.some((f) => f.feature_type === "security" ||
            f.name.toLowerCase().includes("auth") ||
            f.auth_requirements.length > 0);
        if (!hasSecurityFeature) {
            missing.push("No feature covers authentication or security");
        }
        return {
            backend_surface_count: backendCount,
            frontend_surface_count: frontendCount,
            role_coverage: roleCoverage,
            missing_coverage: missing,
            research_domains_covered: researchDepth.domainsCovered,
            research_domains_total: researchDepth.domainsTotal,
        };
    }
}
exports.AppDecomposer = AppDecomposer;
// ─── Research Enrichment ─────────────────────────────────────────────────────
/**
 * Add frontend surfaces from research common_screens if the candidate
 * doesn't already define them and the screen is relevant to this feature.
 */
function enrichFrontendSurfaces(existing, candidate, research) {
    if (!research || existing.length > 0)
        return existing;
    const featureNameLower = candidate.name.toLowerCase();
    const featureDescLower = candidate.description.toLowerCase();
    const relevantScreens = research.frontend_patterns.common_screens.filter((s) => {
        const screenLower = s.screen_name.toLowerCase();
        const purposeLower = s.purpose.toLowerCase();
        return (featureNameLower.includes(screenLower) ||
            screenLower.includes(featureNameLower) ||
            featureDescLower.includes(screenLower) ||
            purposeLower.includes(featureNameLower));
    });
    if (relevantScreens.length === 0)
        return existing;
    return relevantScreens.map((s) => ({
        name: s.screen_name,
        type: "page",
        description: `${s.purpose} — sections: ${s.common_sections.join(", ")}`,
    }));
}
/**
 * Enrich failure states from research UX states and security risks.
 */
function enrichFailureStates(existing, candidate, research) {
    if (!research)
        return existing;
    const enriched = [...existing];
    const existingTriggers = new Set(existing.map((f) => f.trigger.toLowerCase()));
    // Add UX empty/loading/error states relevant to this feature
    for (const uxState of research.frontend_patterns.empty_loading_error_states) {
        const screenLower = uxState.screen.toLowerCase();
        const featureLower = candidate.name.toLowerCase();
        if (screenLower.includes(featureLower) ||
            featureLower.includes(screenLower) ||
            uxState.screen === "*" // global states apply to all
        ) {
            const trigger = `${uxState.state_type} state on ${uxState.screen}`;
            if (!existingTriggers.has(trigger.toLowerCase())) {
                enriched.push({
                    trigger,
                    user_impact: uxState.what_not_to_do,
                    recovery: uxState.what_to_show,
                });
                existingTriggers.add(trigger.toLowerCase());
            }
        }
    }
    // Add security-derived failure states (data exposure, auth failures)
    for (const risk of research.security.data_exposure_risks) {
        const trigger = `Security: ${risk.threat}`;
        if (!existingTriggers.has(trigger.toLowerCase())) {
            enriched.push({
                trigger,
                user_impact: risk.what_goes_wrong,
                recovery: risk.what_to_do_instead,
            });
            existingTriggers.add(trigger.toLowerCase());
        }
    }
    return enriched;
}
/**
 * Add acceptance criteria from security checklist items.
 */
function enrichAcceptanceCriteria(existing, research) {
    if (!research)
        return existing;
    const enriched = [...existing];
    const existingDescriptions = new Set(existing.map((c) => c.description.toLowerCase()));
    // Critical and high security items become acceptance criteria
    const criticalItems = [
        ...research.security.frontend_security,
        ...research.security.backend_security,
        ...research.security.auth_pitfalls,
    ].filter((s) => s.severity === "critical" || s.severity === "high");
    for (const item of criticalItems) {
        const desc = `Security: ${item.what_to_do_instead} (prevents: ${item.threat})`;
        if (!existingDescriptions.has(desc.toLowerCase())) {
            enriched.push({
                id: `AC-SEC-${enriched.length + 1}`,
                description: desc,
                type: "security",
                mandatory: item.severity === "critical",
            });
            existingDescriptions.add(desc.toLowerCase());
        }
    }
    return enriched;
}
/**
 * Compute how many research domains have meaningful data.
 * Returns a 0-1 coverage score based on depth across all domains.
 */
function computeResearchDepth(summary) {
    const domains = [
        // Market (existing)
        summary.comparable_products.length > 0 || summary.common_features.length > 0,
        // Frontend
        summary.frontend_patterns.common_screens.length > 0 ||
            summary.frontend_patterns.onboarding_flows.length > 0 ||
            summary.frontend_patterns.navigation_patterns.length > 0,
        // Backend
        summary.backend_architecture.recommended_patterns.length > 0 ||
            summary.backend_architecture.stack_guides.length > 0,
        // Security
        summary.security.frontend_security.length > 0 ||
            summary.security.backend_security.length > 0 ||
            summary.security.auth_pitfalls.length > 0,
        // Pitfalls + operator
        summary.pitfalls.frontend_pitfalls.length > 0 ||
            summary.pitfalls.backend_pitfalls.length > 0 ||
            summary.operator_manual_steps.account_setup.length > 0,
    ];
    const domainsTotal = domains.length;
    const domainsCovered = domains.filter(Boolean).length;
    // Scale: 0 domains = 0.3, 1 = 0.45, 2 = 0.55, 3 = 0.65, 4 = 0.8, 5 = 0.9
    const coverage = domainsCovered === 0
        ? 0.3
        : 0.3 + (domainsCovered / domainsTotal) * 0.6;
    return { coverage, domainsCovered, domainsTotal };
}
// ─── Operator Pitfall Extraction ─────────────────────────────────────────────
/**
 * Collect all pitfalls where who_fixes_it is "operator" or "either".
 * These are surfaced to the operator as a checklist of things to watch for.
 */
function extractOperatorPitfalls(summary) {
    const all = [
        ...summary.pitfalls.frontend_pitfalls,
        ...summary.pitfalls.backend_pitfalls,
        ...summary.pitfalls.deployment_pitfalls,
        ...summary.pitfalls.integration_pitfalls,
        ...summary.pitfalls.data_pitfalls,
    ];
    return all.filter((p) => p.who_fixes_it !== "claude");
}
// ─── Helpers ─────────────────────────────────────────────────────────────────
function slugify(source) {
    return source
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 20);
}
//# sourceMappingURL=app-decomposer.js.map