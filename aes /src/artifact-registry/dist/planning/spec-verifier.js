"use strict";
/**
 * AES Planning — Spec Verifier
 *
 * Processes verification results (from Gemini or another independent reviewer)
 * into a structured VerificationReport. Stores the verification as a ResearchNote.
 *
 * The actual Gemini call happens at the HTTP layer.
 * This service receives the structured or raw result and normalizes it.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecVerifier = void 0;
// ─── Verifier ──────────────────────────────────────────────────────────────────
class SpecVerifier {
    constructor(registry, researchGateway, now = () => new Date()) {
        this.registry = registry;
        this.researchGateway = researchGateway;
        this.now = now;
    }
    async verify(input) {
        const report = this.buildReport(input.app.app_id, input.verification_content, input.features);
        // Store the verification as a FILTERED research note (it passed through a reviewer)
        const note = await this.researchGateway.recordNote({
            feature_id: input.app.app_id,
            source: input.source ?? "gemini-verification",
            content: input.verification_content,
            trust_status: "FILTERED",
            filtered_by: input.source ?? "gemini",
        });
        return {
            report,
            research_note: note,
        };
    }
    buildReport(appId, rawVerification, features) {
        const nowStr = this.now().toISOString();
        // Try to parse as structured JSON first
        try {
            const parsed = JSON.parse(rawVerification);
            return normalizeReport(appId, parsed, features, nowStr);
        }
        catch {
            // Fall back to heuristic extraction from prose
            return buildReportFromProse(appId, rawVerification, features, nowStr);
        }
    }
}
exports.SpecVerifier = SpecVerifier;
// ─── Report Normalization ──────────────────────────────────────────────────────
function normalizeReport(appId, parsed, features, nowStr) {
    const backendCount = features.reduce((sum, f) => sum + f.backend_surfaces.length, 0);
    const frontendCount = features.reduce((sum, f) => sum + f.frontend_surfaces.length, 0);
    const total = backendCount + frontendCount || 1;
    return {
        verification_id: generateVerificationId(),
        app_id: appId,
        verified_at: nowStr,
        completeness_score: toNumber(parsed.completeness_score, 0.5),
        missing_flows: toStringArray(parsed.missing_flows),
        dependency_issues: toStringArray(parsed.dependency_issues),
        backend_frontend_balance: {
            backend_coverage: backendCount / total,
            frontend_coverage: frontendCount / total,
            gaps: toStringArray(parsed.backend_frontend_balance?.gaps),
        },
        contradictions: toStringArray(parsed.contradictions),
        overall_score: toNumber(parsed.overall_score, 0.5),
        recommendation: toRecommendation(parsed.recommendation),
        notes: toStringArray(parsed.notes),
    };
}
function buildReportFromProse(appId, prose, features, nowStr) {
    const lower = prose.toLowerCase();
    const backendCount = features.reduce((sum, f) => sum + f.backend_surfaces.length, 0);
    const frontendCount = features.reduce((sum, f) => sum + f.frontend_surfaces.length, 0);
    const total = backendCount + frontendCount || 1;
    // Heuristic recommendation
    let recommendation = "NEEDS_WORK";
    if (lower.includes("approve") ||
        lower.includes("looks good") ||
        lower.includes("complete")) {
        recommendation = "APPROVE";
    }
    else if (lower.includes("reject") ||
        lower.includes("not ready") ||
        lower.includes("major gaps")) {
        recommendation = "REJECT";
    }
    // Heuristic score
    let score = 0.5;
    if (recommendation === "APPROVE")
        score = 0.8;
    if (recommendation === "REJECT")
        score = 0.3;
    return {
        verification_id: generateVerificationId(),
        app_id: appId,
        verified_at: nowStr,
        completeness_score: score,
        missing_flows: [],
        dependency_issues: [],
        backend_frontend_balance: {
            backend_coverage: backendCount / total,
            frontend_coverage: frontendCount / total,
            gaps: [],
        },
        contradictions: [],
        overall_score: score,
        recommendation,
        notes: [prose.slice(0, 500)],
    };
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
let verifyCounter = 0;
function generateVerificationId() {
    const ts = Date.now().toString(36);
    const seq = (++verifyCounter).toString(36).padStart(4, "0");
    return `VRPT-${ts}-${seq}`;
}
function toNumber(value, fallback) {
    if (typeof value === "number" && !Number.isNaN(value))
        return value;
    return fallback;
}
function toStringArray(value) {
    if (Array.isArray(value))
        return value.filter((v) => typeof v === "string");
    return [];
}
function toRecommendation(value) {
    if (value === "APPROVE" || value === "NEEDS_WORK" || value === "REJECT") {
        return value;
    }
    return "NEEDS_WORK";
}
//# sourceMappingURL=spec-verifier.js.map