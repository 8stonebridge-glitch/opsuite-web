/**
 * AES Planning — App Graph Seeder
 *
 * Seeds promoted AppSpec + FeatureSpec[] into Neo4j as graph truth.
 * Only accepts PROMOTED packages. Creates FeatureSpec nodes,
 * DEPENDS_ON edges, and USES_FEATURE_TYPE edges.
 *
 * All seeded nodes start at authority_tier: PROVISIONAL.
 * They become CANONICAL through the write-back path after successful builds.
 *
 * Pattern follows: bootstrap/donor-asset-seed.ts (Cypher MERGE)
 */

import type { Neo4jQueryExecutor } from "../adapters";
import type { AppSpec, FeatureSpec } from "../types/app-spec";
import type { PromotionEvaluation } from "../types/promotion-types";

// ─── Input / Output ────────────────────────────────────────────────────────────

export interface SeedAppGraphInput {
  app: AppSpec;
  features: FeatureSpec[];
  promotion_evaluation: PromotionEvaluation;
}

export interface SeedAppGraphResult {
  app_node_id: string;
  feature_node_ids: Record<string, string>; // feature_id -> neo4j node_id
  dependency_edge_count: number;
  feature_type_edge_count: number;
  cypher_statements: string[]; // for audit
}

export class NotPromotedError extends Error {
  constructor(appId: string, decision: string) {
    super(
      `Cannot seed app ${appId}: promotion decision is ${decision}, expected PROMOTED`,
    );
    this.name = "NotPromotedError";
  }
}

// ─── Seeder ────────────────────────────────────────────────────────────────────

export class AppGraphSeeder {
  constructor(
    private readonly executor: Neo4jQueryExecutor,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async seed(input: SeedAppGraphInput): Promise<SeedAppGraphResult> {
    const { app, features, promotion_evaluation } = input;

    // Guard: only seed PROMOTED packages
    if (promotion_evaluation.decision !== "PROMOTED") {
      throw new NotPromotedError(app.app_id, promotion_evaluation.decision);
    }

    const statements: string[] = [];
    const featureNodeIds: Record<string, string> = {};
    const nowStr = this.now().toISOString();

    // 1. Create App node
    const appNodeId = `app-${app.app_id}`;
    const appCypher = `
      MERGE (a:AppSpec {app_id: $app_id})
      SET a.name = $name,
          a.summary = $summary,
          a.product_type = $product_type,
          a.authority_tier = "PROVISIONAL",
          a.promotion_status = "PROMOTED",
          a.seeded_at = $seeded_at
      RETURN a.app_id AS node_id
    `;
    statements.push(appCypher);
    await this.executor.run(appCypher, {
      app_id: app.app_id,
      name: app.name,
      summary: app.summary,
      product_type: app.product_type,
      seeded_at: nowStr,
    });

    // 2. Create FeatureSpec nodes
    for (const f of features) {
      const nodeId = `fspec-${f.feature_id}`;
      featureNodeIds[f.feature_id] = nodeId;

      const featureCypher = `
        MERGE (f:FeatureSpec {feature_id: $feature_id})
        SET f.app_id = $app_id,
            f.name = $name,
            f.description = $description,
            f.feature_type = $feature_type,
            f.authority_tier = "PROVISIONAL",
            f.promotion_status = "PROMOTED",
            f.status = "ACTIVE",
            f.seeded_at = $seeded_at
        RETURN f.feature_id AS node_id
      `;
      statements.push(featureCypher);
      await this.executor.run(featureCypher, {
        feature_id: f.feature_id,
        app_id: f.app_id,
        name: f.name,
        description: f.description,
        feature_type: f.feature_type,
        seeded_at: nowStr,
      });
    }

    // 3. Create BELONGS_TO_APP edges (feature -> app)
    for (const f of features) {
      const belongsCypher = `
        MATCH (f:FeatureSpec {feature_id: $feature_id})
        MATCH (a:AppSpec {app_id: $app_id})
        MERGE (f)-[:BELONGS_TO_APP]->(a)
      `;
      statements.push(belongsCypher);
      await this.executor.run(belongsCypher, {
        feature_id: f.feature_id,
        app_id: app.app_id,
      });
    }

    // 4. Create DEPENDS_ON edges
    let depEdgeCount = 0;
    for (const f of features) {
      for (const dep of f.dependencies) {
        const depCypher = `
          MATCH (f:FeatureSpec {feature_id: $feature_id})
          MATCH (d:FeatureSpec {feature_id: $dep_id})
          MERGE (f)-[:DEPENDS_ON_FEATURE]->(d)
        `;
        statements.push(depCypher);
        await this.executor.run(depCypher, {
          feature_id: f.feature_id,
          dep_id: dep,
        });
        depEdgeCount++;
      }
    }

    // 5. Create USES_FEATURE_TYPE edges (feature -> FeatureType)
    let typeEdgeCount = 0;
    for (const f of features) {
      if (f.feature_type) {
        const typeCypher = `
          MATCH (f:FeatureSpec {feature_id: $feature_id})
          MATCH (ft:FeatureType {id: $feature_type})
          MERGE (f)-[:USES_FEATURE_TYPE]->(ft)
        `;
        statements.push(typeCypher);
        // This may fail silently if the FeatureType doesn't exist yet —
        // that's acceptable for custom feature types
        try {
          await this.executor.run(typeCypher, {
            feature_id: f.feature_id,
            feature_type: f.feature_type,
          });
          typeEdgeCount++;
        } catch {
          // FeatureType node may not exist for custom types — that's OK
        }
      }
    }

    return {
      app_node_id: appNodeId,
      feature_node_ids: featureNodeIds,
      dependency_edge_count: depEdgeCount,
      feature_type_edge_count: typeEdgeCount,
      cypher_statements: statements,
    };
  }
}
