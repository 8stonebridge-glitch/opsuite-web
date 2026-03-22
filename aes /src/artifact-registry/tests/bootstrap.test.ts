import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapRuntimeFromEnv, loadBootstrapConfig } from "../src";

describe("runtime bootstrap", () => {
  test("loadBootstrapConfig resolves env-driven defaults", () => {
    const config = loadBootstrapConfig(
      {
        AES_REGISTRY_MODE: "memory",
        AES_TRUTH_MODE: "memory",
        AES_OPERATOR_PORT: "4301",
        AES_ARTIFACT_STORE_DIR: ".runtime-artifacts",
      },
      "/tmp/aes"
    );

    expect(config.registry_mode).toBe("memory");
    expect(config.truth_mode).toBe("memory");
    expect(config.operator_port).toBe(4301);
    expect(config.artifact_store_dir).toBe("/tmp/aes/.runtime-artifacts");
    expect(config.builder.command).toBe("claude");
    expect(config.builder.args).toEqual(["-p", "{{prompt}}"]);
  });

  test("bootstrapRuntimeFromEnv creates a runnable memory-backed runtime", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "aes-bootstrap-"));
    const graphFile = path.join(rootDir, "graph-seed.json");
    await fs.writeFile(
      graphFile,
      JSON.stringify(
        {
          nodes: [
            {
              node_id: "NODE-BOOT-001",
              label: "Feature",
              properties: { feature_id: "FEAT-BOOT-001" },
            },
          ],
          edges: [],
          feature_views: {
            "FEAT-BOOT-001": {
              node_ids: ["NODE-BOOT-001"],
              edge_ids: [],
              critical_domain_nodes: ["NODE-BOOT-001"],
            },
          },
        },
        null,
        2
      ),
      "utf8"
    );

    const bootstrap = await bootstrapRuntimeFromEnv(
      {
        AES_REGISTRY_MODE: "memory",
        AES_TRUTH_MODE: "memory",
        AES_MEMORY_GRAPH_FILE: graphFile,
        AES_ARTIFACT_STORE_DIR: path.join(rootDir, "artifacts"),
      },
      rootDir
    );

    try {
      const health = await bootstrap.runtime.health();
      expect(health.status).toBe("ok");
      expect(health.dependencies.length).toBeGreaterThan(0);
      expect(bootstrap.config.truth_mode).toBe("memory");
      expect(bootstrap.config.memory_graph_file).toBe(graphFile);
    } finally {
      await bootstrap.shutdown();
    }
  });
});
