/**
 * AES Intake — App Intake Service
 *
 * Accepts plain-English app descriptions and creates AppSpec artifacts in DRAFT status.
 * Pattern follows: request-intake.ts
 */
import { ArtifactRegistry } from "../registry";
import type { AppPromotionStatus, AppSpec } from "../types/app-spec";
import type { StoredRecord } from "../types";
export interface AppIntakeInput {
    description: string;
    requested_by: string;
    name?: string;
    product_type?: string;
    target_users?: string[];
}
export declare class InvalidAppTransitionError extends Error {
    constructor(appId: string, from: AppPromotionStatus, to: AppPromotionStatus);
}
export declare class AppIntakeService {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    submitApp(input: AppIntakeInput): Promise<StoredRecord<AppSpec>>;
    getApp(appId: string): Promise<StoredRecord<AppSpec>>;
    updateAppStatus(appId: string, status: AppPromotionStatus): Promise<StoredRecord<AppSpec>>;
    updateApp(appId: string, updates: Partial<Pick<AppSpec, "name" | "roles" | "core_jobs_to_be_done" | "global_constraints" | "shared_backend_surfaces" | "shared_frontend_surfaces" | "feature_ids" | "open_questions" | "evidence_summary" | "confidence_summary">>): Promise<StoredRecord<AppSpec>>;
}
//# sourceMappingURL=app-intake.d.ts.map