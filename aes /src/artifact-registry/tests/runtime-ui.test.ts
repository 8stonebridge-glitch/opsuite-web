import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  AesPlatformRuntime,
  type BuilderLaunchConfig,
  InMemoryTruthAdapter,
  OperatorHttpServer,
  createLocalPlatformRuntime,
} from "../src";

function makeTruthAdapter(): InMemoryTruthAdapter {
  return new InMemoryTruthAdapter(
    [
      {
        node_id: "NODE-RUN-001",
        label: "FeatureSpec",
        properties: { feature_id: "FEAT-RUN-001", name: "runtime" },
      },
    ],
    [],
    {
      "FEAT-RUN-001": {
        node_ids: ["NODE-RUN-001"],
        edge_ids: [],
        critical_domain_nodes: ["NODE-RUN-001"],
      },
    }
  );
}

function makeProgramTruthAdapter(): InMemoryTruthAdapter {
  return new InMemoryTruthAdapter(
    [
      {
        node_id: "NODE-PROGRAM-001",
        label: "FeatureSpec",
        properties: { feature_id: "FEAT-PROGRAM-001", name: "platform" },
      },
      {
        node_id: "NODE-PROGRAM-002",
        label: "FeatureSpec",
        properties: { feature_id: "FEAT-PROGRAM-002", name: "notifications" },
      },
    ],
    [],
    {
      "FEAT-PROGRAM-001": {
        node_ids: ["NODE-PROGRAM-001"],
        edge_ids: [],
        critical_domain_nodes: ["NODE-PROGRAM-001"],
      },
      "FEAT-PROGRAM-002": {
        node_ids: ["NODE-PROGRAM-002"],
        edge_ids: [],
        critical_domain_nodes: ["NODE-PROGRAM-002"],
      },
    }
  );
}

function makeDonorTruthAdapter(): InMemoryTruthAdapter {
  return new InMemoryTruthAdapter(
    [
      {
        node_id: "NODE-DONOR-RUN-001",
        label: "FeatureSpec",
        properties: { feature_id: "FEAT-RUN-DONOR-001", name: "operator" },
      },
      {
        node_id: "NODE-DONOR-RUN-002",
        label: "FeatureType",
        properties: {
          id: "backend_platform",
          feature_class: "backend_platform",
          promotion_stage: "CANONICAL",
        },
      },
      {
        node_id: "NODE-DONOR-RUN-003",
        label: "PatternLibraryEntry",
        properties: {
          id: "pattern-stripe-operator-shell",
          pattern_name: "Stripe Operator Shell",
          summary: "Separates operator modules and keeps mode visible.",
          status: "accepted",
          anti_patterns: ["do not hide mode or environment in operator contexts"],
          source_donors: ["Stripe Dashboard"],
          promotion_stage: "CANONICAL",
          enforceable: false,
        },
      },
      {
        node_id: "NODE-DONOR-RUN-004",
        label: "ValidatorBundle",
        properties: {
          id: "bundle-operator-shell",
          bundle_name: "Operator Shell Bundle",
          blocking_validators: ["stripe-validator-001", "stripe-validator-004"],
          advisory_validators: [],
          promotion_stage: "CANONICAL",
          enforceable: true,
        },
      },
      {
        node_id: "NODE-DONOR-RUN-005",
        label: "BridgePreset",
        properties: {
          id: "preset-operator-console",
          preset_name: "Operator Console Preset",
          required_outcomes: [
            "operator shell separates financial or system domains from logs and diagnostics",
            "environment mode is explicit",
          ],
          forbidden_shortcuts: ["production/test ambiguity"],
          required_validators: ["bundle-operator-shell"],
          approved_surface_scope: ["dashboards", "logs", "health views"],
          promotion_stage: "CANONICAL",
          enforceable: true,
        },
      },
      {
        node_id: "NODE-DONOR-RUN-006",
        label: "ScenarioPack",
        properties: {
          id: "scenario-operator-log-triage",
          scenario_name: "Operator Log Triage",
          setup_conditions: ["logs visible", "filters available"],
          expected_states: ["mode visible", "filters visible"],
          expected_actions: ["filter by date", "filter by status"],
          expected_validators: ["stripe-validator-001", "stripe-validator-004"],
          derived_from_donors: ["Stripe Dashboard"],
          promotion_stage: "CANONICAL",
          enforceable: true,
        },
      },
    ],
    [
      {
        edge_id: "EDGE-DONOR-RUN-001",
        from_node_id: "NODE-DONOR-RUN-001",
        to_node_id: "NODE-DONOR-RUN-002",
        relationship: "USES_FEATURE_TYPE",
        properties: {},
      },
      {
        edge_id: "EDGE-DONOR-RUN-002",
        from_node_id: "NODE-DONOR-RUN-003",
        to_node_id: "NODE-DONOR-RUN-004",
        relationship: "REQUIRES_VALIDATOR_BUNDLE",
        properties: {},
      },
      {
        edge_id: "EDGE-DONOR-RUN-003",
        from_node_id: "NODE-DONOR-RUN-003",
        to_node_id: "NODE-DONOR-RUN-005",
        relationship: "FEEDS_BRIDGE_PRESET",
        properties: {},
      },
      {
        edge_id: "EDGE-DONOR-RUN-004",
        from_node_id: "NODE-DONOR-RUN-003",
        to_node_id: "NODE-DONOR-RUN-006",
        relationship: "HAS_SCENARIO_PACK",
        properties: {},
      },
      {
        edge_id: "EDGE-DONOR-RUN-005",
        from_node_id: "NODE-DONOR-RUN-005",
        to_node_id: "NODE-DONOR-RUN-002",
        relationship: "APPLIES_TO_FEATURE",
        properties: {},
      },
      {
        edge_id: "EDGE-DONOR-RUN-006",
        from_node_id: "NODE-DONOR-RUN-004",
        to_node_id: "NODE-DONOR-RUN-002",
        relationship: "VALIDATES_FEATURE",
        properties: {},
      },
      {
        edge_id: "EDGE-DONOR-RUN-007",
        from_node_id: "NODE-DONOR-RUN-006",
        to_node_id: "NODE-DONOR-RUN-002",
        relationship: "TESTS_FEATURE",
        properties: {},
      },
    ],
    {
      "FEAT-RUN-DONOR-001": {
        node_ids: [
          "NODE-DONOR-RUN-001",
          "NODE-DONOR-RUN-002",
          "NODE-DONOR-RUN-003",
          "NODE-DONOR-RUN-004",
          "NODE-DONOR-RUN-005",
          "NODE-DONOR-RUN-006",
        ],
        edge_ids: [
          "EDGE-DONOR-RUN-001",
          "EDGE-DONOR-RUN-002",
          "EDGE-DONOR-RUN-003",
          "EDGE-DONOR-RUN-004",
          "EDGE-DONOR-RUN-005",
          "EDGE-DONOR-RUN-006",
          "EDGE-DONOR-RUN-007",
        ],
        critical_domain_nodes: ["NODE-DONOR-RUN-001"],
      },
    }
  );
}

function makeFrontendDonorTruthAdapter(): InMemoryTruthAdapter {
  return new InMemoryTruthAdapter(
    [
      {
        node_id: "NODE-FRONTEND-RUN-001",
        label: "FeatureSpec",
        properties: { feature_id: "FEAT-RUN-FRONTEND-001", name: "notifications" },
      },
      {
        node_id: "NODE-FRONTEND-RUN-002",
        label: "FeatureType",
        properties: {
          id: "notification_system",
          feature_class: "notification_system",
          promotion_stage: "CANONICAL",
        },
      },
      {
        node_id: "NODE-FRONTEND-RUN-003",
        label: "PatternLibraryEntry",
        properties: {
          id: "pattern-github-notification-triage",
          pattern_name: "GitHub Notification Triage",
          summary: "Keeps notifications reason-aware and triageable.",
          status: "accepted",
          anti_patterns: [
            "do not deliver notifications without an explicit reason",
          ],
          source_donors: ["GitHub"],
          promotion_stage: "CANONICAL",
          enforceable: false,
        },
      },
      {
        node_id: "NODE-FRONTEND-RUN-004",
        label: "ValidatorBundle",
        properties: {
          id: "bundle-notification-triage",
          bundle_name: "Notification Triage Bundle",
          blocking_validators: ["github-validator-001", "slack-validator-004"],
          advisory_validators: [],
          promotion_stage: "CANONICAL",
          enforceable: true,
        },
      },
      {
        node_id: "NODE-FRONTEND-RUN-005",
        label: "BridgePreset",
        properties: {
          id: "preset-notification-inbox",
          preset_name: "Notification Inbox Preset",
          required_outcomes: [
            "notifications expose cause and reason",
            "triage actions remain visible in inbox or activity surfaces",
          ],
          forbidden_shortcuts: ["alerts detached from source work object"],
          required_validators: ["bundle-notification-triage"],
          approved_surface_scope: ["inbox", "activity", "notification settings"],
          promotion_stage: "CANONICAL",
          enforceable: true,
        },
      },
      {
        node_id: "NODE-FRONTEND-RUN-006",
        label: "ScenarioPack",
        properties: {
          id: "scenario-quiet-inbox",
          scenario_name: "Quiet Inbox",
          setup_conditions: ["no unread notifications", "inbox surface reachable"],
          expected_states: ["caught-up state visible", "filters remain visible"],
          expected_actions: ["toggle unread filter", "navigate back to source work"],
          expected_validators: ["slack-validator-002", "slack-validator-004"],
          derived_from_donors: ["Slack", "Linear"],
          promotion_stage: "CANONICAL",
          enforceable: true,
        },
      },
    ],
    [
      {
        edge_id: "EDGE-FRONTEND-RUN-001",
        from_node_id: "NODE-FRONTEND-RUN-001",
        to_node_id: "NODE-FRONTEND-RUN-002",
        relationship: "USES_FEATURE_TYPE",
        properties: {},
      },
      {
        edge_id: "EDGE-FRONTEND-RUN-002",
        from_node_id: "NODE-FRONTEND-RUN-003",
        to_node_id: "NODE-FRONTEND-RUN-004",
        relationship: "REQUIRES_VALIDATOR_BUNDLE",
        properties: {},
      },
      {
        edge_id: "EDGE-FRONTEND-RUN-003",
        from_node_id: "NODE-FRONTEND-RUN-003",
        to_node_id: "NODE-FRONTEND-RUN-005",
        relationship: "FEEDS_BRIDGE_PRESET",
        properties: {},
      },
      {
        edge_id: "EDGE-FRONTEND-RUN-004",
        from_node_id: "NODE-FRONTEND-RUN-003",
        to_node_id: "NODE-FRONTEND-RUN-006",
        relationship: "HAS_SCENARIO_PACK",
        properties: {},
      },
      {
        edge_id: "EDGE-FRONTEND-RUN-005",
        from_node_id: "NODE-FRONTEND-RUN-005",
        to_node_id: "NODE-FRONTEND-RUN-002",
        relationship: "APPLIES_TO_FEATURE",
        properties: {},
      },
      {
        edge_id: "EDGE-FRONTEND-RUN-006",
        from_node_id: "NODE-FRONTEND-RUN-004",
        to_node_id: "NODE-FRONTEND-RUN-002",
        relationship: "VALIDATES_FEATURE",
        properties: {},
      },
      {
        edge_id: "EDGE-FRONTEND-RUN-007",
        from_node_id: "NODE-FRONTEND-RUN-006",
        to_node_id: "NODE-FRONTEND-RUN-002",
        relationship: "TESTS_FEATURE",
        properties: {},
      },
    ],
    {
      "FEAT-RUN-FRONTEND-001": {
        node_ids: [
          "NODE-FRONTEND-RUN-001",
          "NODE-FRONTEND-RUN-002",
          "NODE-FRONTEND-RUN-003",
          "NODE-FRONTEND-RUN-004",
          "NODE-FRONTEND-RUN-005",
          "NODE-FRONTEND-RUN-006",
        ],
        edge_ids: [
          "EDGE-FRONTEND-RUN-001",
          "EDGE-FRONTEND-RUN-002",
          "EDGE-FRONTEND-RUN-003",
          "EDGE-FRONTEND-RUN-004",
          "EDGE-FRONTEND-RUN-005",
          "EDGE-FRONTEND-RUN-006",
          "EDGE-FRONTEND-RUN-007",
        ],
        critical_domain_nodes: ["NODE-FRONTEND-RUN-001"],
      },
    }
  );
}

async function makeRuntime(): Promise<{
  runtime: AesPlatformRuntime;
  artifactStoreRoot: string;
}> {
  const artifactStoreRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "aes-runtime-")
  );

  return {
    artifactStoreRoot,
    runtime: createLocalPlatformRuntime({
      truth_adapter: makeTruthAdapter(),
      artifact_store_root_dir: artifactStoreRoot,
    }),
  };
}

function makeBuilderConfig(args: string[]): BuilderLaunchConfig {
  return {
    command: process.execPath,
    args,
    cwd: process.cwd(),
    prompt_preamble: null,
  };
}

describe("runtime and UI", () => {
  test("AesPlatformRuntime executes the happy path through validators and write-back", async () => {
    const { runtime } = await makeRuntime();
    const prepared = await runtime.prepareBuild({
      submit_request: {
        feature_id: "FEAT-RUN-001",
        intent: "Implement runtime happy path",
        requested_by: "tester",
      },
      scope: { paths: ["src/runtime/**"] },
      read_scope: { paths: ["src/runtime/**"] },
      write_scope: { paths: ["src/runtime/**"] },
      acceptance_criteria: [
        {
          id: "AC-1",
          description: "Runtime path is covered",
          type: "functional",
          mandatory: true,
        },
      ],
      test_cases: [
        {
          id: "TC-1",
          description: "Runtime smoke test",
          type: "integration",
          linked_criterion_id: "AC-1",
          mandatory: true,
        },
      ],
      confidence_breakdown: {
        graph_coverage: 0.95,
        pattern_strength: 0.9,
        rule_consistency: 0.92,
        evidence_level: 0.9,
      },
    });

    expect(prepared.authorization.allowed).toBe(true);
    const started = await runtime.startBuilderExecution({
      build_id: prepared.build_record.payload.build_id,
      cwd: process.cwd(),
      command: process.execPath,
      args: ["-e", "console.log('builder finished')"],
    });
    const completedSession = await runtime.waitForBuilderSession(
      started.session.session_id,
      5000
    );
    const diffCapture = await runtime.recordBuilderArtifacts({
      build_id: prepared.build_record.payload.build_id,
      changed_files: [
        {
          path: "src/runtime/platform-runtime.ts",
          change_type: "modified",
          lines_added: 10,
          lines_removed: 2,
        },
      ],
      diff_text: "diff --git a/src/runtime/platform-runtime.ts b/src/runtime/platform-runtime.ts",
    });
    const testRun = await runtime.recordTestRun({
      build_id: prepared.build_record.payload.build_id,
      status: "PASS",
      test_cases_run: 4,
      passed: 4,
      failed: 0,
      skipped: 0,
      output_text: "all tests passed",
    });
    const validation = await runtime.runValidators(
      prepared.build_record.payload.build_id
    );

    expect(completedSession.status).toBe("EXITED");
    expect(diffCapture.hard_failure).toBe(false);
    expect(diffCapture.diff_record.payload.blob_ref).toContain("builder-diffs");
    expect(testRun.payload.blob_ref).toContain("test-runs");
    expect(validation.finalization.state).toBe("FINALIZED");
    if (validation.finalization.state === "FINALIZED") {
      expect(validation.finalization.write_back_record.payload.write_back_status).toBe(
        "VERIFIED"
      );
    }
    expect(validation.metric_records.length).toBeGreaterThan(0);
  });

  test("abortBuilderExecution terminates a running builder and appends FAILED build state", async () => {
    const { runtime } = await makeRuntime();
    const prepared = await runtime.prepareBuild({
      submit_request: {
        feature_id: "FEAT-RUN-001",
        intent: "Abort builder execution smoke",
        requested_by: "tester",
      },
      scope: { paths: ["src/runtime/**"] },
      read_scope: { paths: ["src/runtime/**"] },
      write_scope: { paths: ["src/runtime/**"] },
      acceptance_criteria: [
        {
          id: "AC-ABORT-1",
          description: "Abort path stays consistent",
          type: "functional",
          mandatory: true,
        },
      ],
      test_cases: [
        {
          id: "TC-ABORT-1",
          description: "Abort path smoke test",
          type: "integration",
          linked_criterion_id: "AC-ABORT-1",
          mandatory: true,
        },
      ],
      confidence_breakdown: {
        graph_coverage: 0.95,
        pattern_strength: 0.9,
        rule_consistency: 0.92,
        evidence_level: 0.9,
      },
    });

    const started = await runtime.startBuilderExecution({
      build_id: prepared.build_record.payload.build_id,
      cwd: process.cwd(),
      command: process.execPath,
      args: ["-e", "setTimeout(() => undefined, 10000)"],
    });
    const aborted = await runtime.abortBuilderExecution(
      prepared.build_record.payload.build_id
    );

    expect(started.build_record.payload.status).toBe("RUNNING");
    expect(aborted.session?.status).toBe("TERMINATED");
    expect(aborted.build_record.payload.status).toBe("FAILED");
    expect(aborted.build_record.payload.builder_session_id).toBe(
      started.session.session_id
    );
  });

  test("prepareBuild derives bridge rules from promoted donor graph assets", async () => {
    const artifactStoreRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "aes-runtime-donor-")
    );
    const runtime = createLocalPlatformRuntime({
      truth_adapter: makeDonorTruthAdapter(),
      artifact_store_root_dir: artifactStoreRoot,
    });

    const prepared = await runtime.prepareBuild({
      submit_request: {
        feature_id: "FEAT-RUN-DONOR-001",
        intent: "Use donor-backed operator rules",
        requested_by: "tester",
      },
      scope: { paths: ["src/ui/**"] },
      read_scope: { paths: ["src/ui/**"] },
      write_scope: { paths: ["src/ui/**"] },
      confidence_breakdown: {
        graph_coverage: 0.95,
        pattern_strength: 0.9,
        rule_consistency: 0.92,
        evidence_level: 0.9,
      },
    });

    const bridge = prepared.validated_bridge_record.payload;
    const donorPayload = bridge.data_model[
      "donor_execution_payload"
    ] as Record<string, unknown>;

    expect(bridge.patterns).toContain("pattern-stripe-operator-shell");
    expect(bridge.constraints).toContain(
      "Use bridge preset preset-operator-console (Operator Console Preset)."
    );
    expect(bridge.anti_patterns).toContain("production/test ambiguity");
    expect(
      bridge.acceptance_criteria.some((criterion) =>
        criterion.description.includes("environment mode is explicit")
      )
    ).toBe(true);
    expect(
      bridge.test_cases.some((testCase) =>
        testCase.description.includes("filter by date")
      )
    ).toBe(true);
    expect(donorPayload["feature_class"]).toBe("backend_platform");
    expect(donorPayload["bridge_preset_id"]).toBe("preset-operator-console");
  });

  test("prepareBuild derives frontend bridge rules from promoted donor graph assets", async () => {
    const artifactStoreRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "aes-runtime-frontend-donor-")
    );
    const runtime = createLocalPlatformRuntime({
      truth_adapter: makeFrontendDonorTruthAdapter(),
      artifact_store_root_dir: artifactStoreRoot,
    });

    const prepared = await runtime.prepareBuild({
      submit_request: {
        feature_id: "FEAT-RUN-FRONTEND-001",
        intent: "Use donor-backed frontend rules",
        requested_by: "tester",
      },
      scope: { paths: ["src/ui/**"] },
      read_scope: { paths: ["src/ui/**"] },
      write_scope: { paths: ["src/ui/**"] },
      confidence_breakdown: {
        graph_coverage: 0.95,
        pattern_strength: 0.9,
        rule_consistency: 0.92,
        evidence_level: 0.9,
      },
    });

    const bridge = prepared.validated_bridge_record.payload;
    const donorPayload = bridge.data_model[
      "donor_execution_payload"
    ] as Record<string, unknown>;

    expect(bridge.patterns).toContain("pattern-github-notification-triage");
    expect(bridge.constraints).toContain(
      "Use bridge preset preset-notification-inbox (Notification Inbox Preset)."
    );
    expect(bridge.anti_patterns).toContain(
      "alerts detached from source work object"
    );
    expect(
      bridge.test_cases.some((testCase) =>
        testCase.description.includes("toggle unread filter")
      )
    ).toBe(true);
    expect(donorPayload["feature_class"]).toBe("notification_system");
    expect(donorPayload["bridge_preset_id"]).toBe("preset-notification-inbox");
  });

  test("OperatorHttpServer exposes workflow endpoints for prepare, run, record, and validate", async () => {
    const { runtime } = await makeRuntime();
    const server = new OperatorHttpServer(runtime, {
      builder: makeBuilderConfig([
        "-e",
        "console.log(`builder finished ${process.env.AES_BUILD_ID}`)",
      ]),
    });
    const started = await server.start();

    try {
      const prepareResponse = await fetch(`${started.url}/api/builds/prepare`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          submit_request: {
            feature_id: "FEAT-RUN-001",
            intent: "Drive the operator workflow routes",
            requested_by: "tester",
          },
          scope: { paths: ["src/runtime/**"] },
          read_scope: { paths: ["src/runtime/**"] },
          write_scope: { paths: ["src/runtime/**"] },
          acceptance_criteria: [
            {
              id: "AC-HTTP-1",
              description: "HTTP workflow route is covered",
              type: "functional",
              mandatory: true,
            },
          ],
          test_cases: [
            {
              id: "TC-HTTP-1",
              description: "HTTP workflow smoke test",
              type: "integration",
              linked_criterion_id: "AC-HTTP-1",
              mandatory: true,
            },
          ],
          confidence_breakdown: {
            graph_coverage: 0.95,
            pattern_strength: 0.9,
            rule_consistency: 0.92,
            evidence_level: 0.9,
          },
        }),
      });
      const prepared = (await prepareResponse.json()) as {
        authorization: { allowed: boolean };
        build_record: { payload: { build_id: string } };
      };
      const buildId = prepared.build_record.payload.build_id;

      const runResponse = await fetch(
        `${started.url}/api/builds/${buildId}/run-builder`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            wait_for_completion: true,
            timeout_ms: 5000,
          }),
        }
      );
      const run = (await runResponse.json()) as {
        completed: { status: string } | null;
        timed_out: boolean;
      };

      const diffResponse = await fetch(
        `${started.url}/api/builds/${buildId}/record-diff`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            changed_files: [
              {
                path: "src/runtime/platform-runtime.ts",
                change_type: "modified",
                lines_added: 6,
                lines_removed: 1,
              },
            ],
            diff_text:
              "diff --git a/src/runtime/platform-runtime.ts b/src/runtime/platform-runtime.ts",
          }),
        }
      );
      const diff = (await diffResponse.json()) as {
        capture: {
          hard_failure: boolean;
          diff_record: {
            payload: {
              blob_ref: string | null;
            };
          };
        };
      };

      const testRunResponse = await fetch(
        `${started.url}/api/builds/${buildId}/record-test-run`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            status: "PASS",
            test_cases_run: 2,
            passed: 2,
            failed: 0,
            skipped: 0,
            output_text: "operator workflow tests passed",
          }),
        }
      );
      const testRun = (await testRunResponse.json()) as {
        test_run: {
          payload: {
            blob_ref: string | null;
          };
        };
      };

      const validatorsResponse = await fetch(
        `${started.url}/api/builds/${buildId}/run-validators`,
        {
          method: "POST",
        }
      );
      const validation = (await validatorsResponse.json()) as {
        validation: {
          finalization: { state: string };
          metric_records: Array<unknown>;
        };
      };

      expect(prepareResponse.status).toBe(201);
      expect(prepared.authorization.allowed).toBe(true);
      expect(runResponse.status).toBe(200);
      expect(run.timed_out).toBe(false);
      expect(run.completed?.status).toBe("EXITED");
      expect(diffResponse.status).toBe(200);
      expect(diff.capture.hard_failure).toBe(false);
      expect(diff.capture.diff_record.payload.blob_ref).toContain("builder-diffs");
      expect(testRunResponse.status).toBe(200);
      expect(testRun.test_run.payload.blob_ref).toContain("test-runs");
      expect(validatorsResponse.status).toBe(200);
      expect(validation.validation.finalization.state).toBe("FINALIZED");
      expect(validation.validation.metric_records.length).toBeGreaterThan(0);
    } finally {
      await server.stop();
    }
  });

  test("OperatorHttpServer abort-builder endpoint terminates an asynchronous builder run", async () => {
    const { runtime } = await makeRuntime();
    const server = new OperatorHttpServer(runtime, {
      builder: makeBuilderConfig(["-e", "setTimeout(() => undefined, 10000)"]),
    });
    const started = await server.start();

    try {
      const prepareResponse = await fetch(`${started.url}/api/builds/prepare`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          submit_request: {
            feature_id: "FEAT-RUN-001",
            intent: "Abort operator workflow route",
            requested_by: "tester",
          },
          scope: { paths: ["src/runtime/**"] },
          read_scope: { paths: ["src/runtime/**"] },
          write_scope: { paths: ["src/runtime/**"] },
          acceptance_criteria: [
            {
              id: "AC-HTTP-ABORT-1",
              description: "Abort endpoint is covered",
              type: "functional",
              mandatory: true,
            },
          ],
          test_cases: [
            {
              id: "TC-HTTP-ABORT-1",
              description: "Abort endpoint smoke test",
              type: "integration",
              linked_criterion_id: "AC-HTTP-ABORT-1",
              mandatory: true,
            },
          ],
          confidence_breakdown: {
            graph_coverage: 0.95,
            pattern_strength: 0.9,
            rule_consistency: 0.92,
            evidence_level: 0.9,
          },
        }),
      });
      const prepared = (await prepareResponse.json()) as {
        build_record: { payload: { build_id: string } };
      };
      const buildId = prepared.build_record.payload.build_id;

      const runResponse = await fetch(
        `${started.url}/api/builds/${buildId}/run-builder`,
        {
          method: "POST",
        }
      );
      const run = (await runResponse.json()) as {
        started: {
          build_record: {
            payload: {
              status: string;
            };
          };
        };
        completed: null;
      };

      const abortResponse = await fetch(
        `${started.url}/api/builds/${buildId}/abort-builder`,
        {
          method: "POST",
        }
      );
      const aborted = (await abortResponse.json()) as {
        aborted: {
          session: { status: string } | null;
          build_record: {
            payload: {
              status: string;
            };
          };
        };
      };

      expect(runResponse.status).toBe(202);
      expect(run.started.build_record.payload.status).toBe("RUNNING");
      expect(run.completed).toBeNull();
      expect(abortResponse.status).toBe(200);
      expect(aborted.aborted.session?.status).toBe("TERMINATED");
      expect(aborted.aborted.build_record.payload.status).toBe("FAILED");
    } finally {
      await server.stop();
    }
  });

  test("OperatorHttpServer runs a multi-feature build program in dependency order", async () => {
    const artifactStoreRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "aes-runtime-program-")
    );
    const runtime = createLocalPlatformRuntime({
      truth_adapter: makeProgramTruthAdapter(),
      artifact_store_root_dir: artifactStoreRoot,
    });
    const server = new OperatorHttpServer(runtime, {
      builder: makeBuilderConfig(["-e", "console.log('builder finished')"]),
    });
    const started = await server.start();

    try {
      const response = await fetch(`${started.url}/api/build-programs/run`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          app_id: "APP-AES-TEST",
          requested_by: "tester",
          features: [
            {
              feature_id: "FEAT-PROGRAM-001",
              intent: "Build the platform layer",
              prepare: {
                scope: { paths: ["src/runtime/**"] },
                read_scope: { paths: ["src/runtime/**"] },
                write_scope: { paths: ["src/runtime/**"] },
                acceptance_criteria: [
                  {
                    id: "AC-PROGRAM-1",
                    description: "Platform layer is prepared",
                    type: "functional",
                    mandatory: true,
                  },
                ],
                test_cases: [
                  {
                    id: "TC-PROGRAM-1",
                    description: "Platform smoke test",
                    type: "integration",
                    linked_criterion_id: "AC-PROGRAM-1",
                    mandatory: true,
                  },
                ],
                confidence_breakdown: {
                  graph_coverage: 0.95,
                  pattern_strength: 0.9,
                  rule_consistency: 0.92,
                  evidence_level: 0.9,
                },
              },
              diff: {
                changed_files: [
                  {
                    path: "src/runtime/platform-runtime.ts",
                    change_type: "modified",
                    lines_added: 5,
                    lines_removed: 1,
                  },
                ],
                diff_text:
                  "diff --git a/src/runtime/platform-runtime.ts b/src/runtime/platform-runtime.ts",
              },
              test_run: {
                status: "PASS",
                test_cases_run: 1,
                passed: 1,
                failed: 0,
                skipped: 0,
                output_text: "platform tests passed",
              },
            },
            {
              feature_id: "FEAT-PROGRAM-002",
              intent: "Build the notifications layer",
              depends_on_feature_ids: ["FEAT-PROGRAM-001"],
              prepare: {
                scope: { paths: ["src/ui/**"] },
                read_scope: { paths: ["src/ui/**"] },
                write_scope: { paths: ["src/ui/**"] },
                acceptance_criteria: [
                  {
                    id: "AC-PROGRAM-2",
                    description: "Notifications layer is prepared",
                    type: "functional",
                    mandatory: true,
                  },
                ],
                test_cases: [
                  {
                    id: "TC-PROGRAM-2",
                    description: "Notifications smoke test",
                    type: "integration",
                    linked_criterion_id: "AC-PROGRAM-2",
                    mandatory: true,
                  },
                ],
                confidence_breakdown: {
                  graph_coverage: 0.95,
                  pattern_strength: 0.9,
                  rule_consistency: 0.92,
                  evidence_level: 0.9,
                },
              },
              diff: {
                changed_files: [
                  {
                    path: "src/ui/operator-http-server.ts",
                    change_type: "modified",
                    lines_added: 8,
                    lines_removed: 2,
                  },
                ],
                diff_text:
                  "diff --git a/src/ui/operator-http-server.ts b/src/ui/operator-http-server.ts",
              },
              test_run: {
                status: "PASS",
                test_cases_run: 1,
                passed: 1,
                failed: 0,
                skipped: 0,
                output_text: "notification tests passed",
              },
            },
          ],
        }),
      });

      const result = (await response.json()) as {
        program_state: string;
        execution_order: string[];
        feature_results: Array<{
          feature_id: string;
          state: string;
          prepare_result: {
            compiled_bridge_record: {
              payload: {
                depends_on_bridge_ids: string[];
              };
            };
          };
        }>;
        pending_features: Array<unknown>;
        summary: {
          passed: number;
          pending: number;
        };
      };

      expect(response.status).toBe(200);
      expect(result.program_state).toBe("PASSED");
      expect(result.execution_order).toEqual([
        "FEAT-PROGRAM-001",
        "FEAT-PROGRAM-002",
      ]);
      expect(result.feature_results).toHaveLength(2);
      expect(result.feature_results[0]?.state).toBe("PASSED");
      expect(result.feature_results[1]?.state).toBe("PASSED");
      expect(
        result.feature_results[1]?.prepare_result.compiled_bridge_record.payload
          .depends_on_bridge_ids.length
      ).toBe(1);
      expect(result.pending_features).toHaveLength(0);
      expect(result.summary.passed).toBe(2);
      expect(result.summary.pending).toBe(0);
    } finally {
      await server.stop();
    }
  });

  test("OperatorHttpServer exposes health, queue, and dashboard routes", async () => {
    const { runtime } = await makeRuntime();
    await runtime.prepareBuild({
      submit_request: {
        feature_id: "FEAT-RUN-001",
        intent: "Create blocked build for operator UI",
        requested_by: "tester",
      },
      scope: { paths: ["src/runtime/**"] },
      read_scope: { paths: ["src/runtime/**"] },
      write_scope: { paths: ["src/runtime/**"] },
      acceptance_criteria: [
        {
          id: "SEC-1",
          description: "Security rule must have a test",
          type: "security",
          mandatory: true,
        },
      ],
      test_cases: [],
      confidence_breakdown: {
        graph_coverage: 0.8,
        pattern_strength: 0.8,
        rule_consistency: 0.8,
        evidence_level: 0.8,
      },
    });

    const server = new OperatorHttpServer(runtime);
    const started = await server.start();

    try {
      const [healthResponse, queueResponse, pageResponse] = await Promise.all([
        fetch(`${started.url}/api/health`),
        fetch(`${started.url}/api/attention-queue`),
        fetch(`${started.url}/`),
      ]);
      const health = (await healthResponse.json()) as { status: string };
      const queue = (await queueResponse.json()) as {
        blocked_builds: Array<{ artifact_id: string }>;
      };
      const page = await pageResponse.text();

      expect(health.status).toBe("ok");
      expect(queue.blocked_builds.length).toBe(1);
      expect(page).toContain("AES Operator Console");
    } finally {
      await server.stop();
    }
  });
});
