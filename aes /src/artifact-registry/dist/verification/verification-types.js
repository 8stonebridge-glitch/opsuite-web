"use strict";
/**
 * AES Verification Types
 *
 * Defines the structured output of build verification checks.
 * Used by the verification runner, retry brief generator, and promotion gate.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_FRONTEND_POLICY = exports.DEFAULT_HIGH_RISK_POLICY = exports.DEFAULT_BACKEND_POLICY = exports.DEFAULT_LOW_RISK_POLICY = void 0;
// ─── Default Policies ────────────────────────────────────────────────────────
exports.DEFAULT_LOW_RISK_POLICY = {
    pass_1_checks: [{ type: "builtin", check: "typecheck" }],
    pass_2_checks: [],
    final_checks: [{ type: "builtin", check: "lint" }],
    stop_on_pass_1_failure: true,
    stop_on_pass_2_failure: false,
};
exports.DEFAULT_BACKEND_POLICY = {
    pass_1_checks: [{ type: "builtin", check: "typecheck" }],
    pass_2_checks: [{ type: "builtin", check: "test" }],
    final_checks: [{ type: "builtin", check: "all" }],
    stop_on_pass_1_failure: true,
    stop_on_pass_2_failure: false,
};
exports.DEFAULT_HIGH_RISK_POLICY = {
    pass_1_checks: [{ type: "builtin", check: "typecheck" }],
    pass_2_checks: [{ type: "builtin", check: "test" }],
    final_checks: [
        { type: "builtin", check: "all" },
    ],
    stop_on_pass_1_failure: true,
    stop_on_pass_2_failure: true,
};
exports.DEFAULT_FRONTEND_POLICY = {
    pass_1_checks: [{ type: "builtin", check: "typecheck" }],
    pass_2_checks: [{ type: "builtin", check: "test" }],
    final_checks: [
        { type: "builtin", check: "lint" },
        { type: "builtin", check: "test" },
    ],
    stop_on_pass_1_failure: true,
    stop_on_pass_2_failure: false,
};
//# sourceMappingURL=verification-types.js.map