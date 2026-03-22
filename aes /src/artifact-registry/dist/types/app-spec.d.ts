/**
 * AES Artifact Registry — App & Feature Spec Types
 *
 * Typed package structures for the intake-to-graph pipeline.
 * These define the front half contract: what gets planned, verified,
 * promoted, and seeded into the graph before AES builds anything.
 *
 * Reuses: AcceptanceCriterion, TestCase, EventDefinition from common.ts
 * Maps to: CanonicalFeatureClass from donor-asset-seed.ts
 * Produces: BuildProgramInput from builder-launch.ts
 */
import type { AcceptanceCriterion, EventDefinition, TestCase } from "./common";
export type AppPromotionStatus = "DRAFT" | "CANDIDATE" | "VERIFIED" | "PROMOTED" | "REJECTED" | "BLOCKED";
export interface BackendSurface {
    name: string;
    type: "api_endpoint" | "webhook" | "cron_job" | "queue_worker" | "event_handler";
    description: string;
}
export interface FrontendSurface {
    name: string;
    type: "page" | "modal" | "panel" | "widget" | "form";
    description: string;
}
export interface DonorMapping {
    donor_name: string;
    donor_feature: string;
    relevance: "direct" | "analogous" | "partial";
    notes?: string;
}
export interface AuthRequirement {
    type: "role_based" | "permission_based" | "org_scoped" | "resource_owner" | "public";
    description: string;
    roles?: string[];
}
export interface DataEntity {
    name: string;
    owner_feature_id: string;
    operations: Array<"CREATE" | "READ" | "UPDATE" | "DELETE">;
    shared_with?: string[];
}
export interface ExternalIntegration {
    name: string;
    type: "api" | "webhook" | "oauth" | "email" | "sms" | "payment";
    required: boolean;
}
export interface FailureState {
    trigger: string;
    user_impact: string;
    recovery: string;
}
export interface DestructiveAction {
    action: string;
    reversible: boolean;
    confirmation_required: boolean;
    audit_logged: boolean;
}
export interface EvidenceSummary {
    sources: string[];
    research_note_ids: string[];
    verification_report_id?: string;
    total_evidence_count: number;
}
export interface SpecConfidenceSummary {
    decomposition_confidence: number;
    research_coverage: number;
    verification_score: number;
    overall: number;
}
export interface FeatureSpec {
    feature_id: string;
    app_id: string;
    name: string;
    description: string;
    feature_type: string;
    donor_mappings: DonorMapping[];
    dependencies: string[];
    user_roles: string[];
    backend_surfaces: BackendSurface[];
    frontend_surfaces: FrontendSurface[];
    auth_requirements: AuthRequirement[];
    data_entities: DataEntity[];
    events: EventDefinition[];
    integrations: ExternalIntegration[];
    failure_states: FailureState[];
    destructive_actions: DestructiveAction[];
    acceptance_criteria: AcceptanceCriterion[];
    test_cases: TestCase[];
    missing_questions: string[];
    evidence_summary: EvidenceSummary;
    confidence_summary: SpecConfidenceSummary;
    promotion_status: AppPromotionStatus;
    created_at: string;
    updated_at: string;
}
export interface AppSpec {
    app_id: string;
    name: string;
    summary: string;
    product_type: string;
    target_users: string[];
    roles: string[];
    core_jobs_to_be_done: string[];
    global_constraints: string[];
    shared_backend_surfaces: BackendSurface[];
    shared_frontend_surfaces: FrontendSurface[];
    feature_ids: string[];
    open_questions: string[];
    evidence_summary: EvidenceSummary;
    confidence_summary: SpecConfidenceSummary;
    promotion_status: AppPromotionStatus;
    created_at: string;
    updated_at: string;
}
//# sourceMappingURL=app-spec.d.ts.map