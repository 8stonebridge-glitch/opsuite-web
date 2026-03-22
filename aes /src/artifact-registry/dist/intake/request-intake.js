"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestIntakeService = exports.InvalidRequestTransitionError = void 0;
const registry_1 = require("../registry");
class InvalidRequestTransitionError extends Error {
    constructor(requestId, from, to) {
        super(`Invalid request transition for ${requestId}: ${from} -> ${to}`);
        this.name = "InvalidRequestTransitionError";
    }
}
exports.InvalidRequestTransitionError = InvalidRequestTransitionError;
const ALLOWED_REQUEST_TRANSITIONS = {
    PENDING: new Set(["ACCEPTED", "REJECTED"]),
    ACCEPTED: new Set(["PROCESSING"]),
    REJECTED: new Set([]),
    PROCESSING: new Set(["COMPLETE", "REJECTED"]),
    COMPLETE: new Set([]),
};
function slugifyFeatureId(source) {
    const slug = source
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 32);
    return slug.length > 0 ? `FEAT-${slug}` : "FEAT-UNTITLED";
}
function normalizeRiskTags(riskDomainTags = []) {
    const normalized = riskDomainTags
        .map((riskDomainTag) => riskDomainTag.trim().toLowerCase())
        .filter((riskDomainTag) => riskDomainTag.length > 0);
    return Array.from(new Set(normalized));
}
class RequestIntakeService {
    constructor(registry, now = () => new Date()) {
        this.registry = registry;
        this.now = now;
    }
    async submitRequest(input) {
        const request = {
            request_id: (0, registry_1.generateArtifactId)("request"),
            feature_id: input.feature_id?.trim() || slugifyFeatureId(input.intent),
            intent: input.intent.trim(),
            requested_by: input.requested_by.trim(),
            risk_domain_tags: normalizeRiskTags(input.risk_domain_tags),
            created_at: this.now().toISOString(),
            status: "PENDING",
        };
        return this.registry.write("request", request);
    }
    async acceptRequest(requestId) {
        return this.transition(requestId, "ACCEPTED");
    }
    async rejectRequest(requestId) {
        return this.transition(requestId, "REJECTED");
    }
    async markProcessing(requestId) {
        return this.transition(requestId, "PROCESSING");
    }
    async completeRequest(requestId) {
        return this.transition(requestId, "COMPLETE");
    }
    async transition(requestId, nextStatus) {
        const current = await this.registry.read("request", requestId);
        if (!ALLOWED_REQUEST_TRANSITIONS[current.payload.status].has(nextStatus)) {
            throw new InvalidRequestTransitionError(requestId, current.payload.status, nextStatus);
        }
        return this.registry.write("request", {
            ...current.payload,
            status: nextStatus,
        });
    }
}
exports.RequestIntakeService = RequestIntakeService;
//# sourceMappingURL=request-intake.js.map