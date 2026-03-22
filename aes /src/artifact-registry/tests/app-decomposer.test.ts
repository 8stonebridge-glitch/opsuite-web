import { AppDecomposer } from "../src/planning/app-decomposer";
import type { AppSpec } from "../src/types/app-spec";

function makeApp(overrides: Partial<AppSpec> = {}): AppSpec {
  return {
    app_id: "APP-test",
    name: "Test App",
    summary: "A test app",
    product_type: "saas",
    target_users: ["admin"],
    roles: ["admin", "user"],
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
      verification_score: 0,
      overall: 0.5,
    },
    promotion_status: "DRAFT",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("AppDecomposer", () => {
  const decomposer = new AppDecomposer();

  it("generates feature IDs from app name", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "TaskFlow" }),
      candidate_features: [
        {
          name: "Authentication",
          description: "User auth with email and password",
          feature_type: "onboarding",
        },
        {
          name: "Task Management",
          description: "CRUD operations for tasks with status tracking",
          feature_type: "workflow",
        },
      ],
    });

    expect(result.features).toHaveLength(2);
    expect(result.features[0]!.feature_id).toBe("FEAT-TASKFLOW-001");
    expect(result.features[1]!.feature_id).toBe("FEAT-TASKFLOW-002");
  });

  it("all features start as CANDIDATE", () => {
    const result = decomposer.decompose({
      app: makeApp(),
      candidate_features: [
        {
          name: "Feature A",
          description: "Description for feature A testing",
          feature_type: "workflow",
        },
      ],
    });

    expect(result.features[0]!.promotion_status).toBe("CANDIDATE");
  });

  it("resolves dependency names to feature IDs", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "MyApp" }),
      candidate_features: [
        {
          name: "Auth",
          description: "Authentication system for the app",
          feature_type: "onboarding",
        },
        {
          name: "Dashboard",
          description: "Main dashboard requiring authentication",
          feature_type: "workflow",
          depends_on: ["Auth"],
        },
      ],
    });

    expect(result.features[1]!.dependencies).toEqual(["FEAT-MYAPP-001"]);
  });

  it("computes dependency order", () => {
    const result = decomposer.decompose({
      app: makeApp({ name: "App" }),
      candidate_features: [
        {
          name: "Platform",
          description: "Core platform infrastructure setup",
          feature_type: "backend_platform",
        },
        {
          name: "Features",
          description: "Feature layer built on platform base",
          feature_type: "workflow",
          depends_on: ["Platform"],
        },
      ],
    });

    expect(result.dependency_order[0]).toBe("FEAT-APP-001");
    expect(result.dependency_order[1]).toBe("FEAT-APP-002");
  });

  it("checkCoverage identifies missing surfaces", () => {
    const result = decomposer.decompose({
      app: makeApp({ roles: ["admin", "guest"] }),
      candidate_features: [
        {
          name: "Empty Feature",
          description: "A feature with no surfaces at all",
          feature_type: "workflow",
          user_roles: ["admin"],
        },
      ],
    });

    expect(result.coverage_report.missing_coverage.length).toBeGreaterThan(0);
    expect(
      result.coverage_report.missing_coverage.some((m) =>
        m.includes("guest"),
      ),
    ).toBe(true);
  });

  it("sets app_id on all features", () => {
    const result = decomposer.decompose({
      app: makeApp({ app_id: "APP-xyz" }),
      candidate_features: [
        {
          name: "Feature",
          description: "Test feature for app ID propagation",
          feature_type: "workflow",
        },
      ],
    });

    expect(result.features[0]!.app_id).toBe("APP-xyz");
  });
});
