/**
 * AES Verification Runner
 *
 * Wraps the MCP testrunner to provide structured verification results.
 * Routes checks to run_quality_pipeline (built-in) or run_single_check (custom).
 *
 * Does NOT call MCP directly — accepts a runner adapter for testability.
 */

import { generateArtifactId } from "../registry/id-generator";
import { classifyFailure } from "./failure-classifier";
import type {
  CheckSpec,
  CheckResult,
  VerificationResult,
  VerificationRetryContext,
  BuiltInCheck,
} from "./verification-types";

// ─── Runner Adapter (injectable for testing) ─────────────────────────────────

export interface QualityPipelineResult {
  check: string;
  passed: boolean;
  output: string;
  duration_ms?: number;
}

export interface SingleCheckResult {
  checkName: string;
  passed: boolean;
  output: string;
  duration_ms?: number;
}

/**
 * Adapter interface for the test runner.
 * In production, this calls mcp__testrunner-mcp.
 * In tests, this is a mock.
 */
export interface TestRunnerAdapter {
  runQualityPipeline(
    projectDir: string,
    checks: BuiltInCheck[],
  ): Promise<QualityPipelineResult[]>;

  runSingleCheck(
    projectDir: string,
    command: string,
    checkName: string,
  ): Promise<SingleCheckResult>;
}

// ─── Verification Runner ─────────────────────────────────────────────────────

export class VerificationRunner {
  constructor(
    private readonly runner: TestRunnerAdapter,
  ) {}

  /**
   * Run a set of checks against a project directory.
   * Returns structured results with failure classification.
   */
  async runChecks(
    buildId: string,
    projectDir: string,
    checks: CheckSpec[],
    pass: "pass_1" | "pass_2" | "final",
  ): Promise<VerificationResult> {
    const verificationId = generateArtifactId("verification");
    const startedAt = new Date().toISOString();
    const startTime = Date.now();

    // Separate built-in and custom checks
    const builtinChecks = checks.filter((c): c is Extract<CheckSpec, { type: "builtin" }> => c.type === "builtin");
    const customChecks = checks.filter((c): c is Extract<CheckSpec, { type: "single" }> => c.type === "single");

    const results: CheckResult[] = [];

    // Run built-in checks via quality pipeline
    if (builtinChecks.length > 0) {
      const builtinNames = builtinChecks.map(c => c.check);
      const pipelineResults = await this.runner.runQualityPipeline(projectDir, builtinNames);

      for (const pr of pipelineResults) {
        const checkStart = Date.now();
        const result: CheckResult = {
          name: pr.check,
          passed: pr.passed,
          raw_output: pr.output,
          duration_ms: pr.duration_ms ?? (Date.now() - checkStart),
        };

        if (!pr.passed) {
          const classification = classifyFailure(pr.check, pr.output);
          result.normalized_error_summary = classification.normalized_error_summary;
          result.failure_class = classification.failure_class;
          result.failing_files = classification.failing_files;
          result.failing_symbols = classification.failing_symbols;
        }

        results.push(result);
      }
    }

    // Run custom checks via single check
    for (const custom of customChecks) {
      const singleResult = await this.runner.runSingleCheck(
        projectDir,
        custom.command,
        custom.checkName,
      );

      const result: CheckResult = {
        name: singleResult.checkName,
        passed: singleResult.passed,
        raw_output: singleResult.output,
        duration_ms: singleResult.duration_ms ?? 0,
      };

      if (!singleResult.passed) {
        const classification = classifyFailure(singleResult.checkName, singleResult.output);
        result.normalized_error_summary = classification.normalized_error_summary;
        result.failure_class = classification.failure_class;
        result.failing_files = classification.failing_files;
        result.failing_symbols = classification.failing_symbols;
      }

      results.push(result);
    }

    const completedAt = new Date().toISOString();
    const overallPass = results.every(r => r.passed);

    return {
      verification_id: verificationId,
      build_id: buildId,
      pass,
      overall_pass: overallPass,
      checks: results,
      started_at: startedAt,
      completed_at: completedAt,
      total_duration_ms: Date.now() - startTime,
    };
  }

  /**
   * Convert a failed verification result into retry context
   * for the retry brief generator.
   */
  static toRetryContext(
    result: VerificationResult,
    attemptNumber: number,
  ): VerificationRetryContext {
    const failedChecks = result.checks.filter(c => !c.passed);

    const allFailingFiles: string[] = [];
    const allFailingSymbols: string[] = [];
    const allClasses: Set<string> = new Set();

    for (const check of failedChecks) {
      if (check.failing_files) {
        for (const f of check.failing_files) {
          if (!allFailingFiles.includes(f)) allFailingFiles.push(f);
        }
      }
      if (check.failing_symbols) {
        for (const s of check.failing_symbols) {
          if (!allFailingSymbols.includes(s)) allFailingSymbols.push(s);
        }
      }
      if (check.failure_class) allClasses.add(check.failure_class);
    }

    const errorSummaries = failedChecks
      .map(c => c.normalized_error_summary || c.raw_output.slice(0, 200))
      .join("\n---\n");

    const rawExcerpt = failedChecks
      .map(c => c.raw_output.slice(0, 300))
      .join("\n---\n")
      .slice(0, 1000);

    return {
      attempt_number: attemptNumber,
      failed_pass: result.pass,
      failed_check_names: failedChecks.map(c => c.name),
      failure_classes: Array.from(allClasses) as any[],
      normalized_error_summary: errorSummaries,
      raw_output_excerpt: rawExcerpt,
      failing_files: allFailingFiles,
      failing_symbols: allFailingSymbols,
    };
  }
}
