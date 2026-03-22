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
export interface BuilderEnvResult {
    /** The filtered environment to pass to the builder */
    env: Record<string, string>;
    /** Variables that were blocked */
    blocked: string[];
    /** Variables that were allowed */
    allowed: string[];
}
/**
 * Filter the parent process environment to produce a safe builder environment.
 *
 * @param parentEnv - The full parent process.env
 * @param additionalAllowed - Extra vars to allow (e.g. feature-specific config)
 * @param overrides - Values to set/override in the builder env (e.g. AES_SESSION_ID)
 */
export declare function buildSafeBuilderEnv(parentEnv: NodeJS.ProcessEnv, additionalAllowed?: string[], overrides?: Record<string, string>): BuilderEnvResult;
/**
 * Validate that no secrets leaked into a builder environment.
 * Call this as a post-check before spawning.
 */
export declare function validateBuilderEnv(env: Record<string, string>): {
    safe: boolean;
    violations: string[];
};
//# sourceMappingURL=builder-env-guard.d.ts.map