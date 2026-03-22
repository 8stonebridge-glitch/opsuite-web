import { ArtifactRegistry, HttpResearchGateway, InMemoryStorage } from "../src";

describe("research gateway", () => {
  test("captures external content and transitions trust state", async () => {
    const registry = new ArtifactRegistry(new InMemoryStorage());
    const gateway = new HttpResearchGateway(
      registry,
      async () => ({
        status: 200,
        headers: {
          get(name: string) {
            return name === "content-type" ? "application/json" : null;
          },
        },
        async text() {
          return JSON.stringify({ finding: "useful", score: 0.88 });
        },
      }),
      () => new Date("2026-03-21T16:10:00.000Z")
    );

    const captured = await gateway.captureFromUrl({
      feature_id: "FEAT-RES-001",
      url: "https://example.com/research",
    });
    const filtered = await gateway.markFiltered(
      captured.record.payload.research_note_id,
      "operator-1"
    );
    const recorded = await gateway.markRecorded(
      captured.record.payload.research_note_id,
      "operator-2"
    );

    expect(captured.status).toBe(200);
    expect(captured.record.payload.trust_status).toBe("UNTRUSTED");
    expect(captured.record.payload.content).toContain('"finding": "useful"');
    expect(filtered.payload.trust_status).toBe("FILTERED");
    expect(recorded.payload.trust_status).toBe("RECORDED");
    expect(recorded.payload.filtered_by).toBe("operator-2");
  });
});
