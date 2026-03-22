"use strict";
/**
 * AES Intake — App Intake Service
 *
 * Accepts plain-English app descriptions and creates AppSpec artifacts in DRAFT status.
 * Pattern follows: request-intake.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppIntakeService = exports.InvalidAppTransitionError = void 0;
const registry_1 = require("../registry");
class InvalidAppTransitionError extends Error {
    constructor(appId, from, to) {
        super(`Invalid app transition for ${appId}: ${from} -> ${to}`);
        this.name = "InvalidAppTransitionError";
    }
}
exports.InvalidAppTransitionError = InvalidAppTransitionError;
const ALLOWED_APP_TRANSITIONS = {
    DRAFT: new Set(["CANDIDATE", "REJECTED"]),
    CANDIDATE: new Set(["VERIFIED", "REJECTED", "BLOCKED"]),
    VERIFIED: new Set(["PROMOTED", "REJECTED", "BLOCKED"]),
    PROMOTED: new Set([]),
    REJECTED: new Set(["DRAFT"]), // allow retry
    BLOCKED: new Set(["CANDIDATE"]), // allow unblock
};
class AppIntakeService {
    constructor(registry, now = () => new Date()) {
        this.registry = registry;
        this.now = now;
    }
    async submitApp(input) {
        const now = this.now().toISOString();
        const app = {
            app_id: (0, registry_1.generateArtifactId)("app_spec"),
            name: input.name?.trim() || deriveAppName(input.description),
            summary: input.description.trim(),
            product_type: input.product_type?.trim() || "general",
            target_users: input.target_users ?? [],
            roles: [],
            core_jobs_to_be_done: [],
            global_constraints: [],
            shared_backend_surfaces: [],
            shared_frontend_surfaces: [],
            feature_ids: [],
            open_questions: [],
            evidence_summary: {
                sources: [],
                research_note_ids: [],
                total_evidence_count: 0,
            },
            confidence_summary: {
                decomposition_confidence: 0,
                research_coverage: 0,
                verification_score: 0,
                overall: 0,
            },
            promotion_status: "DRAFT",
            created_at: now,
            updated_at: now,
        };
        return this.registry.write("app_spec", app);
    }
    async getApp(appId) {
        return this.registry.read("app_spec", appId);
    }
    async updateAppStatus(appId, status) {
        const current = await this.registry.read("app_spec", appId);
        const currentStatus = current.payload.promotion_status;
        if (!ALLOWED_APP_TRANSITIONS[currentStatus].has(status)) {
            throw new InvalidAppTransitionError(appId, currentStatus, status);
        }
        return this.registry.write("app_spec", {
            ...current.payload,
            promotion_status: status,
            updated_at: this.now().toISOString(),
        });
    }
    async updateApp(appId, updates) {
        const current = await this.registry.read("app_spec", appId);
        return this.registry.write("app_spec", {
            ...current.payload,
            ...updates,
            updated_at: this.now().toISOString(),
        });
    }
}
exports.AppIntakeService = AppIntakeService;
function deriveAppName(description) {
    const words = description.trim().split(/\s+/).slice(0, 5);
    return words.join(" ");
}
//# sourceMappingURL=app-intake.js.map