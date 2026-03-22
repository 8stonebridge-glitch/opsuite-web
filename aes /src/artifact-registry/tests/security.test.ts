/**
 * AES Security Tests
 *
 * Tests all four security layers:
 *   Layer 1: Control plane (auth, authorization, rate limiting, CORS)
 *   Layer 2: Execution plane (builder env guard)
 *   Layer 3: Data plane (hard vetoes — auth_ambiguity etc.)
 *   Layer 4: Transport (credential detection)
 */

import { AuthMiddleware, loadSecurityConfig, type SecurityConfig } from "../src/security/auth-middleware";
import { buildSafeBuilderEnv, validateBuilderEnv } from "../src/security/builder-env-guard";
import { evaluateHardVetoes, type HardVetoInput } from "../src/policy/hard-veto-engine";
import type { IncomingMessage, ServerResponse } from "node:http";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<SecurityConfig>): SecurityConfig {
  return {
    tokens: [
      { token: "test-operator-token", role: "operator", identity: "operator@test.com" },
      { token: "test-reviewer-token", role: "reviewer", identity: "reviewer@test.com" },
      { token: "test-admin-token", role: "admin", identity: "admin@test.com" },
    ],
    auth_disabled: false,
    max_body_bytes: 1048576,
    rate_limit: { max_requests: 10, window_ms: 60000 },
    cors_origins: ["http://localhost:3000"],
    ...overrides,
  };
}

function mockRequest(method: string, url: string, authHeader?: string): IncomingMessage {
  return {
    method,
    url,
    headers: authHeader ? { authorization: authHeader } : {},
    socket: { remoteAddress: "127.0.0.1" },
  } as unknown as IncomingMessage;
}

function mockResponse(): ServerResponse & { _status?: number; _body?: string; _headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const res = {
    _headers: headers,
    statusCode: 200,
    setHeader(name: string, value: string) { headers[name.toLowerCase()] = value; },
    end(body?: string) { (res as any)._body = body; },
  } as any;
  return res;
}

function makeVetoInput(overrides?: Partial<HardVetoInput>): HardVetoInput {
  return {
    bridge: {
      status: "VALIDATED" as const,
      test_cases: [],
      acceptance_criteria: [],
      constraints: [],
      dependency_type: "HARD" as const,
      depends_on_bridge_ids: [],
      write_scope: { paths: ["src/"] },
      read_scope: { paths: ["src/"] },
      api_contracts: [],
      events: [],
      db_touches: [],
      component_boundaries: [],
    },
    is_fresh: true,
    dependencies_satisfied: true,
    ...overrides,
  };
}

// ─── Layer 1: Auth Middleware ─────────────────────────────────────────────────

describe("AuthMiddleware", () => {
  test("rejects request without auth header", () => {
    const middleware = new AuthMiddleware(makeConfig());
    const req = mockRequest("POST", "/api/builds/prepare");
    const res = mockResponse();

    const result = middleware.check(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  test("rejects invalid token", () => {
    const middleware = new AuthMiddleware(makeConfig());
    const req = mockRequest("POST", "/api/builds/prepare", "Bearer wrong-token");
    const res = mockResponse();

    const result = middleware.check(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(401);
  });

  test("accepts valid operator token for build endpoints", () => {
    const middleware = new AuthMiddleware(makeConfig());
    const req = mockRequest("POST", "/api/builds/prepare", "Bearer test-operator-token");
    const res = mockResponse();

    const result = middleware.check(req, res);
    expect(result).not.toBeNull();
    expect(result!.identity).toBe("operator@test.com");
    expect(result!.role).toBe("operator");
  });

  test("rejects reviewer on operator endpoints", () => {
    const middleware = new AuthMiddleware(makeConfig());
    const req = mockRequest("POST", "/api/builds/prepare", "Bearer test-reviewer-token");
    const res = mockResponse();

    const result = middleware.check(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  test("allows reviewer on GET endpoints", () => {
    const middleware = new AuthMiddleware(makeConfig());
    const req = mockRequest("GET", "/api/attention-queue", "Bearer test-reviewer-token");
    const res = mockResponse();

    const result = middleware.check(req, res);
    expect(result).not.toBeNull();
    expect(result!.role).toBe("reviewer");
  });

  test("admin can access everything", () => {
    const middleware = new AuthMiddleware(makeConfig());
    const req = mockRequest("POST", "/api/governance/decide", "Bearer test-admin-token");
    const res = mockResponse();

    const result = middleware.check(req, res);
    expect(result).not.toBeNull();
    expect(result!.role).toBe("admin");
  });

  test("rejects operator on admin-only governance endpoints", () => {
    const middleware = new AuthMiddleware(makeConfig());
    const req = mockRequest("POST", "/api/governance/decide", "Bearer test-operator-token");
    const res = mockResponse();

    const result = middleware.check(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(403);
  });

  test("rate limits after max requests", () => {
    const middleware = new AuthMiddleware(makeConfig({
      rate_limit: { max_requests: 3, window_ms: 60000 },
    }));

    for (let i = 0; i < 3; i++) {
      const req = mockRequest("GET", "/api/health", "Bearer test-operator-token");
      const res = mockResponse();
      middleware.check(req, res);
    }

    const req = mockRequest("GET", "/api/health", "Bearer test-operator-token");
    const res = mockResponse();
    const result = middleware.check(req, res);
    expect(result).toBeNull();
    expect(res.statusCode).toBe(429);
  });

  test("dev mode bypasses auth", () => {
    const middleware = new AuthMiddleware(makeConfig({ auth_disabled: true }));
    const req = mockRequest("POST", "/api/builds/prepare");
    const res = mockResponse();

    const result = middleware.check(req, res);
    expect(result).not.toBeNull();
    expect(result!.identity).toBe("dev-operator");
    expect(result!.role).toBe("admin");
  });

  test("CORS headers set when origins configured", () => {
    const middleware = new AuthMiddleware(makeConfig({
      cors_origins: ["http://localhost:3000"],
    }));
    const req = mockRequest("GET", "/api/health", "Bearer test-operator-token");
    const res = mockResponse();

    middleware.check(req, res);
    expect(res._headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  test("audit log records sensitive operations", () => {
    const middleware = new AuthMiddleware(makeConfig());
    const req = mockRequest("POST", "/api/builds/prepare", "Bearer test-operator-token");
    const res = mockResponse();

    middleware.check(req, res);

    const log = middleware.getAuditLog();
    expect(log.length).toBe(1);
    expect(log[0]!.identity).toBe("operator@test.com");
    expect(log[0]!.path).toBe("/api/builds/prepare");
  });
});

// ─── Layer 2: Builder Env Guard ──────────────────────────────────────────────

describe("BuilderEnvGuard", () => {
  test("allows PATH and HOME", () => {
    const result = buildSafeBuilderEnv({
      PATH: "/usr/bin",
      HOME: "/home/user",
    });
    expect(result.env.PATH).toBe("/usr/bin");
    expect(result.env.HOME).toBe("/home/user");
    expect(result.blocked.length).toBe(0);
  });

  test("blocks database credentials", () => {
    const result = buildSafeBuilderEnv({
      PATH: "/usr/bin",
      AES_POSTGRES_URL: "postgres://secret@localhost/db",
      AES_NEO4J_PASSWORD: "secret",
      DATABASE_URL: "postgres://also-secret",
    });
    expect(result.env.AES_POSTGRES_URL).toBeUndefined();
    expect(result.env.AES_NEO4J_PASSWORD).toBeUndefined();
    expect(result.env.DATABASE_URL).toBeUndefined();
    expect(result.blocked).toContain("AES_POSTGRES_URL");
    expect(result.blocked).toContain("AES_NEO4J_PASSWORD");
  });

  test("blocks API keys", () => {
    const result = buildSafeBuilderEnv({
      PATH: "/usr/bin",
      ANTHROPIC_API_KEY: "sk-ant-secret",
      OPENAI_API_KEY: "sk-secret",
      GITHUB_TOKEN: "ghp_secret",
      AWS_SECRET_ACCESS_KEY: "aws-secret",
    });
    expect(result.env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(result.env.OPENAI_API_KEY).toBeUndefined();
    expect(result.env.GITHUB_TOKEN).toBeUndefined();
    expect(result.env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
  });

  test("allows AES session vars", () => {
    const result = buildSafeBuilderEnv({
      PATH: "/usr/bin",
      AES_SESSION_ID: "session-123",
      AES_BUILD_ID: "build-456",
      AES_READ_SCOPE: '["src/"]',
      AES_WRITE_SCOPE: '["src/"]',
    });
    expect(result.env.AES_SESSION_ID).toBe("session-123");
    expect(result.env.AES_BUILD_ID).toBe("build-456");
  });

  test("blocks unknown vars not in allowlist", () => {
    const result = buildSafeBuilderEnv({
      PATH: "/usr/bin",
      RANDOM_VAR: "value",
      MY_SECRET: "something",
    });
    expect(result.env.RANDOM_VAR).toBeUndefined();
    expect(result.blocked).toContain("RANDOM_VAR");
  });

  test("denylist overrides overrides", () => {
    const result = buildSafeBuilderEnv(
      { PATH: "/usr/bin" },
      [],
      { AES_POSTGRES_URL: "postgres://injected" },
    );
    expect(result.env.AES_POSTGRES_URL).toBeUndefined();
    expect(result.blocked).toContain("override:AES_POSTGRES_URL");
  });

  test("validateBuilderEnv catches credential patterns in values", () => {
    const validation = validateBuilderEnv({
      PATH: "/usr/bin",
      SAFE_VAR: "postgres://user:pass@host/db",
    });
    expect(validation.safe).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);
  });

  test("validateBuilderEnv passes clean env", () => {
    const validation = validateBuilderEnv({
      PATH: "/usr/bin",
      HOME: "/home/user",
      AES_SESSION_ID: "session-123",
    });
    expect(validation.safe).toBe(true);
    expect(validation.violations.length).toBe(0);
  });
});

// ─── Layer 3: Security Hard Vetoes ───────────────────────────────────────────

describe("Security Hard Vetoes", () => {
  test("vetoes auth_ambiguity", () => {
    const vetoes = evaluateHardVetoes(makeVetoInput({ auth_ambiguity: true }));
    expect(vetoes.some(v => v.code === "AUTH_AMBIGUITY")).toBe(true);
    expect(vetoes.find(v => v.code === "AUTH_AMBIGUITY")!.blocking).toBe(true);
  });

  test("vetoes permission_ambiguity", () => {
    const vetoes = evaluateHardVetoes(makeVetoInput({ permission_ambiguity: true }));
    expect(vetoes.some(v => v.code === "PERMISSION_AMBIGUITY")).toBe(true);
  });

  test("vetoes missing_data_ownership", () => {
    const vetoes = evaluateHardVetoes(makeVetoInput({ missing_data_ownership: true }));
    expect(vetoes.some(v => v.code === "MISSING_DATA_OWNERSHIP")).toBe(true);
  });

  test("vetoes undefined_destructive_behavior", () => {
    const vetoes = evaluateHardVetoes(makeVetoInput({ undefined_destructive_behavior: true }));
    expect(vetoes.some(v => v.code === "UNDEFINED_DESTRUCTIVE_BEHAVIOR")).toBe(true);
  });

  test("auto-detects auth ambiguity from risk tags without auth constraints", () => {
    const vetoes = evaluateHardVetoes(makeVetoInput({
      risk_domain_tags: ["auth"],
      bridge: {
        ...makeVetoInput().bridge,
        constraints: ["Use TypeScript"],  // No auth constraint
      },
    }));
    expect(vetoes.some(v => v.code === "AUTH_AMBIGUITY")).toBe(true);
  });

  test("no auth veto when auth constraints present", () => {
    const vetoes = evaluateHardVetoes(makeVetoInput({
      risk_domain_tags: ["auth"],
      bridge: {
        ...makeVetoInput().bridge,
        constraints: ["Use JWT for session management"],
      },
    }));
    // Only auto-detect veto, which should NOT fire because constraint contains "session"
    const authVetoes = vetoes.filter(v => v.code === "AUTH_AMBIGUITY");
    expect(authVetoes.length).toBe(0);
  });

  test("auto-detects permission ambiguity from risk tags", () => {
    const vetoes = evaluateHardVetoes(makeVetoInput({
      risk_domain_tags: ["permissions"],
      bridge: {
        ...makeVetoInput().bridge,
        constraints: ["Use TypeScript"],  // No permission constraint
      },
    }));
    expect(vetoes.some(v => v.code === "PERMISSION_AMBIGUITY")).toBe(true);
  });

  test("existing vetoes still work", () => {
    const vetoes = evaluateHardVetoes(makeVetoInput({
      dependencies_satisfied: false,
    }));
    expect(vetoes.some(v => v.code === "DEPENDENCY_NOT_SATISFIED")).toBe(true);
  });
});

// ─── Config Loader ───────────────────────────────────────────────────────────

describe("loadSecurityConfig", () => {
  test("loads tokens from env", () => {
    const config = loadSecurityConfig({
      AES_AUTH_TOKENS: JSON.stringify([
        { token: "abc", role: "operator", identity: "test@test.com" },
      ]),
    } as any);
    expect(config.tokens.length).toBe(1);
    expect(config.tokens[0]!.identity).toBe("test@test.com");
  });

  test("auth disabled from env", () => {
    const config = loadSecurityConfig({
      AES_AUTH_DISABLED: "true",
    } as any);
    expect(config.auth_disabled).toBe(true);
  });

  test("defaults when env empty", () => {
    const config = loadSecurityConfig({} as any);
    expect(config.tokens.length).toBe(0);
    expect(config.auth_disabled).toBe(false);
    expect(config.max_body_bytes).toBe(1048576);
  });
});
