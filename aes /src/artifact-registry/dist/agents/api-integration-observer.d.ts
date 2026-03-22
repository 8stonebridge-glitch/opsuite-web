/**
 * AES API/Integration Observer Agent
 *
 * Extracts external integration requirements from feature specs:
 * auth, payments, email, webhooks, queues, third-party APIs, rate limits.
 *
 * Outputs typed evidence for the bridge compiler to use.
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { FeatureSpec } from "../types/app-spec";
export interface ApiIntegrationObservation {
    observation_id: string;
    app_id?: string;
    feature_id: string;
    source: "api_integration_observer";
    source_type: "feature_analysis";
    captured_at: string;
    extracted_by: "api_integration_observer";
    confidence: number;
    status: "UNTRUSTED";
    domain_tags: string[];
    artifact_refs: ArtifactRef[];
    /** Detected integration requirements */
    integrations: IntegrationRequirement[];
    /** External APIs needed */
    external_apis: ExternalApiRequirement[];
    /** Internal API contracts this feature must expose */
    internal_contracts: InternalApiContract[];
    /** Data dependencies on other features/services */
    data_dependencies: DataDependency[];
}
export interface IntegrationRequirement {
    type: "auth" | "payments" | "email" | "webhooks" | "queue" | "storage" | "search" | "analytics" | "notifications" | "other";
    provider?: string;
    description: string;
    required: boolean;
    risk_tags: string[];
}
export interface ExternalApiRequirement {
    name: string;
    base_url?: string;
    auth_type: "api_key" | "oauth2" | "bearer" | "basic" | "none" | "unknown";
    rate_limited: boolean;
    rate_limit_details?: string;
    endpoints_needed: string[];
}
export interface InternalApiContract {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    description: string;
    auth_required: boolean;
    request_body?: string;
    response_body?: string;
}
export interface DataDependency {
    depends_on_feature_id: string;
    dependency_type: "read" | "write" | "event" | "auth";
    description: string;
}
export declare class ApiIntegrationObserver {
    private readonly now;
    constructor(_registry: ArtifactRegistry, now?: () => Date);
    observe(feature: FeatureSpec, appId?: string): ApiIntegrationObservation;
    private detectIntegrations;
    private detectExternalApis;
    private deriveInternalContracts;
    private detectDataDependencies;
}
//# sourceMappingURL=api-integration-observer.d.ts.map