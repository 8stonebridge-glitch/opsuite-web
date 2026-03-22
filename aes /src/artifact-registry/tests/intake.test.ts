import {
  ArtifactRegistry,
  InMemoryStorage,
  InvalidRequestTransitionError,
  RequestIntakeService,
  type Request,
} from "../src";

describe("RequestIntakeService", () => {
  test("submitRequest normalizes feature id and risk tags", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const intake = new RequestIntakeService(
      registry,
      () => new Date("2026-03-21T16:00:00.000Z")
    );

    const record = await intake.submitRequest({
      intent: "Add protected runtime telemetry",
      requested_by: "operator-1",
      risk_domain_tags: ["Security", " security ", "Platform"],
    });

    expect(record.payload.feature_id).toBe("FEAT-ADD-PROTECTED-RUNTIME-TELEMETRY");
    expect(record.payload.risk_domain_tags).toEqual(["security", "platform"]);
    expect(record.payload.status).toBe("PENDING");
    expect(record.payload.created_at).toBe("2026-03-21T16:00:00.000Z");
  });

  test("request transitions append through accepted processing complete", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const intake = new RequestIntakeService(registry);
    const submitted = await intake.submitRequest({
      feature_id: "FEAT-REQUEST-001",
      intent: "Request transition flow",
      requested_by: "operator-2",
    });

    await intake.acceptRequest(submitted.payload.request_id);
    await intake.markProcessing(submitted.payload.request_id);
    const completed = await intake.completeRequest(submitted.payload.request_id);
    const history = await registry.history<Request>(
      "request",
      submitted.payload.request_id
    );

    expect(completed.payload.status).toBe("COMPLETE");
    expect(history.map((record) => record.payload.status)).toEqual([
      "PENDING",
      "ACCEPTED",
      "PROCESSING",
      "COMPLETE",
    ]);
  });

  test("invalid request transition throws", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const intake = new RequestIntakeService(registry);
    const submitted = await intake.submitRequest({
      feature_id: "FEAT-REQUEST-002",
      intent: "Invalid transition",
      requested_by: "operator-3",
    });

    await expect(
      intake.completeRequest(submitted.payload.request_id)
    ).rejects.toThrow(InvalidRequestTransitionError);
  });
});
