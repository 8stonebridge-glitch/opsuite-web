/**
 * AES Retry Brief Generator
 *
 * When a build fails, this creates a targeted retry brief from
 * concrete failure evidence. The next build attempt gets the
 * specific errors and mitigations instead of rebuilding blind.
 *
 * Path 3: Better Failure Recovery
 */

import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RetryBriefInput {
  build_id: string;
  bridge_id: string;
  feature_id: string;
  attempt_number: number;
  /** Raw error output from test runner or build process */
  error_output: string;
  /** Parsed test failures if available */
  test_failures?: TestFailureDetail[];
  /** Validator violations if available */
  validator_violations?: string[];
  /** Scope violations if available */
  scope_violations?: string[];
}

export interface TestFailureDetail {
  test_name: string;
  error_message: string;
  expected?: string;
  actual?: string;
  file_path?: string;
  line_number?: number;
}

export interface RetryBrief {
  retry_brief_id: string;
  build_id: string;
  bridge_id: string;
  feature_id: string;
  attempt_number: number;
  created_at: string;

  /** Classified failure type */
  failure_type: FailureType;

  /** Human-readable failure summary */
  failure_summary: string;

  /** Specific errors that must be fixed */
  specific_errors: SpecificError[];

  /** Concrete mitigations to include in the retry prompt */
  mitigations: string[];

  /** Whether the retry should change strategy */
  strategy_change: StrategyChange | null;

  artifact_refs: ArtifactRef[];
}

export type FailureType =
  | "COMPILE_ERROR"
  | "TYPE_ERROR"
  | "TEST_ASSERTION_FAILURE"
  | "RUNTIME_ERROR"
  | "SCOPE_VIOLATION"
  | "TIMEOUT"
  | "MISSING_FILES"
  | "IMPORT_MISMATCH"
  | "UNKNOWN";

export interface SpecificError {
  type: FailureType;
  message: string;
  file_path?: string;
  line_number?: number;
  fix_hint: string;
}

export interface StrategyChange {
  from: string;
  to: string;
  reason: string;
}

// ─── Generator ───────────────────────────────────────────────────────────────

export class RetryBriefGenerator {
  constructor(
    _registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  generate(input: RetryBriefInput): RetryBrief {
    const errors = this.classifyErrors(input);
    const failureType = this.dominantFailureType(errors);
    const mitigations = this.generateMitigations(errors, failureType);
    const strategyChange = this.recommendStrategyChange(input, failureType, errors);

    return {
      retry_brief_id: `RB-${input.build_id}-${input.attempt_number}`,
      build_id: input.build_id,
      bridge_id: input.bridge_id,
      feature_id: input.feature_id,
      attempt_number: input.attempt_number,
      created_at: this.now().toISOString(),
      failure_type: failureType,
      failure_summary: this.generateSummary(errors, failureType),
      specific_errors: errors,
      mitigations,
      strategy_change: strategyChange,
      artifact_refs: [
        { artifact_type: "build", artifact_id: input.build_id, role: "validation_evidence" },
      ],
    };
  }

  /**
   * Format the retry brief as a prompt section to inject into the builder prompt
   */
  formatForPrompt(brief: RetryBrief): string {
    const lines: string[] = [
      "",
      "═══ PREVIOUS BUILD FAILED — RETRY BRIEF ═══",
      `Attempt: ${brief.attempt_number}`,
      `Failure type: ${brief.failure_type}`,
      `Summary: ${brief.failure_summary}`,
      "",
      "SPECIFIC ERRORS TO FIX:",
    ];

    for (const error of brief.specific_errors) {
      lines.push(`  ✗ [${error.type}] ${error.message}`);
      if (error.file_path) lines.push(`    File: ${error.file_path}${error.line_number ? `:${error.line_number}` : ""}`);
      lines.push(`    Fix: ${error.fix_hint}`);
    }

    if (brief.mitigations.length > 0) {
      lines.push("");
      lines.push("MITIGATIONS:");
      for (const m of brief.mitigations) {
        lines.push(`  → ${m}`);
      }
    }

    if (brief.strategy_change) {
      lines.push("");
      lines.push(`STRATEGY CHANGE: ${brief.strategy_change.from} → ${brief.strategy_change.to}`);
      lines.push(`  Reason: ${brief.strategy_change.reason}`);
    }

    lines.push("═══ END RETRY BRIEF ═══");
    return lines.join("\n");
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private classifyErrors(input: RetryBriefInput): SpecificError[] {
    const errors: SpecificError[] = [];
    const output = input.error_output;

    // TypeScript compile errors
    const tsErrors = output.match(/error TS\d+: .+/g);
    if (tsErrors) {
      for (const tsError of tsErrors) {
        const match = tsError.match(/error (TS\d+): (.+)/);
        if (match) {
          errors.push({
            type: "TYPE_ERROR",
            message: match[2]!,
            fix_hint: this.tsErrorHint(match[1]!, match[2]!),
          });
        }
      }
    }

    // Import/export mismatches
    const importErrors = output.match(/Cannot find module .+|has no exported member .+/g);
    if (importErrors) {
      for (const ie of importErrors) {
        errors.push({
          type: "IMPORT_MISMATCH",
          message: ie,
          fix_hint: "Check that export names in the source file match import names in the test file exactly",
        });
      }
    }

    // Runtime errors
    const runtimeErrors = output.match(/(TypeError|ReferenceError|SyntaxError): .+/g);
    if (runtimeErrors) {
      for (const re of runtimeErrors) {
        errors.push({
          type: "RUNTIME_ERROR",
          message: re,
          fix_hint: this.runtimeErrorHint(re),
        });
      }
    }

    // Test assertion failures
    if (input.test_failures) {
      for (const tf of input.test_failures) {
        errors.push({
          type: "TEST_ASSERTION_FAILURE",
          message: `${tf.test_name}: ${tf.error_message}`,
          file_path: tf.file_path,
          line_number: tf.line_number,
          fix_hint: tf.expected && tf.actual
            ? `Expected ${tf.expected} but got ${tf.actual} — check the implementation logic`
            : "Review the implementation against the acceptance criteria",
        });
      }
    }

    // Scope violations
    if (input.scope_violations) {
      for (const sv of input.scope_violations) {
        errors.push({
          type: "SCOPE_VIOLATION",
          message: sv,
          fix_hint: "Do not write to files outside the bridge write_scope",
        });
      }
    }

    // Validator violations
    if (input.validator_violations) {
      for (const vv of input.validator_violations) {
        errors.push({
          type: "UNKNOWN",
          message: vv,
          fix_hint: "Address the validator concern before retrying",
        });
      }
    }

    // If no specific errors found, create a generic one from the output
    if (errors.length === 0) {
      const shortOutput = output.slice(0, 500);
      errors.push({
        type: "UNKNOWN",
        message: shortOutput,
        fix_hint: "Review the full error output and address the root cause",
      });
    }

    return errors;
  }

  private dominantFailureType(errors: SpecificError[]): FailureType {
    if (errors.length === 0) return "UNKNOWN";
    // Priority order
    const priority: FailureType[] = [
      "SCOPE_VIOLATION",
      "COMPILE_ERROR",
      "TYPE_ERROR",
      "IMPORT_MISMATCH",
      "RUNTIME_ERROR",
      "TEST_ASSERTION_FAILURE",
      "TIMEOUT",
      "MISSING_FILES",
      "UNKNOWN",
    ];
    for (const type of priority) {
      if (errors.some(e => e.type === type)) return type;
    }
    return errors[0]!.type;
  }

  private generateSummary(errors: SpecificError[], failureType: FailureType): string {
    const count = errors.length;
    switch (failureType) {
      case "TYPE_ERROR":
      case "COMPILE_ERROR":
        return `Build failed with ${count} TypeScript compilation error(s). Code does not compile.`;
      case "IMPORT_MISMATCH":
        return `Build failed because test imports don't match source exports. ${count} import mismatch(es).`;
      case "RUNTIME_ERROR":
        return `Tests crashed with ${count} runtime error(s). Code compiles but fails at runtime.`;
      case "TEST_ASSERTION_FAILURE":
        return `${count} test assertion(s) failed. Code runs but produces wrong results.`;
      case "SCOPE_VIOLATION":
        return `Build wrote to ${count} file(s) outside the allowed scope.`;
      case "TIMEOUT":
        return `Build timed out. Reduce complexity or increase timeout.`;
      case "MISSING_FILES":
        return `Build did not generate all required files.`;
      default:
        return `Build failed with ${count} error(s).`;
    }
  }

  private generateMitigations(_errors: SpecificError[], failureType: FailureType): string[] {
    const mitigations: string[] = [];

    if (failureType === "TYPE_ERROR" || failureType === "COMPILE_ERROR") {
      mitigations.push("Write the types file FIRST, then the implementation, then the tests");
      mitigations.push("Ensure every function parameter has an explicit type annotation");
      mitigations.push("Check that all imports resolve to actual exports");
    }

    if (failureType === "IMPORT_MISMATCH") {
      mitigations.push("List all exports from the source file before writing the test file");
      mitigations.push("Use the exact same function names in imports and exports");
      mitigations.push("Check relative import paths — '../src/file' not './src/file'");
    }

    if (failureType === "RUNTIME_ERROR") {
      mitigations.push("Wrap async handler calls in try/catch");
      mitigations.push("Check for null/undefined before accessing properties");
      mitigations.push("Ensure Map/Set operations use correct key types");
    }

    if (failureType === "TEST_ASSERTION_FAILURE") {
      mitigations.push("Re-read the acceptance criteria and verify implementation matches");
      mitigations.push("Check edge cases: empty inputs, missing items, boundary values");
      mitigations.push("Ensure async functions are properly awaited in tests");
    }

    if (failureType === "SCOPE_VIOLATION") {
      mitigations.push("Only write to files within the bridge write_scope paths");
      mitigations.push("Do not modify files in other feature directories");
    }

    return mitigations;
  }

  private recommendStrategyChange(
    input: RetryBriefInput,
    failureType: FailureType,
    errors: SpecificError[],
  ): StrategyChange | null {
    // After 2+ failures, recommend upgrading strategy
    if (input.attempt_number >= 2) {
      if (failureType === "TYPE_ERROR" || failureType === "IMPORT_MISMATCH") {
        return {
          from: "ONE_PASS",
          to: "SKELETON",
          reason: `${input.attempt_number} consecutive failures with ${failureType} — provide exact types and signatures`,
        };
      }
      if (failureType === "TEST_ASSERTION_FAILURE" && errors.length > 3) {
        return {
          from: "TWO_PASS",
          to: "SKELETON",
          reason: `${errors.length} test failures after ${input.attempt_number} attempts — provide reference implementation`,
        };
      }
      if (input.attempt_number >= 3) {
        return {
          from: "current",
          to: "ESCALATE",
          reason: `${input.attempt_number} consecutive failures — escalate to human review`,
        };
      }
    }
    return null;
  }

  private tsErrorHint(code: string, message: string): string {
    if (code === "TS2304") return `Name not found — check import statements and spelling`;
    if (code === "TS2345") return `Argument type mismatch — check function parameter types`;
    if (code === "TS2322") return `Type assignment mismatch — check return types`;
    if (code === "TS7006") return `Parameter implicitly has 'any' type — add explicit type annotation`;
    if (code === "TS2339") return `Property does not exist — check the type definition`;
    if (code === "TS2307") return `Cannot find module — check the import path`;
    return `Fix TypeScript error ${code}: ${message}`;
  }

  private runtimeErrorHint(error: string): string {
    if (error.includes("is not a function")) return "Check that the imported name is actually exported as a function";
    if (error.includes("Cannot read properties of undefined")) return "A variable is undefined — check initialization and null checks";
    if (error.includes("is not defined")) return "Variable not in scope — check imports and declarations";
    return "Check the stack trace for the root cause";
  }
}
