import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  LocalFileArtifactStore,
  Neo4jTruthAdapter,
  type Neo4jQueryExecutor,
} from "../src";

describe("adapter layer", () => {
  test("LocalFileArtifactStore persists and reloads JSON/text blobs", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "aes-blob-store-"));
    const store = new LocalFileArtifactStore(rootDir);

    const jsonRef = await store.writeJson("validator runs", "result", {
      ok: true,
      count: 2,
    });
    const textRef = await store.writeText("diffs", "patch.txt", "hello world");

    expect(await store.readJson<{ ok: boolean; count: number }>(jsonRef)).toEqual({
      ok: true,
      count: 2,
    });
    expect(await store.readText(textRef)).toBe("hello world");
  });

  test("Neo4jTruthAdapter normalizes executor rows into graph subgraphs", async () => {
    const executor: Neo4jQueryExecutor = {
      async run() {
        return {
          rows: [
            {
              referenced_nodes: [
                {
                  node_id: "NODE-1",
                  label: "Feature",
                  properties: { feature_id: "FEAT-1" },
                },
              ],
              referenced_edges: [
                {
                  edge_id: "EDGE-1",
                  from_node_id: "NODE-1",
                  to_node_id: "NODE-2",
                  relationship: "DEPENDS_ON",
                  properties: {},
                },
              ],
              critical_domain_nodes: ["NODE-1"],
            },
          ],
        };
      },
    };

    const adapter = new Neo4jTruthAdapter(executor);
    const subgraph = await adapter.fetchFeatureSubgraph({ feature_id: "FEAT-1" });

    expect(subgraph.referenced_nodes[0]?.node_id).toBe("NODE-1");
    expect(subgraph.referenced_edges[0]?.relationship).toBe("DEPENDS_ON");
    expect(subgraph.critical_domain_nodes).toEqual(["NODE-1"]);
  });
});
