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
export declare function classifyFailure(checkName: string, rawOutput: string): ClassificationResult;
//# sourceMappingURL=failure-classifier.d.ts.map