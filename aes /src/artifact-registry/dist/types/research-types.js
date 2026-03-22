"use strict";
/**
 * AES Artifact Registry — Expanded Research Types
 *
 * Structured types for the full research surface Perplexity (or any external
 * research source) can populate:
 *
 *   - Market intelligence (existing)
 *   - Frontend UX patterns
 *   - Backend architecture
 *   - Security (frontend + backend)
 *   - Common pitfalls (categorized by who fixes them)
 *   - Operator manual steps (things Claude cannot do)
 *   - Stack-specific integration guides
 *
 * All research enters AES as UNTRUSTED and must be promoted through the
 * existing trust lifecycle before influencing builds.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMPTY_STRUCTURED_RESEARCH = exports.EMPTY_OPERATOR_MANUAL_STEPS = exports.EMPTY_PITFALL_RESEARCH = exports.EMPTY_SECURITY_RESEARCH = exports.EMPTY_BACKEND_ARCHITECTURE = exports.EMPTY_FRONTEND_PATTERNS = void 0;
// ─── Defaults ────────────────────────────────────────────────────────────────
exports.EMPTY_FRONTEND_PATTERNS = {
    common_screens: [],
    navigation_patterns: [],
    action_placement: [],
    dashboard_layouts: [],
    onboarding_flows: [],
    empty_loading_error_states: [],
    notification_ux: [],
    information_hierarchy: [],
    visual_direction: [],
};
exports.EMPTY_BACKEND_ARCHITECTURE = {
    recommended_patterns: [],
    data_model_patterns: [],
    api_design_patterns: [],
    scaling_considerations: [],
    stack_guides: [],
};
exports.EMPTY_SECURITY_RESEARCH = {
    frontend_security: [],
    backend_security: [],
    auth_pitfalls: [],
    data_exposure_risks: [],
    common_cve_patterns: [],
    compliance_notes: [],
};
exports.EMPTY_PITFALL_RESEARCH = {
    frontend_pitfalls: [],
    backend_pitfalls: [],
    deployment_pitfalls: [],
    integration_pitfalls: [],
    data_pitfalls: [],
};
exports.EMPTY_OPERATOR_MANUAL_STEPS = {
    account_setup: [],
    env_configuration: [],
    dns_and_domains: [],
    third_party_dashboards: [],
    compliance_steps: [],
    monitoring_setup: [],
    deployment_steps: [],
};
exports.EMPTY_STRUCTURED_RESEARCH = {
    comparable_products: [],
    common_features: [],
    differentiation_opportunities: [],
    technical_patterns: [],
    risk_areas: [],
    frontend_patterns: exports.EMPTY_FRONTEND_PATTERNS,
    backend_architecture: exports.EMPTY_BACKEND_ARCHITECTURE,
    security: exports.EMPTY_SECURITY_RESEARCH,
    pitfalls: exports.EMPTY_PITFALL_RESEARCH,
    operator_manual_steps: exports.EMPTY_OPERATOR_MANUAL_STEPS,
};
//# sourceMappingURL=research-types.js.map