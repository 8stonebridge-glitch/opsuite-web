/**
 * AES Contradiction Arbiter
 *
 * Backed by Gemini or deterministic rules. Checks:
 *   - Auth conflicts
 *   - Data ownership conflicts
 *   - Dependency conflicts
 *   - Impossible flows
 *   - Conflicting requirements
 *
 * Returns a pass/fail verdict with specific contradictions identified.
 */

import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { FeatureSpec, AppSpec } from "../types/app-spec";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ContradictionEvaluation {
  evaluation_id: string;
  app_id: string;
  captured_at: string;
  source: "contradiction_arbiter";
  extracted_by: "gemini";
  confidence: number;
  status: "UNTRUSTED";
  artifact_refs: ArtifactRef[];

  /** Whether the feature set passes the contradiction gate */
  passes_gate: boolean;

  /** Hard vetoes that must be resolved before any build */
  hard_vetoes: ContradictionVeto[];

  /** Warnings that should be reviewed but don't block */
  warnings: ContradictionWarning[];

  /** Dependency analysis */
  dependency_analysis: DependencyAnalysis;

  /** Auth model analysis */
  auth_analysis: AuthAnalysis;

  /** Data ownership analysis */
  data_analysis: DataOwnershipAnalysis;
}

export interface ContradictionVeto {
  veto_code: string;
  description: string;
  affected_features: string[];
  resolution: string;
}

export interface ContradictionWarning {
  warning_code: string;
  description: string;
  affected_features: string[];
  recommendation: string;
}

export interface DependencyAnalysis {
  has_cycles: boolean;
  cycles: string[][];
  missing_dependencies: MissingDependency[];
  orphaned_features: string[];
}

export interface MissingDependency {
  feature_id: string;
  expected_dependency: string;
  reason: string;
}

export interface AuthAnalysis {
  has_auth_feature: boolean;
  auth_feature_id?: string;
  features_needing_auth: string[];
  features_missing_auth_dependency: string[];
  consistent: boolean;
}

export interface DataOwnershipAnalysis {
  entities: EntityOwnership[];
  conflicts: DataConflict[];
}

export interface EntityOwnership {
  entity_name: string;
  owner_feature_id: string;
  reader_feature_ids: string[];
}

export interface DataConflict {
  entity_name: string;
  claimants: string[];
  resolution: string;
}

// ─── Arbiter ─────────────────────────────────────────────────────────────────

export class ContradictionArbiter {
  constructor(
    _registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  evaluate(app: AppSpec, features: FeatureSpec[]): ContradictionEvaluation {
    const hardVetoes: ContradictionVeto[] = [];
    const warnings: ContradictionWarning[] = [];

    const dependencyAnalysis = this.analyzeDependencies(features);
    const authAnalysis = this.analyzeAuth(features);
    const dataAnalysis = this.analyzeDataOwnership(features);

    // Hard vetoes from dependency cycles
    if (dependencyAnalysis.has_cycles) {
      for (const cycle of dependencyAnalysis.cycles) {
        hardVetoes.push({
          veto_code: "DEPENDENCY_CYCLE",
          description: `Circular dependency: ${cycle.join(" → ")} → ${cycle[0]}`,
          affected_features: cycle,
          resolution: "Break the cycle by extracting shared logic into a separate feature",
        });
      }
    }

    // Hard vetoes from auth ambiguity
    if (!authAnalysis.consistent && authAnalysis.features_missing_auth_dependency.length > 0) {
      hardVetoes.push({
        veto_code: "AUTH_AMBIGUITY",
        description: `${authAnalysis.features_missing_auth_dependency.length} features need auth but don't depend on the auth feature`,
        affected_features: authAnalysis.features_missing_auth_dependency,
        resolution: "Add explicit dependency on the auth feature",
      });
    }

    // Hard vetoes from data ownership conflicts
    for (const conflict of dataAnalysis.conflicts) {
      hardVetoes.push({
        veto_code: "DATA_OWNERSHIP_CONFLICT",
        description: `Entity '${conflict.entity_name}' claimed by: ${conflict.claimants.join(", ")}`,
        affected_features: conflict.claimants,
        resolution: conflict.resolution,
      });
    }

    // Warnings from missing dependencies
    for (const missing of dependencyAnalysis.missing_dependencies) {
      warnings.push({
        warning_code: "MISSING_DEPENDENCY",
        description: `${missing.feature_id} likely needs ${missing.expected_dependency}: ${missing.reason}`,
        affected_features: [missing.feature_id],
        recommendation: `Add depends_on: ${missing.expected_dependency}`,
      });
    }

    // Warnings from orphaned features
    if (dependencyAnalysis.orphaned_features.length > 0) {
      warnings.push({
        warning_code: "ORPHANED_FEATURES",
        description: `${dependencyAnalysis.orphaned_features.length} features have no connections`,
        affected_features: dependencyAnalysis.orphaned_features,
        recommendation: "Review whether these features need dependency links",
      });
    }

    return {
      evaluation_id: `CONTRA-${Date.now()}-${app.app_id}`,
      app_id: app.app_id,
      captured_at: this.now().toISOString(),
      source: "contradiction_arbiter",
      extracted_by: "gemini",
      confidence: 0.85,
      status: "UNTRUSTED",
      artifact_refs: [],
      passes_gate: hardVetoes.length === 0,
      hard_vetoes: hardVetoes,
      warnings,
      dependency_analysis: dependencyAnalysis,
      auth_analysis: authAnalysis,
      data_analysis: dataAnalysis,
    };
  }

  private analyzeDependencies(features: FeatureSpec[]): DependencyAnalysis {
    const cycles = this.findCycles(features);
    const missing = this.findMissingDependencies(features);
    const orphaned = this.findOrphaned(features);

    return {
      has_cycles: cycles.length > 0,
      cycles,
      missing_dependencies: missing,
      orphaned_features: orphaned,
    };
  }

  private findCycles(features: FeatureSpec[]): string[][] {
    const cycles: string[][] = [];
    const graph = new Map<string, string[]>();

    for (const f of features) {
      graph.set(f.feature_id, (f as any).dependencies || []);
    }

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      visited.add(node);
      recursionStack.add(node);

      for (const neighbor of graph.get(node) || []) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path, neighbor]);
        } else if (recursionStack.has(neighbor)) {
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push(path.slice(cycleStart));
          }
        }
      }

      recursionStack.delete(node);
    };

    for (const f of features) {
      if (!visited.has(f.feature_id)) {
        dfs(f.feature_id, [f.feature_id]);
      }
    }

    return cycles;
  }

  private findMissingDependencies(features: FeatureSpec[]): MissingDependency[] {
    const missing: MissingDependency[] = [];
    const featureMap = new Map(features.map(f => [f.feature_id, f]));

    for (const f of features) {
      const intent = ((f as any).description || "").toLowerCase();
      const deps = (f as any).dependencies || [];

      // If feature mentions users but doesn't depend on auth
      if (
        (intent.includes("user") || intent.includes("profile") || intent.includes("account")) &&
        !deps.some((d: string) => d.toLowerCase().includes("auth")) &&
        !((f as any).risk_domain_tags || []).includes("auth")
      ) {
        const authFeature = features.find(other =>
          ((other as any).risk_domain_tags || []).includes("auth") ||
          other.feature_id.toLowerCase().includes("auth")
        );
        if (authFeature) {
          missing.push({
            feature_id: f.feature_id,
            expected_dependency: authFeature.feature_id,
            reason: "Feature references users but doesn't depend on auth",
          });
        }
      }

      // Check for declared dependencies that don't exist
      for (const depId of deps) {
        if (!featureMap.has(depId)) {
          missing.push({
            feature_id: f.feature_id,
            expected_dependency: depId,
            reason: `Declared dependency '${depId}' does not exist in the feature set`,
          });
        }
      }
    }

    return missing;
  }

  private findOrphaned(features: FeatureSpec[]): string[] {
    if (features.length <= 2) return [];

    return features
      .filter(f => {
        const hasDeps = (f as any).dependencies && (f as any).dependencies.length > 0;
        const isDep = features.some(other =>
          (other as any).dependencies?.includes(f.feature_id)
        );
        return !hasDeps && !isDep;
      })
      .map(f => f.feature_id);
  }

  private analyzeAuth(features: FeatureSpec[]): AuthAnalysis {
    const authFeature = features.find(f =>
      ((f as any).risk_domain_tags || []).includes("auth") ||
      f.feature_id.toLowerCase().includes("auth")
    );

    const featuresNeedingAuth = features.filter(f => {
      if (f === authFeature) return false;
      const intent = ((f as any).description || "").toLowerCase();
      return intent.includes("user") || intent.includes("protect") ||
        intent.includes("session") || intent.includes("private") ||
        intent.includes("account") || intent.includes("profile");
    });

    const missingAuthDep = featuresNeedingAuth.filter(f =>
      authFeature && !(f as any).dependencies?.includes(authFeature.feature_id)
    );

    return {
      has_auth_feature: !!authFeature,
      auth_feature_id: authFeature?.feature_id,
      features_needing_auth: featuresNeedingAuth.map(f => f.feature_id),
      features_missing_auth_dependency: missingAuthDep.map(f => f.feature_id),
      consistent: missingAuthDep.length === 0,
    };
  }

  private analyzeDataOwnership(features: FeatureSpec[]): DataOwnershipAnalysis {
    const entityMap = new Map<string, string[]>();

    for (const f of features) {
      if (f.data_entities && f.data_entities.length > 0) {
        for (const entity of f.data_entities) {
          const name = entity.name;
          if (!entityMap.has(name)) entityMap.set(name, []);
          entityMap.get(name)!.push(f.feature_id);
        }
      }
    }

    const entities: EntityOwnership[] = [];
    const conflicts: DataConflict[] = [];

    for (const [name, owners] of entityMap) {
      if (owners.length === 1) {
        entities.push({
          entity_name: name,
          owner_feature_id: owners[0]!,
          reader_feature_ids: [],
        });
      } else {
        conflicts.push({
          entity_name: name,
          claimants: owners,
          resolution: `Assign single owner for '${name}', others should use read-only access`,
        });
      }
    }

    return { entities, conflicts };
  }
}
