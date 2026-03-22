"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthMiddleware = exports.DEFAULT_ENDPOINT_RULES = void 0;
exports.loadSecurityConfig = loadSecurityConfig;
const crypto = __importStar(require("node:crypto"));
const ROLE_HIERARCHY = {
    reviewer: 0,
    operator: 1,
    admin: 2,
};
/**
 * Default endpoint authorization rules.
 * Higher roles include all lower role permissions.
 */
exports.DEFAULT_ENDPOINT_RULES = [
    // Read-only endpoints — reviewer+
    { method: "GET", path_pattern: /^\/api\//, min_role: "reviewer", sensitive: false, description: "Read API data" },
    { method: "GET", path_pattern: /^\/$/, min_role: "reviewer", sensitive: false, description: "Dashboard" },
    // Build workflow — operator+
    { method: "POST", path_pattern: /^\/api\/builds\/prepare$/, min_role: "operator", sensitive: true, description: "Prepare build" },
    { method: "POST", path_pattern: /^\/api\/builds\/[^/]+\/run-builder$/, min_role: "operator", sensitive: true, description: "Run builder" },
    { method: "POST", path_pattern: /^\/api\/builds\/[^/]+\/abort-builder$/, min_role: "operator", sensitive: true, description: "Abort builder" },
    { method: "POST", path_pattern: /^\/api\/builds\/[^/]+\/record-diff$/, min_role: "operator", sensitive: true, description: "Record diff" },
    { method: "POST", path_pattern: /^\/api\/builds\/[^/]+\/record-test-run$/, min_role: "operator", sensitive: true, description: "Record test run" },
    { method: "POST", path_pattern: /^\/api\/builds\/[^/]+\/run-validators$/, min_role: "operator", sensitive: true, description: "Run validators" },
    // App pipeline — operator+
    { method: "POST", path_pattern: /^\/api\/app\/intake$/, min_role: "operator", sensitive: true, description: "App intake" },
    { method: "POST", path_pattern: /^\/api\/app\/[^/]+\//, min_role: "operator", sensitive: true, description: "App pipeline step" },
    // Build program — operator+
    { method: "POST", path_pattern: /^\/api\/build-program$/, min_role: "operator", sensitive: true, description: "Run build program" },
    // Governance decisions — admin only
    { method: "POST", path_pattern: /^\/api\/governance\//, min_role: "admin", sensitive: true, description: "Governance decision" },
    { method: "POST", path_pattern: /^\/api\/app\/[^/]+\/promote$/, min_role: "admin", sensitive: true, description: "Promote app" },
];
// ─── Token Bucket Rate Limiter ───────────────────────────────────────────────
class TokenBucketRateLimiter {
    constructor(config) {
        this.config = config;
        this.buckets = new Map();
    }
    check(key) {
        const now = Date.now();
        let bucket = this.buckets.get(key);
        if (!bucket) {
            bucket = { tokens: this.config.max_requests, last_refill: now };
            this.buckets.set(key, bucket);
        }
        // Refill tokens
        const elapsed = now - bucket.last_refill;
        if (elapsed >= this.config.window_ms) {
            bucket.tokens = this.config.max_requests;
            bucket.last_refill = now;
        }
        if (bucket.tokens > 0) {
            bucket.tokens--;
            return {
                allowed: true,
                remaining: bucket.tokens,
                reset_at: bucket.last_refill + this.config.window_ms,
            };
        }
        return {
            allowed: false,
            remaining: 0,
            reset_at: bucket.last_refill + this.config.window_ms,
        };
    }
    /** Clean up old buckets (call periodically) */
    cleanup() {
        const now = Date.now();
        for (const [key, bucket] of this.buckets) {
            if (now - bucket.last_refill > this.config.window_ms * 2) {
                this.buckets.delete(key);
            }
        }
    }
}
// ─── Auth Middleware ──────────────────────────────────────────────────────────
class AuthMiddleware {
    constructor(config, endpointRules = exports.DEFAULT_ENDPOINT_RULES) {
        this.config = config;
        this.endpointRules = endpointRules;
        this.tokenMap = new Map();
        this.auditLog = [];
        for (const token of config.tokens) {
            this.tokenMap.set(token.token, token);
        }
        this.rateLimiter = new TokenBucketRateLimiter(config.rate_limit);
    }
    /**
     * Authenticate and authorize a request.
     * Returns the authenticated identity, or writes an error response and returns null.
     */
    check(request, response) {
        const method = request.method ?? "GET";
        const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        // CORS preflight
        if (method === "OPTIONS") {
            this.writeCorsHeaders(response);
            response.statusCode = 204;
            response.end();
            return null;
        }
        // Always write CORS headers
        this.writeCorsHeaders(response);
        // Rate limiting (by IP or token)
        const clientKey = this.getClientKey(request);
        const rateCheck = this.rateLimiter.check(clientKey);
        response.setHeader("X-RateLimit-Remaining", String(rateCheck.remaining));
        response.setHeader("X-RateLimit-Reset", String(Math.ceil(rateCheck.reset_at / 1000)));
        if (!rateCheck.allowed) {
            this.writeError(response, 429, "RATE_LIMITED", "Too many requests");
            return null;
        }
        // Auth check
        let authenticated;
        if (this.config.auth_disabled) {
            // Dev mode: bypass auth, use default identity
            authenticated = {
                identity: "dev-operator",
                role: "admin",
                token_hash: "dev-mode",
            };
        }
        else {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith("Bearer ")) {
                this.writeError(response, 401, "UNAUTHORIZED", "Missing or invalid Authorization header. Use: Bearer <token>");
                this.audit(method, path, 401, "anonymous", "none", "none");
                return null;
            }
            const token = authHeader.slice(7);
            const tokenConfig = this.tokenMap.get(token);
            if (!tokenConfig) {
                this.writeError(response, 401, "INVALID_TOKEN", "Token not recognized");
                this.audit(method, path, 401, "unknown", "none", this.hashToken(token));
                return null;
            }
            authenticated = {
                identity: tokenConfig.identity,
                role: tokenConfig.role,
                token_hash: this.hashToken(token),
            };
        }
        // Authorization check
        const rule = this.findRule(method, path);
        if (rule && !this.hasRole(authenticated.role, rule.min_role)) {
            this.writeError(response, 403, "FORBIDDEN", `Role '${authenticated.role}' cannot access '${rule.description}'. Requires '${rule.min_role}' or higher.`);
            this.audit(method, path, 403, authenticated.identity, authenticated.role, authenticated.token_hash);
            return null;
        }
        // Audit sensitive operations
        if (rule?.sensitive) {
            this.audit(method, path, 200, authenticated.identity, authenticated.role, authenticated.token_hash);
        }
        return authenticated;
    }
    /**
     * Check request body size against limit.
     * Call this before reading the body.
     */
    checkContentLength(request, response) {
        const contentLength = parseInt(request.headers["content-length"] ?? "0", 10);
        if (contentLength > this.config.max_body_bytes) {
            this.writeError(response, 413, "PAYLOAD_TOO_LARGE", `Body exceeds ${this.config.max_body_bytes} bytes`);
            return false;
        }
        return true;
    }
    getAuditLog() {
        return this.auditLog;
    }
    // ─── Private ─────────────────────────────────────────────────────────────
    findRule(method, path) {
        // Find most specific matching rule (POST rules checked before GET)
        return this.endpointRules.find((rule) => rule.method === method && rule.path_pattern.test(path));
    }
    hasRole(actual, required) {
        return ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required];
    }
    hashToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex").slice(0, 12);
    }
    getClientKey(request) {
        // Use token if present, otherwise IP
        const auth = request.headers.authorization;
        if (auth?.startsWith("Bearer ")) {
            return `token:${this.hashToken(auth.slice(7))}`;
        }
        return `ip:${request.socket.remoteAddress ?? "unknown"}`;
    }
    writeCorsHeaders(response) {
        if (this.config.cors_origins.length === 0)
            return;
        if (this.config.cors_origins.includes("*")) {
            response.setHeader("Access-Control-Allow-Origin", "*");
        }
        else {
            response.setHeader("Access-Control-Allow-Origin", this.config.cors_origins.join(", "));
        }
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
        response.setHeader("Access-Control-Max-Age", "86400");
    }
    writeError(response, status, code, message) {
        response.statusCode = status;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(JSON.stringify({ error: code, message }));
    }
    audit(method, path, status, identity, role, tokenHash) {
        const entry = {
            timestamp: new Date().toISOString(),
            identity,
            role,
            method,
            path,
            status,
            token_hash: tokenHash,
        };
        this.auditLog.push(entry);
        this.config.on_audit?.(entry);
    }
}
exports.AuthMiddleware = AuthMiddleware;
// ─── Config Loader ───────────────────────────────────────────────────────────
function loadSecurityConfig(env = process.env) {
    let tokens = [];
    const tokensJson = env.AES_AUTH_TOKENS;
    if (tokensJson) {
        try {
            const parsed = JSON.parse(tokensJson);
            if (Array.isArray(parsed)) {
                tokens = parsed.filter((t) => typeof t.token === "string" &&
                    typeof t.role === "string" &&
                    typeof t.identity === "string");
            }
        }
        catch {
            // Invalid JSON — no tokens configured
        }
    }
    return {
        tokens,
        auth_disabled: env.AES_AUTH_DISABLED === "true",
        max_body_bytes: parseInt(env.AES_MAX_BODY_BYTES ?? "1048576", 10), // 1MB default
        rate_limit: {
            max_requests: parseInt(env.AES_RATE_LIMIT_MAX ?? "100", 10),
            window_ms: parseInt(env.AES_RATE_LIMIT_WINDOW_MS ?? "60000", 10), // 1 min default
        },
        cors_origins: env.AES_CORS_ORIGINS ? env.AES_CORS_ORIGINS.split(",").map(s => s.trim()) : [],
    };
}
//# sourceMappingURL=auth-middleware.js.map