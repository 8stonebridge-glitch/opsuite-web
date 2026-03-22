/**
 * AES Context/Dependency Retrieval Agent
 *
 * Looks at neighbor features and upstream/downstream dependencies.
 * Answers: what must exist first, what contracts does this feature
 * rely on, what adjacent flows matter.
 */

import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { Build } from "../types/artifacts";
import type { FeatureSpec } from "../types/app-spec";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DependencyContext {
  context_id: string;
  feature_id: string;
  captured_at: string;
  source: "context_dependency_retriever";
  confidence: number;
  artifact_refs: ArtifactRef[];

  /** Direct upstream dependencies */
  upstream: UpstreamDependency[];

  /** Direct downstream dependents */
  downstream: DownstreamDependent[];

  /** Contracts this feature must satisfy for downstream features */
  required_contracts: RequiredContract[];

  /** Contracts this feature consumes from upstream features */
  consumed_contracts: ConsumedContract[];

  /** Shared data entities across the dependency chain */
  shared_entities: string[];

  /** Whether all upstream dependencies are satisfied */
  all_upstream_satisfied: boolean;

  /** Blocking issues */
  blockers: string[];
}

export interface UpstreamDependency {
  feature_id: string;
  dependency_type: "hard" | "soft";
  status: "PASSED" | "FAILED" | "NOT_BUILT" | "UNKNOWN";
  bridge_id?: string;
  satisfied: boolean;
}

export interface DownstreamDependent {
  feature_id: string;
  dependency_type: "hard" | "soft";
  status: "WAITING" | "READY" | "BLOCKED";
}

export interface RequiredContract {
  contract_id: string;
  consumed_by_feature_id: string;
  description: string;
  type: "api" | "data" | "event" | "auth";
}

export interface ConsumedContract {
  contract_id: string;
  provided_by_feature_id: string;
  description: string;
  type: "api" | "data" | "event" | "auth";
  available: boolean;
}

// ─── Retriever ───────────────────────────────────────────────────────────────

export class ContextDependencyRetriever {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async retrieve(
    feature: FeatureSpec,
    allFeatures: FeatureSpec[],
  ): Promise<DependencyContext> {
    const upstream = await this.findUpstream(feature, allFeatures);
    const downstream = this.findDownstream(feature, allFeatures);
    const requiredContracts = this.findRequiredContracts(feature, downstream, allFeatures);
    const consumedContracts = this.findConsumedContracts(feature, upstream, allFeatures);
    const sharedEntities = this.findSharedEntities(feature, allFeatures);
    const blockers: string[] = [];

    const allUpstreamSatisfied = upstream.every(u => u.satisfied);
    if (!allUpstreamSatisfied) {
      const unsatisfied = upstream.filter(u => !u.satisfied);
      for (const u of unsatisfied) {
        blockers.push(`Upstream dependency ${u.feature_id} is ${u.status}`);
      }
    }

    return {
      context_id: `CTX-${Date.now()}-${feature.feature_id}`,
      feature_id: feature.feature_id,
      captured_at: this.now().toISOString(),
      source: "context_dependency_retriever",
      confidence: 0.85,
      artifact_refs: [],
      upstream,
      downstream,
      required_contracts: requiredContracts,
      consumed_contracts: consumedContracts,
      shared_entities: sharedEntities,
      all_upstream_satisfied: allUpstreamSatisfied,
      blockers,
    };
  }

  private async findUpstream(
    feature: FeatureSpec,
    _allFeatures: FeatureSpec[],
  ): Promise<UpstreamDependency[]> {
    const deps: UpstreamDependency[] = [];

    if ((feature as any).dependencies) {
      for (const depId of (feature as any).dependencies) {
        // depFeature available for contract lookups
        const builds = await this.registry.latestByType<Build>("build");
        const depBuild = builds.find(b => b.payload.feature_id === depId);

        let status: UpstreamDependency["status"] = "NOT_BUILT";
        if (depBuild) {
          status = depBuild.payload.status === "PASSED" ? "PASSED" : "FAILED";
        }

        deps.push({
          feature_id: depId,
          dependency_type: "hard",
          status,
          bridge_id: depBuild?.payload.bridge_id,
          satisfied: status === "PASSED",
        });
      }
    }

    return deps;
  }

  private findDownstream(
    feature: FeatureSpec,
    allFeatures: FeatureSpec[],
  ): DownstreamDependent[] {
    return allFeatures
      .filter(f => (f as any).dependencies?.includes(feature.feature_id))
      .map(f => ({
        feature_id: f.feature_id,
        dependency_type: "hard" as const,
        status: "WAITING" as const,
      }));
  }

  private findRequiredContracts(
    feature: FeatureSpec,
    downstream: DownstreamDependent[],
    allFeatures: FeatureSpec[],
  ): RequiredContract[] {
    const contracts: RequiredContract[] = [];

    for (const dep of downstream) {
      const depFeature = allFeatures.find(f => f.feature_id === dep.feature_id);
      if ((depFeature as any)?.backend_surfaces?.[0]?.api_contracts) {
        for (const contract of (depFeature as any).backend_surfaces?.[0].api_contracts) {
          if (contract.depends_on?.includes(feature.feature_id)) {
            contracts.push({
              contract_id: contract.contract_id,
              consumed_by_feature_id: dep.feature_id,
              description: contract.description || contract.contract_id,
              type: "api",
            });
          }
        }
      }
    }

    return contracts;
  }

  private findConsumedContracts(
    _feature: FeatureSpec,
    upstream: UpstreamDependency[],
    allFeatures: FeatureSpec[],
  ): ConsumedContract[] {
    const contracts: ConsumedContract[] = [];

    for (const up of upstream) {
      const upFeature = allFeatures.find(f => f.feature_id === up.feature_id);
      if ((upFeature as any)?.backend_surfaces?.[0]?.api_contracts) {
        for (const contract of (upFeature as any).backend_surfaces?.[0].api_contracts) {
          contracts.push({
            contract_id: contract.contract_id,
            provided_by_feature_id: up.feature_id,
            description: contract.description || contract.contract_id,
            type: "api",
            available: up.satisfied,
          });
        }
      }
    }

    return contracts;
  }

  private findSharedEntities(
    feature: FeatureSpec,
    allFeatures: FeatureSpec[],
  ): string[] {
    const myEntities = new Set<string>();
    if ((feature as any).backend_surfaces?.[0]?.data_entities) {
      for (const entity of (feature as any).backend_surfaces?.[0].data_entities) {
        myEntities.add(entity.entity_name || entity.entity_id);
      }
    }

    const shared: string[] = [];
    for (const other of allFeatures) {
      if (other.feature_id === feature.feature_id) continue;
      if ((other as any).backend_surfaces?.[0]?.data_entities) {
        for (const entity of (other as any).backend_surfaces?.[0].data_entities) {
          const name = entity.entity_name || entity.entity_id;
          if (myEntities.has(name)) shared.push(name);
        }
      }
    }

    return [...new Set(shared)];
  }
}
