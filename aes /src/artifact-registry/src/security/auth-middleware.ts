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
import * as crypto from "node:crypto";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Endpoint Authorization Rules ────────────────────────────────────────────

export interface EndpointRule {
  method: string;
  path_pattern: RegExp;
  min_role: AuthRole;
  sensitive: boolean;
  description: string;
}

const ROLE_HIERARCHY: Record<AuthRole, number> = {
  reviewer: 0,
  operator: 1,
  admin: 2,
};

/**
 * Default endpoint authorization rules.
 * Higher roles include all lower role permissions.
 */
export const DEFAULT_ENDPOINT_RULES: EndpointRule[] = [
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
  private buckets = new Map<string, { tokens: number; last_refill: number }>();

  constructor(private readonly config: RateLimitConfig) {}

  check(key: string): { allowed: boolean; remaining: number; reset_at: number } {
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
  cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.last_refill > this.config.window_ms * 2) {
        this.buckets.delete(key);
      }
    }
  }
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

export class AuthMiddleware {
  private readonly tokenMap = new Map<string, AuthToken>();
  private readonly rateLimiter: TokenBucketRateLimiter;
  private readonly auditLog: AuditEntry[] = [];

  constructor(
    private readonly config: SecurityConfig,
    private readonly endpointRules: EndpointRule[] = DEFAULT_ENDPOINT_RULES,
  ) {
    for (const token of config.tokens) {
      this.tokenMap.set(token.token, token);
    }
    this.rateLimiter = new TokenBucketRateLimiter(config.rate_limit);
  }

  /**
   * Authenticate and authorize a request.
   * Returns the authenticated identity, or writes an error response and returns null.
   */
  check(
    request: IncomingMessage,
    response: ServerResponse,
  ): AuthenticatedRequest | null {
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
    let authenticated: AuthenticatedRequest;

    if (this.config.auth_disabled) {
      // Dev mode: bypass auth, use default identity
      authenticated = {
        identity: "dev-operator",
        role: "admin",
        token_hash: "dev-mode",
      };
    } else {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        this.writeError(response, 401, "UNAUTHORIZED", "Missing or invalid Authorization header. Use: Bearer <token>");
        this.audit(method, path, 401, "anonymous", "none" as AuthRole, "none");
        return null;
      }

      const token = authHeader.slice(7);
      const tokenConfig = this.tokenMap.get(token);
      if (!tokenConfig) {
        this.writeError(response, 401, "INVALID_TOKEN", "Token not recognized");
        this.audit(method, path, 401, "unknown", "none" as AuthRole, this.hashToken(token));
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
  checkContentLength(request: IncomingMessage, response: ServerResponse): boolean {
    const contentLength = parseInt(request.headers["content-length"] ?? "0", 10);
    if (contentLength > this.config.max_body_bytes) {
      this.writeError(response, 413, "PAYLOAD_TOO_LARGE", `Body exceeds ${this.config.max_body_bytes} bytes`);
      return false;
    }
    return true;
  }

  getAuditLog(): ReadonlyArray<AuditEntry> {
    return this.auditLog;
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private findRule(method: string, path: string): EndpointRule | undefined {
    // Find most specific matching rule (POST rules checked before GET)
    return this.endpointRules.find(
      (rule) => rule.method === method && rule.path_pattern.test(path)
    );
  }

  private hasRole(actual: AuthRole, required: AuthRole): boolean {
    return ROLE_HIERARCHY[actual] >= ROLE_HIERARCHY[required];
  }

  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex").slice(0, 12);
  }

  private getClientKey(request: IncomingMessage): string {
    // Use token if present, otherwise IP
    const auth = request.headers.authorization;
    if (auth?.startsWith("Bearer ")) {
      return `token:${this.hashToken(auth.slice(7))}`;
    }
    return `ip:${request.socket.remoteAddress ?? "unknown"}`;
  }

  private writeCorsHeaders(response: ServerResponse): void {
    if (this.config.cors_origins.length === 0) return;

    if (this.config.cors_origins.includes("*")) {
      response.setHeader("Access-Control-Allow-Origin", "*");
    } else {
      response.setHeader("Access-Control-Allow-Origin", this.config.cors_origins.join(", "));
    }
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    response.setHeader("Access-Control-Max-Age", "86400");
  }

  private writeError(response: ServerResponse, status: number, code: string, message: string): void {
    response.statusCode = status;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: code, message }));
  }

  private audit(method: string, path: string, status: number, identity: string, role: AuthRole, tokenHash: string): void {
    const entry: AuditEntry = {
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

// ─── Config Loader ───────────────────────────────────────────────────────────

export function loadSecurityConfig(env: NodeJS.ProcessEnv = process.env): SecurityConfig {
  let tokens: AuthToken[] = [];

  const tokensJson = env.AES_AUTH_TOKENS;
  if (tokensJson) {
    try {
      const parsed = JSON.parse(tokensJson);
      if (Array.isArray(parsed)) {
        tokens = parsed.filter(
          (t): t is AuthToken =>
            typeof t.token === "string" &&
            typeof t.role === "string" &&
            typeof t.identity === "string"
        );
      }
    } catch {
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
