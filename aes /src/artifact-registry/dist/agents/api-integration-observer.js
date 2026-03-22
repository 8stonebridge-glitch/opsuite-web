"use strict";
/**
 * AES API/Integration Observer Agent
 *
 * Extracts external integration requirements from feature specs:
 * auth, payments, email, webhooks, queues, third-party APIs, rate limits.
 *
 * Outputs typed evidence for the bridge compiler to use.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiIntegrationObserver = void 0;
// ─── Observer ────────────────────────────────────────────────────────────────
class ApiIntegrationObserver {
    constructor(_registry, now = () => new Date()) {
        this.now = now;
    }
    observe(feature, appId) {
        const integrations = this.detectIntegrations(feature);
        const externalApis = this.detectExternalApis(feature);
        const internalContracts = this.deriveInternalContracts(feature);
        const dataDependencies = this.detectDataDependencies(feature);
        const allTags = new Set();
        for (const i of integrations)
            for (const t of i.risk_tags)
                allTags.add(t);
        return {
            observation_id: `OBS-API-${Date.now()}-${feature.feature_id}`,
            app_id: appId,
            feature_id: feature.feature_id,
            source: "api_integration_observer",
            source_type: "feature_analysis",
            captured_at: this.now().toISOString(),
            extracted_by: "api_integration_observer",
            confidence: 0.7,
            status: "UNTRUSTED",
            domain_tags: Array.from(allTags),
            artifact_refs: [],
            integrations,
            external_apis: externalApis,
            internal_contracts: internalContracts,
            data_dependencies: dataDependencies,
        };
    }
    detectIntegrations(feature) {
        const integrations = [];
        const intent = (feature.description || "").toLowerCase();
        const tags = (feature.risk_domain_tags || []).map((t) => t.toLowerCase());
        // Auth detection
        if (intent.includes("auth") || intent.includes("login") || intent.includes("session") || tags.includes("auth")) {
            integrations.push({
                type: "auth",
                description: "Authentication/authorization required",
                required: true,
                risk_tags: ["auth", "security"],
            });
        }
        // Payment detection
        if (intent.includes("payment") || intent.includes("billing") || intent.includes("subscription") || tags.includes("billing")) {
            integrations.push({
                type: "payments",
                provider: "stripe",
                description: "Payment processing integration",
                required: true,
                risk_tags: ["billing", "security", "compliance"],
            });
        }
        // Email detection
        if (intent.includes("email") || intent.includes("notification") || intent.includes("invite")) {
            integrations.push({
                type: "email",
                description: "Email sending capability",
                required: intent.includes("email"),
                risk_tags: ["communication"],
            });
        }
        // Webhook detection
        if (intent.includes("webhook") || intent.includes("callback") || intent.includes("event")) {
            integrations.push({
                type: "webhooks",
                description: "Webhook delivery/reception",
                required: intent.includes("webhook"),
                risk_tags: ["integration"],
            });
        }
        // Queue detection
        if (intent.includes("queue") || intent.includes("background") || intent.includes("async") || intent.includes("job")) {
            integrations.push({
                type: "queue",
                description: "Background job processing",
                required: true,
                risk_tags: ["async", "reliability"],
            });
        }
        // Storage detection
        if (intent.includes("upload") || intent.includes("file") || intent.includes("image") || intent.includes("storage")) {
            integrations.push({
                type: "storage",
                description: "File/object storage",
                required: true,
                risk_tags: ["storage"],
            });
        }
        // Search detection
        if (intent.includes("search") || intent.includes("filter") || intent.includes("query")) {
            integrations.push({
                type: "search",
                description: "Search/filtering capability",
                required: intent.includes("search"),
                risk_tags: ["search"],
            });
        }
        return integrations;
    }
    detectExternalApis(feature) {
        const apis = [];
        const intent = (feature.description || "").toLowerCase();
        if (intent.includes("stripe") || intent.includes("payment")) {
            apis.push({
                name: "Stripe API",
                base_url: "https://api.stripe.com",
                auth_type: "bearer",
                rate_limited: true,
                rate_limit_details: "100 read/s, 25 write/s",
                endpoints_needed: ["POST /v1/customers", "POST /v1/payment_intents", "POST /v1/subscriptions"],
            });
        }
        if (intent.includes("clerk") || (intent.includes("auth") && intent.includes("provider"))) {
            apis.push({
                name: "Clerk API",
                base_url: "https://api.clerk.dev",
                auth_type: "bearer",
                rate_limited: true,
                endpoints_needed: ["GET /v1/users", "POST /v1/sessions"],
            });
        }
        if (intent.includes("sendgrid") || intent.includes("email service")) {
            apis.push({
                name: "SendGrid API",
                base_url: "https://api.sendgrid.com",
                auth_type: "api_key",
                rate_limited: true,
                rate_limit_details: "600 emails/min",
                endpoints_needed: ["POST /v3/mail/send"],
            });
        }
        return apis;
    }
    deriveInternalContracts(feature) {
        const contracts = [];
        const backend = feature.backend_surfaces?.[0];
        if (backend?.api_contracts) {
            for (const contract of backend.api_contracts) {
                // Derive REST endpoints from contract descriptions
                const desc = (contract.description || contract.contract_id || "").toLowerCase();
                if (desc.includes("create") || desc.includes("add")) {
                    contracts.push({
                        method: "POST",
                        path: `/${feature.feature_id.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                        description: contract.description || "Create resource",
                        auth_required: true,
                    });
                }
                if (desc.includes("list") || desc.includes("get all")) {
                    contracts.push({
                        method: "GET",
                        path: `/${feature.feature_id.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
                        description: contract.description || "List resources",
                        auth_required: true,
                    });
                }
            }
        }
        return contracts;
    }
    detectDataDependencies(feature) {
        const deps = [];
        if (feature.dependencies) {
            for (const depId of feature.dependencies) {
                deps.push({
                    depends_on_feature_id: depId,
                    dependency_type: "read",
                    description: `Depends on ${depId}`,
                });
            }
        }
        // Infer auth dependency if feature needs auth but doesn't provide it
        const intent = (feature.description || "").toLowerCase();
        if (!intent.includes("auth") && (intent.includes("user") || intent.includes("protected"))) {
            deps.push({
                depends_on_feature_id: "FEAT-AUTH",
                dependency_type: "auth",
                description: "Requires authentication — depends on auth feature",
            });
        }
        return deps;
    }
}
exports.ApiIntegrationObserver = ApiIntegrationObserver;
//# sourceMappingURL=api-integration-observer.js.map