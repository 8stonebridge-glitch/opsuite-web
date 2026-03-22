/**
 * AES Verification — Failure Classifier
 *
 * Classifies raw check output into structured failure categories.
 * Extracts failing files, symbols, and actionable error summaries.
 */

import type { FailureClass } from "./verification-types";

export interface ClassificationResult {
  failure_class: FailureClass;
  normalized_error_summary: string;
  failing_files: string[];
  failing_symbols: string[];
}

/**
 * Classify raw check output into a failure category.
 */
export function classifyFailure(
  checkName: string,
  rawOutput: string,
): ClassificationResult {
  const output = rawOutput || "";
  const failingFiles: string[] = [];
  const failingSymbols: string[] = [];

  // Extract file paths from TypeScript errors (src/foo.ts:10:5)
  const fileMatches = output.match(/([a-zA-Z0-9_\-./]+\.tsx?):(\d+)/g);
  if (fileMatches) {
    for (const match of fileMatches) {
      const file = match.split(":")[0]!;
      if (!failingFiles.includes(file)) failingFiles.push(file);
    }
  }

  // Extract symbol names from common error patterns
  const symbolMatches = output.match(/(?:Cannot find name|is not defined|has no exported member) '([^']+)'/g);
  if (symbolMatches) {
    for (const match of symbolMatches) {
      const symbolMatch = match.match(/'([^']+)'/);
      if (symbolMatch?.[1] && !failingSymbols.includes(symbolMatch[1])) {
        failingSymbols.push(symbolMatch[1]);
      }
    }
  }

  // Classify by check name first
  if (checkName === "typecheck") {
    return {
      failure_class: classifyTypeError(output),
      normalized_error_summary: normalizeTypeErrors(output),
      failing_files: failingFiles,
      failing_symbols: failingSymbols,
    };
  }

  if (checkName === "test") {
    return {
      failure_class: classifyTestError(output),
      normalized_error_summary: normalizeTestErrors(output),
      failing_files: failingFiles,
      failing_symbols: failingSymbols,
    };
  }

  if (checkName === "lint") {
    return {
      failure_class: "lint",
      normalized_error_summary: normalizeLintErrors(output),
      failing_files: failingFiles,
      failing_symbols: failingSymbols,
    };
  }

  // Generic classification by content
  return {
    failure_class: classifyGeneric(output),
    normalized_error_summary: output.slice(0, 500),
    failing_files: failingFiles,
    failing_symbols: failingSymbols,
  };
}

// ─── Type Error Classification ───────────────────────────────────────────────

function classifyTypeError(output: string): FailureClass {
  if (output.includes("Cannot find module") || output.includes("has no exported member")) {
    return "import";
  }
  if (output.includes("error TS")) {
    return "type";
  }
  return "type";
}

function normalizeTypeErrors(output: string): string {
  const errors = output.match(/error TS\d+: .+/g);
  if (errors) {
    const unique = [...new Set(errors)];
    return unique.slice(0, 5).join("\n");
  }
  return output.slice(0, 500);
}

// ─── Test Error Classification ───────────────────────────────────────────────

function classifyTestError(output: string): FailureClass {
  const lower = output.toLowerCase();
  if (lower.includes("is not a function") || lower.includes("is not defined")) {
    return "import";
  }
  if (lower.includes("async") || lower.includes("promise") || lower.includes("timeout")) {
    return "async";
  }
  if (lower.includes("expected") && lower.includes("received")) {
    return "test";
  }
  if (lower.includes("cannot find module")) {
    return "import";
  }
  return "test";
}

function normalizeTestErrors(output: string): string {
  // Extract Jest failure summaries
  const failures = output.match(/● .+/g);
  if (failures) {
    return failures.slice(0, 5).join("\n");
  }

  // Extract assertion errors
  const assertions = output.match(/expect\(.*\)\.to.*/g);
  if (assertions) {
    return assertions.slice(0, 5).join("\n");
  }

  return output.slice(0, 500);
}

// ─── Lint Error Classification ───────────────────────────────────────────────

function normalizeLintErrors(output: string): string {
  const errors = output.match(/\d+ error/g);
  const warnings = output.match(/\d+ warning/g);
  const parts: string[] = [];
  if (errors) parts.push(errors.join(", "));
  if (warnings) parts.push(warnings.join(", "));
  return parts.length > 0 ? parts.join("; ") : output.slice(0, 500);
}

// ─── Generic Classification ──────────────────────────────────────────────────

function classifyGeneric(output: string): FailureClass {
  const lower = output.toLowerCase();
  if (lower.includes("error ts")) return "type";
  if (lower.includes("test") && (lower.includes("fail") || lower.includes("expect"))) return "test";
  if (lower.includes("lint") || lower.includes("eslint")) return "lint";
  if (lower.includes("build") && lower.includes("fail")) return "build";
  if (lower.includes("cannot find module") || lower.includes("no exported member")) return "import";
  if (lower.includes("async") || lower.includes("promise")) return "async";
  if (lower.includes("schema") || lower.includes("migration")) return "schema";
  if (lower.includes("auth") || lower.includes("permission") || lower.includes("unauthorized")) return "auth";
  if (lower.includes("contract") || lower.includes("interface mismatch")) return "contract";
  return "unknown";
}
