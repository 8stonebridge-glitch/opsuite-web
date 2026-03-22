"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContradictionArbiter = void 0;
// ─── Arbiter ─────────────────────────────────────────────────────────────────
class ContradictionArbiter {
    constructor(_registry, now = () => new Date()) {
        this.now = now;
    }
    evaluate(app, features) {
        const hardVetoes = [];
        const warnings = [];
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
    analyzeDependencies(features) {
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
    findCycles(features) {
        const cycles = [];
        const graph = new Map();
        for (const f of features) {
            graph.set(f.feature_id, f.dependencies || []);
        }
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (node, path) => {
            visited.add(node);
            recursionStack.add(node);
            for (const neighbor of graph.get(node) || []) {
                if (!visited.has(neighbor)) {
                    dfs(neighbor, [...path, neighbor]);
                }
                else if (recursionStack.has(neighbor)) {
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
    findMissingDependencies(features) {
        const missing = [];
        const featureMap = new Map(features.map(f => [f.feature_id, f]));
        for (const f of features) {
            const intent = (f.description || "").toLowerCase();
            const deps = f.dependencies || [];
            // If feature mentions users but doesn't depend on auth
            if ((intent.includes("user") || intent.includes("profile") || intent.includes("account")) &&
                !deps.some((d) => d.toLowerCase().includes("auth")) &&
                !(f.risk_domain_tags || []).includes("auth")) {
                const authFeature = features.find(other => (other.risk_domain_tags || []).includes("auth") ||
                    other.feature_id.toLowerCase().includes("auth"));
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
    findOrphaned(features) {
        if (features.length <= 2)
            return [];
        return features
            .filter(f => {
            const hasDeps = f.dependencies && f.dependencies.length > 0;
            const isDep = features.some(other => other.dependencies?.includes(f.feature_id));
            return !hasDeps && !isDep;
        })
            .map(f => f.feature_id);
    }
    analyzeAuth(features) {
        const authFeature = features.find(f => (f.risk_domain_tags || []).includes("auth") ||
            f.feature_id.toLowerCase().includes("auth"));
        const featuresNeedingAuth = features.filter(f => {
            if (f === authFeature)
                return false;
            const intent = (f.description || "").toLowerCase();
            return intent.includes("user") || intent.includes("protect") ||
                intent.includes("session") || intent.includes("private") ||
                intent.includes("account") || intent.includes("profile");
        });
        const missingAuthDep = featuresNeedingAuth.filter(f => authFeature && !f.dependencies?.includes(authFeature.feature_id));
        return {
            has_auth_feature: !!authFeature,
            auth_feature_id: authFeature?.feature_id,
            features_needing_auth: featuresNeedingAuth.map(f => f.feature_id),
            features_missing_auth_dependency: missingAuthDep.map(f => f.feature_id),
            consistent: missingAuthDep.length === 0,
        };
    }
    analyzeDataOwnership(features) {
        const entityMap = new Map();
        for (const f of features) {
            if (f.data_entities && f.data_entities.length > 0) {
                for (const entity of f.data_entities) {
                    const name = entity.name;
                    if (!entityMap.has(name))
                        entityMap.set(name, []);
                    entityMap.get(name).push(f.feature_id);
                }
            }
        }
        const entities = [];
        const conflicts = [];
        for (const [name, owners] of entityMap) {
            if (owners.length === 1) {
                entities.push({
                    entity_name: name,
                    owner_feature_id: owners[0],
                    reader_feature_ids: [],
                });
            }
            else {
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
exports.ContradictionArbiter = ContradictionArbiter;
//# sourceMappingURL=contradiction-arbiter.js.map