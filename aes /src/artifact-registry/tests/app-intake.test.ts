import { ArtifactRegistry, InMemoryStorage } from "../src/registry";
import {
  AppIntakeService,
  InvalidAppTransitionError,
} from "../src/intake/app-intake";

describe("AppIntakeService", () => {
  let registry: ArtifactRegistry;
  let intake: AppIntakeService;

  beforeEach(() => {
    registry = new ArtifactRegistry(new InMemoryStorage());
    intake = new AppIntakeService(registry);
  });

  it("submitApp creates DRAFT AppSpec", async () => {
    const result = await intake.submitApp({
      description: "Build a Slack-like team communication app",
      requested_by: "operator",
    });

    expect(result.payload.promotion_status).toBe("DRAFT");
    expect(result.payload.summary).toBe(
      "Build a Slack-like team communication app",
    );
    expect(result.payload.app_id).toMatch(/^APP-/);
    expect(result.payload.product_type).toBe("general");
  });

  it("submitApp uses provided name", async () => {
    const result = await intake.submitApp({
      description: "A task manager",
      requested_by: "operator",
      name: "TaskFlow",
    });

    expect(result.payload.name).toBe("TaskFlow");
  });

  it("submitApp derives name from description when not provided", async () => {
    const result = await intake.submitApp({
      description: "Build a real-time collaboration tool for remote teams",
      requested_by: "operator",
    });

    expect(result.payload.name).toBe("Build a real-time collaboration tool");
  });

  it("getApp reads back submitted app", async () => {
    const created = await intake.submitApp({
      description: "Test app",
      requested_by: "operator",
    });

    const retrieved = await intake.getApp(created.payload.app_id);
    expect(retrieved.payload.app_id).toBe(created.payload.app_id);
  });

  it("updateAppStatus transitions DRAFT → CANDIDATE", async () => {
    const created = await intake.submitApp({
      description: "Test app",
      requested_by: "operator",
    });

    const updated = await intake.updateAppStatus(
      created.payload.app_id,
      "CANDIDATE",
    );
    expect(updated.payload.promotion_status).toBe("CANDIDATE");
  });

  it("updateAppStatus rejects invalid transitions", async () => {
    const created = await intake.submitApp({
      description: "Test app",
      requested_by: "operator",
    });

    await expect(
      intake.updateAppStatus(created.payload.app_id, "PROMOTED"),
    ).rejects.toThrow(InvalidAppTransitionError);
  });

  it("updateApp merges partial updates", async () => {
    const created = await intake.submitApp({
      description: "Test app",
      requested_by: "operator",
    });

    const updated = await intake.updateApp(created.payload.app_id, {
      roles: ["admin", "user"],
      feature_ids: ["FEAT-001", "FEAT-002"],
    });

    expect(updated.payload.roles).toEqual(["admin", "user"]);
    expect(updated.payload.feature_ids).toEqual(["FEAT-001", "FEAT-002"]);
    expect(updated.payload.summary).toBe("Test app");
  });
});
