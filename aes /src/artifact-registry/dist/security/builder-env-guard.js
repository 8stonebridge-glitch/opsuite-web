"use strict";
/**
 * AES Security — Builder Environment Guard
 *
 * Layer 2: Execution Plane Security
 *
 * The builder subprocess must receive a MINIMAL allowlisted environment.
 * Never pass the full parent process.env to the builder.
 *
 * Allowed:
 *   - PATH (needed for finding executables)
 *   - HOME (needed for tool configs)
 *   - TMPDIR/TEMP/TMP (temp file access)
 *   - NODE_ENV
 *   - AES_SESSION_* (session context)
 *   - AES_BUILD_* (build context)
 *   - AES_BRIDGE_* (bridge context)
 *   - AES_READ_SCOPE, AES_WRITE_SCOPE (scope constraints)
 *   - AES_BUILDER_PROMPT (the prompt)
 *
 * NEVER passed:
 *   - Database credentials (AES_POSTGRES_URL, AES_NEO4J_*)
 *   - API keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
 *   - Provider secrets
 *   - Cloud credentials (AWS_*, GCP_*, AZURE_*)
 *   - SSH/GPG keys
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSafeBuilderEnv = buildSafeBuilderEnv;
exports.validateBuilderEnv = validateBuilderEnv;
// ─── Allowlist ───────────────────────────────────────────────────────────────
/** Environment variables the builder is allowed to receive */
const BUILDER_ENV_ALLOWLIST = new Set([
    // System essentials
    "PATH",
    "HOME",
    "USER",
    "SHELL",
    "LANG",
    "LC_ALL",
    "TMPDIR",
    "TEMP",
    "TMP",
    "NODE_ENV",
    "TERM",
    // AES session context (safe — these are identifiers, not secrets)
    "AES_SESSION_ID",
    "AES_SESSION_ROLE",
    "AES_BUILD_ID",
    "AES_BRIDGE_ID",
    "AES_FEATURE_ID",
    "AES_READ_SCOPE",
    "AES_WRITE_SCOPE",
    "AES_BUILDER_PROMPT",
    "AES_BUILDER_CWD",
]);
/** Patterns that are NEVER allowed, even if somehow in the allowlist */
const BUILDER_ENV_DENYLIST_PATTERNS = [
    /^AES_POSTGRES/i,
    /^AES_NEO4J/i,
    /^AES_AUTH_TOKENS/i,
    /^AES_.*PASSWORD/i,
    /^AES_.*SECRET/i,
    /^AES_.*KEY$/i,
    /^DATABASE_URL/i,
    /^POSTGRES/i,
    /^PG/i,
    /^NEO4J/i,
    /^REDIS_URL/i,
    /^MONGO/i,
    /^ANTHROPIC_API_KEY/i,
    /^OPENAI_API_KEY/i,
    /^GOOGLE_/i,
    /^GCP_/i,
    /^AWS_/i,
    /^AZURE_/i,
    /^GITHUB_TOKEN/i,
    /^GH_TOKEN/i,
    /^NPM_TOKEN/i,
    /^DOCKER_/i,
    /^SSH_/i,
    /^GPG_/i,
    /^STRIPE_/i,
    /^CLERK_/i,
    /^SENDGRID_/i,
    /^TWILIO_/i,
    /.*_SECRET$/i,
    /.*_PASSWORD$/i,
    /.*_TOKEN$/i,
    /.*_PRIVATE_KEY$/i,
    /.*_CREDENTIALS$/i,
];
/**
 * Filter the parent process environment to produce a safe builder environment.
 *
 * @param parentEnv - The full parent process.env
 * @param additionalAllowed - Extra vars to allow (e.g. feature-specific config)
 * @param overrides - Values to set/override in the builder env (e.g. AES_SESSION_ID)
 */
function buildSafeBuilderEnv(parentEnv, additionalAllowed = [], overrides = {}) {
    const fullAllowlist = new Set([...BUILDER_ENV_ALLOWLIST, ...additionalAllowed]);
    const env = {};
    const blocked = [];
    const allowed = [];
    for (const [key, value] of Object.entries(parentEnv)) {
        if (typeof value !== "string")
            continue;
        // Check denylist first — always wins
        if (isDenied(key)) {
            blocked.push(key);
            continue;
        }
        // Check allowlist
        if (fullAllowlist.has(key)) {
            env[key] = value;
            allowed.push(key);
        }
        else {
            blocked.push(key);
        }
    }
    // Apply overrides (these bypass the filter — they're set by AES, not inherited)
    for (const [key, value] of Object.entries(overrides)) {
        // But still deny credential patterns even in overrides
        if (isDenied(key)) {
            blocked.push(`override:${key}`);
            continue;
        }
        env[key] = value;
        if (!allowed.includes(key))
            allowed.push(key);
    }
    return { env, blocked, allowed };
}
function isDenied(key) {
    return BUILDER_ENV_DENYLIST_PATTERNS.some(pattern => pattern.test(key));
}
/**
 * Validate that no secrets leaked into a builder environment.
 * Call this as a post-check before spawning.
 */
function validateBuilderEnv(env) {
    const violations = [];
    for (const key of Object.keys(env)) {
        if (isDenied(key)) {
            violations.push(`Denied key present in builder env: ${key}`);
        }
    }
    // Check values for obvious credential patterns
    for (const [key, value] of Object.entries(env)) {
        if (value.startsWith("postgres://") || value.startsWith("postgresql://")) {
            violations.push(`Database URL found in ${key}`);
        }
        if (value.startsWith("bolt://") || value.startsWith("bolt+s://")) {
            violations.push(`Neo4j URL found in ${key}`);
        }
        if (value.startsWith("sk-") && value.length > 20) {
            violations.push(`Possible API key found in ${key}`);
        }
        if (value.startsWith("ghp_") || value.startsWith("gho_")) {
            violations.push(`GitHub token found in ${key}`);
        }
    }
    return { safe: violations.length === 0, violations };
}
//# sourceMappingURL=builder-env-guard.js.map