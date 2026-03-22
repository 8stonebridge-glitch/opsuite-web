"use strict";
/**
 * AES Research — App Research Service
 *
 * Stores research findings about comparable products, frontend UX patterns,
 * backend architecture, security, pitfalls, and operator manual steps as
 * ResearchNote artifacts.
 *
 * The actual Perplexity/external call happens at the HTTP layer.
 * This service receives the content and stores it with proper trust gating.
 *
 * Pattern follows: research-gateway.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppResearchService = void 0;
exports.parseResearchSummary = parseResearchSummary;
const research_types_1 = require("../types/research-types");
class AppResearchService {
    constructor(registry, researchGateway, now = () => new Date()) {
        this.registry = registry;
        this.researchGateway = researchGateway;
        this.now = now;
    }
    async research(input) {
        // Store the research content as an UNTRUSTED research note
        // Feature ID is the app_id since this is app-level research
        const note = await this.researchGateway.recordNote({
            feature_id: input.app_id,
            source: input.source,
            content: input.research_content,
            trust_status: "UNTRUSTED",
        });
        // Parse structured summary from research content
        const structured = parseResearchSummary(input.research_content);
        return {
            research_notes: [note],
            structured_summary: structured,
        };
    }
    async addResearchNote(appId, source, content) {
        return this.researchGateway.recordNote({
            feature_id: appId,
            source,
            content,
            trust_status: "UNTRUSTED",
        });
    }
}
exports.AppResearchService = AppResearchService;
// ─── Parser ──────────────────────────────────────────────────────────────────
/**
 * Best-effort extraction of structured research summary from raw content.
 * If the content is already JSON with the expected shape, parse it.
 * Otherwise return empty defaults (the caller/decomposer handles raw text).
 */
function parseResearchSummary(content) {
    try {
        const parsed = JSON.parse(content);
        return normalizeResearchSummary(parsed);
    }
    catch {
        return { ...research_types_1.EMPTY_STRUCTURED_RESEARCH };
    }
}
/**
 * Normalize a parsed JSON object into a full StructuredResearchSummary,
 * applying safe defaults for every missing field.
 */
function normalizeResearchSummary(parsed) {
    return {
        // ── Market intelligence (existing fields) ──
        comparable_products: toStringArray(parsed.comparable_products),
        common_features: toStringArray(parsed.common_features),
        differentiation_opportunities: toStringArray(parsed.differentiation_opportunities),
        technical_patterns: toStringArray(parsed.technical_patterns),
        risk_areas: toStringArray(parsed.risk_areas),
        // ── Expanded domains ──
        frontend_patterns: normalizeFrontendPatterns(parsed.frontend_patterns),
        backend_architecture: normalizeBackendArchitecture(parsed.backend_architecture),
        security: normalizeSecurityResearch(parsed.security),
        pitfalls: normalizePitfallResearch(parsed.pitfalls),
        operator_manual_steps: normalizeOperatorManualSteps(parsed.operator_manual_steps),
    };
}
// ─── Frontend Patterns ───────────────────────────────────────────────────────
function normalizeFrontendPatterns(raw) {
    if (!raw || typeof raw !== "object")
        return { ...research_types_1.EMPTY_FRONTEND_PATTERNS };
    const obj = raw;
    return {
        common_screens: toTypedArray(obj.common_screens, normalizeScreenPattern),
        navigation_patterns: toStringArray(obj.navigation_patterns),
        action_placement: toStringArray(obj.action_placement),
        dashboard_layouts: toStringArray(obj.dashboard_layouts),
        onboarding_flows: toTypedArray(obj.onboarding_flows, normalizeOnboardingStep),
        empty_loading_error_states: toTypedArray(obj.empty_loading_error_states, normalizeUXState),
        notification_ux: toStringArray(obj.notification_ux),
        information_hierarchy: toStringArray(obj.information_hierarchy),
        visual_direction: toStringArray(obj.visual_direction),
    };
}
function normalizeScreenPattern(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    if (typeof obj.screen_name !== "string")
        return null;
    return {
        screen_name: obj.screen_name,
        purpose: toString(obj.purpose),
        common_sections: toStringArray(obj.common_sections),
        typical_actions: toStringArray(obj.typical_actions),
    };
}
function normalizeOnboardingStep(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    return {
        step_number: toNumber(obj.step_number, 0),
        screen_name: toString(obj.screen_name),
        what_user_does: toString(obj.what_user_does),
        why_it_matters: toString(obj.why_it_matters),
    };
}
function normalizeUXState(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    const validTypes = ["empty", "loading", "error", "partial", "success"];
    const stateType = validTypes.includes(obj.state_type)
        ? obj.state_type
        : "empty";
    return {
        state_type: stateType,
        screen: toString(obj.screen),
        what_to_show: toString(obj.what_to_show),
        what_not_to_do: toString(obj.what_not_to_do),
    };
}
// ─── Backend Architecture ────────────────────────────────────────────────────
function normalizeBackendArchitecture(raw) {
    if (!raw || typeof raw !== "object")
        return { ...research_types_1.EMPTY_BACKEND_ARCHITECTURE };
    const obj = raw;
    return {
        recommended_patterns: toStringArray(obj.recommended_patterns),
        data_model_patterns: toStringArray(obj.data_model_patterns),
        api_design_patterns: toStringArray(obj.api_design_patterns),
        scaling_considerations: toStringArray(obj.scaling_considerations),
        stack_guides: toTypedArray(obj.stack_guides, normalizeStackGuide),
    };
}
function normalizeStackGuide(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    if (typeof obj.stack !== "string")
        return null;
    return {
        stack: obj.stack,
        role: toString(obj.role),
        integration_steps: toTypedArray(obj.integration_steps, normalizePlainStep),
        pitfalls: toTypedArray(obj.pitfalls, normalizePitfall),
        verified: obj.verified === true,
    };
}
function normalizePlainStep(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    return {
        step_number: toNumber(obj.step_number, 0),
        do_this: toString(obj.do_this),
        why: toString(obj.why),
        if_stuck: toString(obj.if_stuck),
    };
}
// ─── Security Research ───────────────────────────────────────────────────────
function normalizeSecurityResearch(raw) {
    if (!raw || typeof raw !== "object")
        return { ...research_types_1.EMPTY_SECURITY_RESEARCH };
    const obj = raw;
    return {
        frontend_security: toTypedArray(obj.frontend_security, normalizeSecurityItem),
        backend_security: toTypedArray(obj.backend_security, normalizeSecurityItem),
        auth_pitfalls: toTypedArray(obj.auth_pitfalls, normalizeSecurityItem),
        data_exposure_risks: toTypedArray(obj.data_exposure_risks, normalizeSecurityItem),
        common_cve_patterns: toStringArray(obj.common_cve_patterns),
        compliance_notes: toStringArray(obj.compliance_notes),
    };
}
function normalizeSecurityItem(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    if (typeof obj.threat !== "string")
        return null;
    const validSeverities = ["critical", "high", "medium", "low"];
    const severity = validSeverities.includes(obj.severity)
        ? obj.severity
        : "medium";
    return {
        threat: obj.threat,
        severity,
        what_goes_wrong: toString(obj.what_goes_wrong),
        what_to_do_instead: toString(obj.what_to_do_instead),
        applies_to: toString(obj.applies_to),
    };
}
// ─── Pitfall Research ────────────────────────────────────────────────────────
function normalizePitfallResearch(raw) {
    if (!raw || typeof raw !== "object")
        return { ...research_types_1.EMPTY_PITFALL_RESEARCH };
    const obj = raw;
    return {
        frontend_pitfalls: toTypedArray(obj.frontend_pitfalls, normalizePitfall),
        backend_pitfalls: toTypedArray(obj.backend_pitfalls, normalizePitfall),
        deployment_pitfalls: toTypedArray(obj.deployment_pitfalls, normalizePitfall),
        integration_pitfalls: toTypedArray(obj.integration_pitfalls, normalizePitfall),
        data_pitfalls: toTypedArray(obj.data_pitfalls, normalizePitfall),
    };
}
function normalizePitfall(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    if (typeof obj.mistake !== "string")
        return null;
    const validFixers = ["claude", "operator", "either"];
    const whoFixesIt = validFixers.includes(obj.who_fixes_it)
        ? obj.who_fixes_it
        : "either";
    return {
        mistake: obj.mistake,
        consequence: toString(obj.consequence),
        how_to_avoid: toString(obj.how_to_avoid),
        who_fixes_it: whoFixesIt,
    };
}
// ─── Operator Manual Steps ───────────────────────────────────────────────────
function normalizeOperatorManualSteps(raw) {
    if (!raw || typeof raw !== "object")
        return { ...research_types_1.EMPTY_OPERATOR_MANUAL_STEPS };
    const obj = raw;
    return {
        account_setup: toTypedArray(obj.account_setup, normalizeManualStep),
        env_configuration: toTypedArray(obj.env_configuration, normalizeManualStep),
        dns_and_domains: toTypedArray(obj.dns_and_domains, normalizeManualStep),
        third_party_dashboards: toTypedArray(obj.third_party_dashboards, normalizeManualStep),
        compliance_steps: toTypedArray(obj.compliance_steps, normalizeManualStep),
        monitoring_setup: toTypedArray(obj.monitoring_setup, normalizeManualStep),
        deployment_steps: toTypedArray(obj.deployment_steps, normalizeManualStep),
    };
}
function normalizeManualStep(raw) {
    if (!raw || typeof raw !== "object")
        return null;
    const obj = raw;
    if (typeof obj.title !== "string")
        return null;
    return {
        step_number: toNumber(obj.step_number, 0),
        title: obj.title,
        why: toString(obj.why),
        what_to_do: toString(obj.what_to_do),
        where_to_go: toString(obj.where_to_go),
        what_to_copy_back: toString(obj.what_to_copy_back),
        estimated_time: toString(obj.estimated_time),
        ...(typeof obj.screenshot_hint === "string"
            ? { screenshot_hint: obj.screenshot_hint }
            : {}),
    };
}
// ─── Generic Helpers ─────────────────────────────────────────────────────────
function toStringArray(value) {
    if (Array.isArray(value))
        return value.filter((v) => typeof v === "string");
    return [];
}
function toString(value) {
    if (typeof value === "string")
        return value;
    return "";
}
function toNumber(value, fallback) {
    if (typeof value === "number" && !Number.isNaN(value))
        return value;
    return fallback;
}
/**
 * Parse an array of objects through a normalizer function,
 * dropping any entries that return null (invalid shape).
 */
function toTypedArray(value, normalizer) {
    if (!Array.isArray(value))
        return [];
    const results = [];
    for (const item of value) {
        const normalized = normalizer(item);
        if (normalized !== null)
            results.push(normalized);
    }
    return results;
}
//# sourceMappingURL=app-research.js.map