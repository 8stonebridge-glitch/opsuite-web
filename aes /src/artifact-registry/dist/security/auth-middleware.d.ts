/**
 * AES Security — Authentication & Authorization Middleware
 *
 * Layer 1: Control Plane Security
 *
 * Provides:
 *   - Bearer token authentication
 *   - Role-based authorization (operator, reviewer, admin)
 *   - Per-endpoint authorization rules
 *   - Audit logging for sensitive operations
 *   - Request size limits
 *   - Rate limiting (token bucket)
 *   - CORS policy
 *
 * Token format: "Bearer <token>"
 * Tokens are configured via AES_AUTH_TOKENS environment variable as JSON:
 *   [{"token": "...", "role": "operator", "identity": "user@example.com"}]
 *
 * In dev mode (AES_AUTH_DISABLED=true), auth is bypassed but audit logging continues.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
export type AuthRole = "operator" | "reviewer" | "admin";
export interface AuthToken {
    token: string;
    role: AuthRole;
    identity: string;
}
export interface AuthenticatedRequest {
    identity: string;
    role: AuthRole;
    token_hash: string;
}
export interface AuditEntry {
    timestamp: string;
    identity: string;
    role: AuthRole;
    method: string;
    path: string;
    status: number;
    token_hash: string;
}
export interface RateLimitConfig {
    /** Max requests per window */
    max_requests: number;
    /** Window size in milliseconds */
    window_ms: number;
}
export interface SecurityConfig {
    /** Configured auth tokens. Empty = no valid tokens (everything rejected unless auth disabled) */
    tokens: AuthToken[];
    /** If true, bypass auth but continue audit logging. For dev only. */
    auth_disabled: boolean;
    /** Max request body size in bytes (default 1MB) */
    max_body_bytes: number;
    /** Rate limit config */
    rate_limit: RateLimitConfig;
    /** Allowed CORS origins. Empty = no CORS headers. ["*"] = allow all (unsafe). */
    cors_origins: string[];
    /** Audit log callback */
    on_audit?: (entry: AuditEntry) => void;
}
export interface EndpointRule {
    method: string;
    path_pattern: RegExp;
    min_role: AuthRole;
    sensitive: boolean;
    description: string;
}
/**
 * Default endpoint authorization rules.
 * Higher roles include all lower role permissions.
 */
export declare const DEFAULT_ENDPOINT_RULES: EndpointRule[];
export declare class AuthMiddleware {
    private readonly config;
    private readonly endpointRules;
    private readonly tokenMap;
    private readonly rateLimiter;
    private readonly auditLog;
    constructor(config: SecurityConfig, endpointRules?: EndpointRule[]);
    /**
     * Authenticate and authorize a request.
     * Returns the authenticated identity, or writes an error response and returns null.
     */
    check(request: IncomingMessage, response: ServerResponse): AuthenticatedRequest | null;
    /**
     * Check request body size against limit.
     * Call this before reading the body.
     */
    checkContentLength(request: IncomingMessage, response: ServerResponse): boolean;
    getAuditLog(): ReadonlyArray<AuditEntry>;
    private findRule;
    private hasRole;
    private hashToken;
    private getClientKey;
    private writeCorsHeaders;
    private writeError;
    private audit;
}
export declare function loadSecurityConfig(env?: NodeJS.ProcessEnv): SecurityConfig;
//# sourceMappingURL=auth-middleware.d.ts.map