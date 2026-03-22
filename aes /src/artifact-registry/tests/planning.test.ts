import {
  evaluatePromotionGates,
  evaluateSpecHardVetoes,
  evaluatePromotion,
  computeDependencyOrder,
} from "../src/planning/promotion-engine";
import type { AppSpec, FeatureSpec } from "../src/types/app-spec";
import type { VerificationReport } from "../src/types/promotion-types";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeApp(overrides: Partial<AppSpec> = {}): AppSpec {
  return {
    app_id: "APP-test",
    name: "Test App",
    summary: "A test application",
    product_type: "saas",
    target_users: ["admin", "user"],
    roles: ["admin", "user"],
    core_jobs_to_be_done: ["manage tasks"],
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
    promotion_status: "VERIFIED",
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
    description: "A test feature for unit testing the promotion engine",
    feature_type: "workflow",
    donor_mappings: [],
    dependencies: [],
    user_roles: ["admin", "user"],
    backend_surfaces: [
      { name: "api/tasks", type: "api_endpoint", description: "Tasks API" },
    ],
    frontend_surfaces: [
      { name: "pages/tasks", type: "page", description: "Tasks page" },
    ],
    auth_requirements: [
      { type: "role_based", description: "Admin access", roles: ["admin"] },
    ],
    data_entities: [
      {
        name: "Task",
        owner_feature_id: "FEAT-TEST-001",
        operations: ["CREATE", "READ", "UPDATE", "DELETE"],
      },
    ],
    events: [],
    integrations: [],
    failure_states: [],
    destructive_actions: [
      {
        action: "Delete task",
        reversible: false,
        confirmation_required: true,
        audit_logged: true,
      },
    ],
    acceptance_criteria: [
      {
        id: "AC-1",
        description: "User can create a task",
        type: "functional",
        mandatory: true,
      },
    ],
    test_cases: [
      {
        id: "TC-1",
        description: "Creates task via API",
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
    promotion_status: "CANDIDATE",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Gate Tests ────────────────────────────────────────────────────────────────

describe("Promotion Engine", () => {
  describe("evaluatePromotionGates", () => {
    it("all gates pass for a well-formed package", () => {
      const app = makeApp();
      const features = [makeFeature()];
      const gates = evaluatePromotionGates(app, features);

      expect(gates).toHaveLength(7);
      expect(gates.every((g) => g.passed)).toBe(true);
    });

    it("COVERAGE gate fails when a role is not covered", () => {
      const app = makeApp({ roles: ["admin", "user", "guest"] });
      const features = [makeFeature({ user_roles: ["admin"] })];
      const gates = evaluatePromotionGates(app, features);

      const coverage = gates.find((g) => g.gate === "COVERAGE")!;
      expect(coverage.passed).toBe(false);
      expect(coverage.message).toContain("user");
      expect(coverage.message).toContain("guest");
    });

    it("COVERAGE gate fails when feature has no surfaces", () => {
      const app = makeApp();
      const features = [
        makeFeature({
          backend_surfaces: [],
          frontend_surfaces: [],
        }),
      ];
      const gates = evaluatePromotionGates(app, features);

      const coverage = gates.find((g) => g.gate === "COVERAGE")!;
      expect(coverage.passed).toBe(false);
    });

    it("DEPENDENCY gate fails on circular dependencies", () => {
      const features = [
        makeFeature({
          feature_id: "FEAT-A",
          dependencies: ["FEAT-B"],
        }),
        makeFeature({
          feature_id: "FEAT-B",
          dependencies: ["FEAT-A"],
          data_entities: [],
        }),
      ];
      const gates = evaluatePromotionGates(makeApp(), features);

      const dep = gates.find((g) => g.gate === "DEPENDENCY")!;
      expect(dep.passed).toBe(false);
    });

    it("DEPENDENCY gate fails on missing dependency target", () => {
      const features = [
        makeFeature({ dependencies: ["FEAT-NONEXISTENT"] }),
      ];
      const gates = evaluatePromotionGates(makeApp(), features);

      const dep = gates.find((g) => g.gate === "DEPENDENCY")!;
      expect(dep.passed).toBe(false);
      expect(dep.message).toContain("FEAT-NONEXISTENT");
    });

    it("FLOW gate fails when no mandatory acceptance criteria", () => {
      const features = [
        makeFeature({
          acceptance_criteria: [
            {
              id: "AC-1",
              description: "Optional",
              type: "functional",
              mandatory: false,
            },
          ],
        }),
      ];
      const gates = evaluatePromotionGates(makeApp(), features);

      const flow = gates.find((g) => g.gate === "FLOW")!;
      expect(flow.passed).toBe(false);
    });

    it("BUILDABILITY gate fails when feature_type is empty", () => {
      const features = [makeFeature({ feature_type: "" })];
      const gates = evaluatePromotionGates(makeApp(), features);

      const build = gates.find((g) => g.gate === "BUILDABILITY")!;
      expect(build.passed).toBe(false);
    });

    it("CONTRADICTION gate fails when multiple owners for same entity", () => {
      const features = [
        makeFeature({
          feature_id: "FEAT-A",
          data_entities: [
            {
              name: "User",
              owner_feature_id: "FEAT-A",
              operations: ["CREATE"],
            },
          ],
        }),
        makeFeature({
          feature_id: "FEAT-B",
          data_entities: [
            {
              name: "User",
              owner_feature_id: "FEAT-B",
              operations: ["READ"],
            },
          ],
        }),
      ];
      const gates = evaluatePromotionGates(makeApp(), features);

      const contradiction = gates.find((g) => g.gate === "CONTRADICTION")!;
      expect(contradiction.passed).toBe(false);
    });

    it("CONFIDENCE_THRESHOLD gate fails when confidence < 0.60", () => {
      const features = [
        makeFeature({
          confidence_summary: {
            decomposition_confidence: 0.3,
            research_coverage: 0.2,
            verification_score: 0.2,
            overall: 0.25,
          },
        }),
      ];
      const gates = evaluatePromotionGates(makeApp(), features);

      const conf = gates.find((g) => g.gate === "CONFIDENCE_THRESHOLD")!;
      expect(conf.passed).toBe(false);
    });

    it("MISSING_QUESTIONS gate fails when app has open questions", () => {
      const app = makeApp({
        open_questions: ["What is the auth model?"],
      });
      const gates = evaluatePromotionGates(app, [makeFeature()]);

      const mq = gates.find((g) => g.gate === "MISSING_QUESTIONS")!;
      expect(mq.passed).toBe(false);
    });
  });

  // ─── Veto Tests ──────────────────────────────────────────────────────────

  describe("evaluateSpecHardVetoes", () => {
    it("returns no vetoes for well-formed features", () => {
      const vetoes = evaluateSpecHardVetoes([makeFeature()]);
      expect(vetoes).toHaveLength(0);
    });

    it("AUTH_AMBIGUITY triggers on empty auth requirements", () => {
      const vetoes = evaluateSpecHardVetoes([
        makeFeature({ auth_requirements: [] }),
      ]);
      expect(vetoes.some((v) => v.code === "AUTH_AMBIGUITY")).toBe(true);
    });

    it("PERMISSION_AMBIGUITY triggers on role_based with no roles", () => {
      const vetoes = evaluateSpecHardVetoes([
        makeFeature({
          auth_requirements: [
            { type: "role_based", description: "Some auth", roles: [] },
          ],
        }),
      ]);
      expect(vetoes.some((v) => v.code === "PERMISSION_AMBIGUITY")).toBe(true);
    });

    it("MISSING_DATA_OWNERSHIP triggers on entity with no owner", () => {
      const vetoes = evaluateSpecHardVetoes([
        makeFeature({
          data_entities: [
            {
              name: "Orphan",
              owner_feature_id: "",
              operations: ["READ"],
            },
          ],
        }),
      ]);
      expect(vetoes.some((v) => v.code === "MISSING_DATA_OWNERSHIP")).toBe(
        true,
      );
    });

    it("UNDEFINED_DESTRUCTIVE_BEHAVIOR triggers on irreversible non-audited action", () => {
      const vetoes = evaluateSpecHardVetoes([
        makeFeature({
          destructive_actions: [
            {
              action: "Purge data",
              reversible: false,
              confirmation_required: true,
              audit_logged: false,
            },
          ],
        }),
      ]);
      expect(
        vetoes.some((v) => v.code === "UNDEFINED_DESTRUCTIVE_BEHAVIOR"),
      ).toBe(true);
    });

    it("UNRESOLVED_DEPENDENCY_CONFLICT triggers on dependency on REJECTED feature", () => {
      const vetoes = evaluateSpecHardVetoes([
        makeFeature({
          feature_id: "FEAT-A",
          dependencies: ["FEAT-B"],
          data_entities: [],
        }),
        makeFeature({
          feature_id: "FEAT-B",
          promotion_status: "REJECTED",
          data_entities: [],
        }),
      ]);
      expect(
        vetoes.some((v) => v.code === "UNRESOLVED_DEPENDENCY_CONFLICT"),
      ).toBe(true);
    });

    it("INCOMPLETE_CRITICAL_ACCEPTANCE_TESTS triggers on mandatory criterion with no test", () => {
      const vetoes = evaluateSpecHardVetoes([
        makeFeature({
          acceptance_criteria: [
            {
              id: "AC-orphan",
              description: "Must work",
              type: "functional",
              mandatory: true,
            },
          ],
          test_cases: [], // no linked test
        }),
      ]);
      expect(
        vetoes.some(
          (v) => v.code === "INCOMPLETE_CRITICAL_ACCEPTANCE_TESTS",
        ),
      ).toBe(true);
    });
  });

  // ─── Full Evaluation Tests ───────────────────────────────────────────────

  describe("evaluatePromotion", () => {
    it("PROMOTED when all gates pass and no vetoes", () => {
      const result = evaluatePromotion(makeApp(), [makeFeature()]);
      expect(result.decision).toBe("PROMOTED");
      expect(result.all_gates_passed).toBe(true);
      expect(result.hard_blocked).toBe(false);
    });

    it("BLOCKED when hard veto is present", () => {
      const result = evaluatePromotion(makeApp(), [
        makeFeature({ auth_requirements: [] }),
      ]);
      expect(result.decision).toBe("BLOCKED");
      expect(result.hard_blocked).toBe(true);
    });

    it("REJECTED when gate fails but no hard veto", () => {
      const result = evaluatePromotion(makeApp(), [
        makeFeature({ feature_type: "" }),
      ]);
      expect(result.decision).toBe("REJECTED");
      expect(result.all_gates_passed).toBe(false);
      expect(result.hard_blocked).toBe(false);
    });

    it("REJECTED when verification report recommends REJECT", () => {
      const report: VerificationReport = {
        verification_id: "VRPT-test",
        app_id: "APP-test",
        verified_at: new Date().toISOString(),
        completeness_score: 0.3,
        missing_flows: ["critical flow missing"],
        dependency_issues: [],
        backend_frontend_balance: {
          backend_coverage: 0.5,
          frontend_coverage: 0.5,
          gaps: [],
        },
        contradictions: [],
        overall_score: 0.3,
        recommendation: "REJECT",
        notes: ["Major gaps found"],
      };

      const result = evaluatePromotion(makeApp(), [makeFeature()], report);
      expect(result.decision).toBe("REJECTED");
    });
  });

  // ─── Dependency Order Tests ──────────────────────────────────────────────

  describe("computeDependencyOrder", () => {
    it("returns correct topological order", () => {
      const features = [
        makeFeature({
          feature_id: "FEAT-C",
          dependencies: ["FEAT-B"],
          data_entities: [],
        }),
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
      ];

      const result = computeDependencyOrder(features);
      expect(result.hasCycle).toBe(false);
      expect(result.order.indexOf("FEAT-A")).toBeLessThan(
        result.order.indexOf("FEAT-B"),
      );
      expect(result.order.indexOf("FEAT-B")).toBeLessThan(
        result.order.indexOf("FEAT-C"),
      );
    });

    it("detects cycles", () => {
      const features = [
        makeFeature({
          feature_id: "FEAT-A",
          dependencies: ["FEAT-B"],
          data_entities: [],
        }),
        makeFeature({
          feature_id: "FEAT-B",
          dependencies: ["FEAT-A"],
          data_entities: [],
        }),
      ];

      const result = computeDependencyOrder(features);
      expect(result.hasCycle).toBe(true);
    });
  });
});
