import { generateBuildProgram } from "../src/planning/build-program-generator";
import type { AppSpec, FeatureSpec } from "../src/types/app-spec";

function makeApp(overrides: Partial<AppSpec> = {}): AppSpec {
  return {
    app_id: "APP-test",
    name: "Test App",
    summary: "A test app",
    product_type: "saas",
    target_users: [],
    roles: [],
    core_jobs_to_be_done: [],
    global_constraints: [],
    shared_backend_surfaces: [],
    shared_frontend_surfaces: [],
    feature_ids: [],
    open_questions: [],
    evidence_summary: {
      sources: [],
      research_note_ids: [],
      total_evidence_count: 0,
    },
    confidence_summary: {
      decomposition_confidence: 0.8,
      research_coverage: 0.7,
      verification_score: 0.7,
      overall: 0.75,
    },
    promotion_status: "PROMOTED",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeFeature(overrides: Partial<FeatureSpec> = {}): FeatureSpec {
  return {
    feature_id: "FEAT-TEST-001",
    app_id: "APP-test",
    name: "Test Feature",
    description: "A test feature for build program generation",
    feature_type: "workflow",
    donor_mappings: [],
    dependencies: [],
    user_roles: [],
    backend_surfaces: [
      { name: "api/tasks", type: "api_endpoint", description: "Tasks API" },
    ],
    frontend_surfaces: [
      { name: "pages/tasks", type: "page", description: "Tasks page" },
    ],
    auth_requirements: [],
    data_entities: [],
    events: [],
    integrations: [],
    failure_states: [],
    destructive_actions: [],
    acceptance_criteria: [
      {
        id: "AC-1",
        description: "Must create tasks",
        type: "functional",
        mandatory: true,
      },
    ],
    test_cases: [
      {
        id: "TC-1",
        description: "Task creation test",
        type: "integration",
        linked_criterion_id: "AC-1",
        mandatory: true,
      },
    ],
    missing_questions: [],
    evidence_summary: {
      sources: [],
      research_note_ids: [],
      total_evidence_count: 0,
    },
    confidence_summary: {
      decomposition_confidence: 0.8,
      research_coverage: 0.7,
      verification_score: 0.7,
      overall: 0.75,
    },
    promotion_status: "PROMOTED",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("generateBuildProgram", () => {
  it("produces valid BuildProgramInput", () => {
    const result = generateBuildProgram({
      app: makeApp(),
      features: [makeFeature()],
      requested_by: "operator",
    });

    expect(result.app_id).toBe("APP-test");
    expect(result.requested_by).toBe("operator");
    expect(result.features).toHaveLength(1);
  });

  it("maps feature fields to BuildProgramFeatureInput", () => {
    const result = generateBuildProgram({
      app: makeApp(),
      features: [makeFeature()],
      requested_by: "operator",
    });

    const f = result.features[0]!;
    expect(f.feature_id).toBe("FEAT-TEST-001");
    expect(f.intent).toContain("Test Feature");
    expect(f.prepare.scope.paths.length).toBeGreaterThan(0);
    expect(f.prepare.write_scope!.paths.length).toBeGreaterThan(0);
    expect(f.prepare.acceptance_criteria).toHaveLength(1);
    expect(f.prepare.test_cases).toHaveLength(1);
    expect(f.prepare.confidence_breakdown).toBeDefined();
    expect(f.run_validators).toBe(true);
  });

  it("preserves dependency order", () => {
    const result = generateBuildProgram({
      app: makeApp(),
      features: [
        makeFeature({
          feature_id: "FEAT-B",
          dependencies: ["FEAT-A"],
          data_entities: [],
        }),
        makeFeature({
          feature_id: "FEAT-A",
          dependencies: [],
          data_entities: [],
        }),
      ],
      requested_by: "operator",
    });

    const ids = result.features.map((f) => f.feature_id);
    expect(ids.indexOf("FEAT-A")).toBeLessThan(ids.indexOf("FEAT-B"));
  });

  it("maps dependencies to depends_on_feature_ids", () => {
    const result = generateBuildProgram({
      app: makeApp(),
      features: [
        makeFeature({
          feature_id: "FEAT-B",
          dependencies: ["FEAT-A"],
          data_entities: [],
        }),
        makeFeature({
          feature_id: "FEAT-A",
          data_entities: [],
        }),
      ],
      requested_by: "operator",
    });

    const b = result.features.find((f) => f.feature_id === "FEAT-B")!;
    expect(b.depends_on_feature_ids).toEqual(["FEAT-A"]);
  });

  it("maps confidence_summary to ConfidenceBreakdown", () => {
    const result = generateBuildProgram({
      app: makeApp(),
      features: [
        makeFeature({
          confidence_summary: {
            decomposition_confidence: 0.9,
            research_coverage: 0.8,
            verification_score: 0.7,
            overall: 0.85,
          },
        }),
      ],
      requested_by: "operator",
    });

    const cb = result.features[0]!.prepare.confidence_breakdown;
    expect(cb.pattern_strength).toBe(0.9);
    expect(cb.graph_coverage).toBe(0.8);
    expect(cb.rule_consistency).toBe(0.7);
    expect(cb.evidence_level).toBe(0.85);
  });

  it("maps mandatory acceptance criteria to constraints", () => {
    const result = generateBuildProgram({
      app: makeApp(),
      features: [
        makeFeature({
          acceptance_criteria: [
            {
              id: "AC-1",
              description: "Must do X",
              type: "functional",
              mandatory: true,
            },
            {
              id: "AC-2",
              description: "Should do Y",
              type: "functional",
              mandatory: false,
            },
          ],
        }),
      ],
      requested_by: "operator",
    });

    const constraints = result.features[0]!.prepare.constraints!;
    expect(constraints).toContain("Must do X");
    expect(constraints).not.toContain("Should do Y");
  });

  it("maps data entity operations CREATE → INSERT for DbTouch", () => {
    const result = generateBuildProgram({
      app: makeApp(),
      features: [
        makeFeature({
          data_entities: [
            {
              name: "Task",
              owner_feature_id: "FEAT-TEST-001",
              operations: ["CREATE", "READ", "UPDATE", "DELETE"],
            },
          ],
        }),
      ],
      requested_by: "operator",
    });

    const dbTouches = result.features[0]!.prepare.db_touches!;
    expect(dbTouches).toHaveLength(1);
    expect(dbTouches[0]!.operations).toContain("INSERT");
    expect(dbTouches[0]!.operations).not.toContain("CREATE");
  });
});
