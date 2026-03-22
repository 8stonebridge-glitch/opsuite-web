/**
 * AES Verification Layer Tests
 *
 * Tests the full verification pipeline:
 *   - Runner routes checks correctly (built-in vs custom)
 *   - Failure classifier categorizes errors
 *   - Orchestrator handles multi-pass flows
 *   - Two-pass stops on pass 1 failure
 *   - Retry context is structured and actionable
 *   - Promotion gate blocks unverified builds
 */

import { ArtifactRegistry } from "../src/registry/registry";
import { InMemoryStorage } from "../src/registry/storage";
import { VerificationRunner, type TestRunnerAdapter, type QualityPipelineResult, type SingleCheckResult } from "../src/verification/verification-runner";
import { VerificationOrchestrator } from "../src/verification/verification-orchestrator";
import { classifyFailure } from "../src/verification/failure-classifier";
import type { CheckSpec, VerificationPolicy } from "../src/verification/verification-types";

// ─── Mock Runner Adapter ─────────────────────────────────────────────────────

function createMockRunner(overrides?: {
  pipelineResults?: QualityPipelineResult[];
  singleResult?: SingleCheckResult;
}): TestRunnerAdapter {
  return {
    async runQualityPipeline(_projectDir, checks) {
      if (overrides?.pipelineResults) return overrides.pipelineResults;
      return checks.map(check => ({
        check,
        passed: true,
        output: `${check}: all clear`,
        duration_ms: 100,
      }));
    },
    async runSingleCheck(_projectDir, _command, checkName) {
      if (overrides?.singleResult) return overrides.singleResult;
      return {
        checkName,
        passed: true,
        output: `${checkName}: success`,
        duration_ms: 200,
      };
    },
  };
}

function createFailingRunner(failingCheck: string, errorOutput: string): TestRunnerAdapter {
  return {
    async runQualityPipeline(_projectDir, checks) {
      return checks.map(check => ({
        check,
        passed: check !== failingCheck,
        output: check === failingCheck ? errorOutput : `${check}: ok`,
        duration_ms: 100,
      }));
    },
    async runSingleCheck(_projectDir, _command, checkName) {
      return {
        checkName,
        passed: checkName !== failingCheck,
        output: checkName === failingCheck ? errorOutput : `${checkName}: ok`,
        duration_ms: 200,
      };
    },
  };
}

// ─── Failure Classifier ──────────────────────────────────────────────────────

describe("FailureClassifier", () => {
  test("classifies TypeScript errors as type", () => {
    const result = classifyFailure("typecheck", "error TS2304: Cannot find name 'processNext'.");
    expect(result.failure_class).toBe("type");
    expect(result.failing_symbols).toContain("processNext");
  });

  test("classifies import errors", () => {
    const result = classifyFailure("typecheck", "Cannot find module '../src/service' or has no exported member 'createTodo'");
    expect(result.failure_class).toBe("import");
  });

  test("classifies test assertion failures", () => {
    const result = classifyFailure("test", "● Todo CRUD > create a todo\n  Expected: 42\n  Received: undefined");
    expect(result.failure_class).toBe("test");
  });

  test("classifies async errors", () => {
    const result = classifyFailure("test", "TypeError: Cannot read properties of undefined (Reading 'then')\nPromise rejected");
    expect(result.failure_class).toBe("async");
  });

  test("classifies lint errors", () => {
    const result = classifyFailure("lint", "2 errors found\n1 warning");
    expect(result.failure_class).toBe("lint");
  });

  test("extracts failing file paths", () => {
    const result = classifyFailure("typecheck", "src/service.ts:10:5 - error TS2304: Cannot find name 'foo'");
    expect(result.failing_files).toContain("src/service.ts");
  });
});

// ─── Verification Runner ─────────────────────────────────────────────────────

describe("VerificationRunner", () => {
  test("runs built-in checks via quality pipeline", async () => {
    const runner = new VerificationRunner(createMockRunner());
    const checks: CheckSpec[] = [
      { type: "builtin", check: "typecheck" },
      { type: "builtin", check: "test" },
    ];

    const result = await runner.runChecks("BLD-1", "/tmp/project", checks, "pass_1");

    expect(result.overall_pass).toBe(true);
    expect(result.checks.length).toBe(2);
    expect(result.checks[0]!.name).toBe("typecheck");
    expect(result.checks[1]!.name).toBe("test");
  });

  test("runs custom checks via single check", async () => {
    const runner = new VerificationRunner(createMockRunner());
    const checks: CheckSpec[] = [
      { type: "single", command: "npm run build", checkName: "production-build" },
    ];

    const result = await runner.runChecks("BLD-1", "/tmp/project", checks, "final");

    expect(result.overall_pass).toBe(true);
    expect(result.checks[0]!.name).toBe("production-build");
  });

  test("handles mixed built-in and custom checks", async () => {
    const runner = new VerificationRunner(createMockRunner());
    const checks: CheckSpec[] = [
      { type: "builtin", check: "typecheck" },
      { type: "single", command: "npm run build", checkName: "production-build" },
    ];

    const result = await runner.runChecks("BLD-1", "/tmp/project", checks, "final");

    expect(result.overall_pass).toBe(true);
    expect(result.checks.length).toBe(2);
  });

  test("classifies failures in check results", async () => {
    const runner = new VerificationRunner(
      createFailingRunner("typecheck", "error TS2304: Cannot find name 'createTodo'.\nsrc/service.ts:10:5")
    );
    const checks: CheckSpec[] = [{ type: "builtin", check: "typecheck" }];

    const result = await runner.runChecks("BLD-1", "/tmp/project", checks, "pass_1");

    expect(result.overall_pass).toBe(false);
    expect(result.checks[0]!.passed).toBe(false);
    expect(result.checks[0]!.failure_class).toBe("type");
    expect(result.checks[0]!.normalized_error_summary).toContain("TS2304");
    expect(result.checks[0]!.failing_symbols).toContain("createTodo");
  });

  test("generates retry context from failed result", async () => {
    const runner = new VerificationRunner(
      createFailingRunner("test", "● should create todo\n  Expected: true\n  Received: false\nsrc/todo.ts:5")
    );
    const checks: CheckSpec[] = [{ type: "builtin", check: "test" }];
    const result = await runner.runChecks("BLD-1", "/tmp/project", checks, "pass_2");

    const retryCtx = VerificationRunner.toRetryContext(result, 1);

    expect(retryCtx.attempt_number).toBe(1);
    expect(retryCtx.failed_pass).toBe("pass_2");
    expect(retryCtx.failed_check_names).toContain("test");
    expect(retryCtx.failure_classes).toContain("test");
    expect(retryCtx.normalized_error_summary.length).toBeGreaterThan(0);
  });
});

// ─── Verification Orchestrator ───────────────────────────────────────────────

describe("VerificationOrchestrator", () => {
  test("all passes succeed → overall_pass true", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const orchestrator = new VerificationOrchestrator(registry, createMockRunner());

    const result = await orchestrator.verify({
      build_id: "BLD-1",
      bridge_id: "BRG-1",
      feature_id: "FEAT-1",
      project_dir: "/tmp/project",
      strategy: "ONE_PASS",
      risk: "low",
      attempt_number: 1,
    });

    expect(result.overall_pass).toBe(true);
    expect(result.failed_at).toBeNull();
    expect(result.retry_context).toBeNull();
  });

  test("pass 1 typecheck failure → stops immediately for TWO_PASS", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const failRunner = createFailingRunner("typecheck", "error TS2304: Cannot find name 'foo'");
    const orchestrator = new VerificationOrchestrator(registry, failRunner);

    const result = await orchestrator.verify({
      build_id: "BLD-2",
      bridge_id: "BRG-2",
      feature_id: "FEAT-2",
      project_dir: "/tmp/project",
      strategy: "TWO_PASS",
      risk: "high",
      attempt_number: 1,
    });

    expect(result.overall_pass).toBe(false);
    expect(result.failed_at).toBe("pass_1");
    expect(result.should_stop).toBe(true);
    expect(result.retry_context).not.toBeNull();
    expect(result.retry_context!.failed_check_names).toContain("typecheck");
  });

  test("pass 2 test failure → provides retry context but does not stop (default)", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    // Pass typecheck, fail test
    const runner: TestRunnerAdapter = {
      async runQualityPipeline(_dir, checks) {
        return checks.map(c => ({
          check: c,
          passed: c !== "test",
          output: c === "test" ? "● test failed" : "ok",
          duration_ms: 100,
        }));
      },
      async runSingleCheck(_dir, _cmd, name) {
        return { checkName: name, passed: true, output: "ok", duration_ms: 100 };
      },
    };
    const orchestrator = new VerificationOrchestrator(registry, runner);

    const result = await orchestrator.verify({
      build_id: "BLD-3",
      bridge_id: "BRG-3",
      feature_id: "FEAT-3",
      project_dir: "/tmp/project",
      strategy: "TWO_PASS",
      risk: "medium",
      feature_type: "backend_platform",
      attempt_number: 1,
    });

    expect(result.overall_pass).toBe(false);
    expect(result.failed_at).toBe("pass_2");
    expect(result.should_stop).toBe(false);
    expect(result.retry_context).not.toBeNull();
  });

  test("high risk → pass 2 failure stops (high_risk_policy)", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const runner: TestRunnerAdapter = {
      async runQualityPipeline(_dir, checks) {
        return checks.map(c => ({
          check: c,
          passed: c !== "test",
          output: c === "test" ? "test failed" : "ok",
          duration_ms: 100,
        }));
      },
      async runSingleCheck(_dir, _cmd, name) {
        return { checkName: name, passed: true, output: "ok", duration_ms: 100 };
      },
    };
    const orchestrator = new VerificationOrchestrator(registry, runner);

    const result = await orchestrator.verify({
      build_id: "BLD-4",
      bridge_id: "BRG-4",
      feature_id: "FEAT-4",
      project_dir: "/tmp/project",
      strategy: "SKELETON",
      risk: "high",
      attempt_number: 1,
    });

    expect(result.overall_pass).toBe(false);
    expect(result.should_stop).toBe(true);
  });

  test("custom policy overrides defaults", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const orchestrator = new VerificationOrchestrator(registry, createMockRunner());

    const customPolicy: VerificationPolicy = {
      pass_1_checks: [],
      pass_2_checks: [],
      final_checks: [
        { type: "single", command: "npm run build", checkName: "production-build" },
      ],
      stop_on_pass_1_failure: true,
      stop_on_pass_2_failure: false,
    };

    const result = await orchestrator.verify({
      build_id: "BLD-5",
      bridge_id: "BRG-5",
      feature_id: "FEAT-5",
      project_dir: "/tmp/project",
      strategy: "ONE_PASS",
      risk: "low",
      attempt_number: 1,
      custom_policy: customPolicy,
    });

    expect(result.overall_pass).toBe(true);
    expect(result.results.length).toBe(1);
    expect(result.results[0]!.checks[0]!.name).toBe("production-build");
  });

  test("persists verification artifacts", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const orchestrator = new VerificationOrchestrator(registry, createMockRunner());

    const result = await orchestrator.verify({
      build_id: "BLD-6",
      bridge_id: "BRG-6",
      feature_id: "FEAT-6",
      project_dir: "/tmp/project",
      strategy: "TWO_PASS",
      risk: "medium",
      feature_type: "backend_platform",
      attempt_number: 1,
    });

    expect(result.artifact_ids.length).toBeGreaterThan(0);
  });

  test("promotion gate blocks unverified builds", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const orchestrator = new VerificationOrchestrator(registry, createMockRunner());

    const gate = await orchestrator.checkPromotionGate("BLD-NONEXISTENT");
    expect(gate.can_promote).toBe(false);
    expect(gate.reason).toContain("No verification results");
  });

  test("promotion gate passes when final checks pass", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const orchestrator = new VerificationOrchestrator(registry, createMockRunner());

    // Run verification (which persists results)
    await orchestrator.verify({
      build_id: "BLD-7",
      bridge_id: "BRG-7",
      feature_id: "FEAT-7",
      project_dir: "/tmp/project",
      strategy: "ONE_PASS",
      risk: "low",
      attempt_number: 1,
    });

    const gate = await orchestrator.checkPromotionGate("BLD-7");
    expect(gate.can_promote).toBe(true);
  });
});
