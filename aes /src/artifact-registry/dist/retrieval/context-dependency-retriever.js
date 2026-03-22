"use strict";
/**
 * AES Context/Dependency Retrieval Agent
 *
 * Looks at neighbor features and upstream/downstream dependencies.
 * Answers: what must exist first, what contracts does this feature
 * rely on, what adjacent flows matter.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextDependencyRetriever = void 0;
// ─── Retriever ───────────────────────────────────────────────────────────────
class ContextDependencyRetriever {
    constructor(registry, now = () => new Date()) {
        this.registry = registry;
        this.now = now;
    }
    async retrieve(feature, allFeatures) {
        const upstream = await this.findUpstream(feature, allFeatures);
        const downstream = this.findDownstream(feature, allFeatures);
        const requiredContracts = this.findRequiredContracts(feature, downstream, allFeatures);
        const consumedContracts = this.findConsumedContracts(feature, upstream, allFeatures);
        const sharedEntities = this.findSharedEntities(feature, allFeatures);
        const blockers = [];
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
    async findUpstream(feature, _allFeatures) {
        const deps = [];
        if (feature.dependencies) {
            for (const depId of feature.dependencies) {
                // depFeature available for contract lookups
                const builds = await this.registry.latestByType("build");
                const depBuild = builds.find(b => b.payload.feature_id === depId);
                let status = "NOT_BUILT";
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
    findDownstream(feature, allFeatures) {
        return allFeatures
            .filter(f => f.dependencies?.includes(feature.feature_id))
            .map(f => ({
            feature_id: f.feature_id,
            dependency_type: "hard",
            status: "WAITING",
        }));
    }
    findRequiredContracts(feature, downstream, allFeatures) {
        const contracts = [];
        for (const dep of downstream) {
            const depFeature = allFeatures.find(f => f.feature_id === dep.feature_id);
            if (depFeature?.backend_surfaces?.[0]?.api_contracts) {
                for (const contract of depFeature.backend_surfaces?.[0].api_contracts) {
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
    findConsumedContracts(_feature, upstream, allFeatures) {
        const contracts = [];
        for (const up of upstream) {
            const upFeature = allFeatures.find(f => f.feature_id === up.feature_id);
            if (upFeature?.backend_surfaces?.[0]?.api_contracts) {
                for (const contract of upFeature.backend_surfaces?.[0].api_contracts) {
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
    findSharedEntities(feature, allFeatures) {
        const myEntities = new Set();
        if (feature.backend_surfaces?.[0]?.data_entities) {
            for (const entity of feature.backend_surfaces?.[0].data_entities) {
                myEntities.add(entity.entity_name || entity.entity_id);
            }
        }
        const shared = [];
        for (const other of allFeatures) {
            if (other.feature_id === feature.feature_id)
                continue;
            if (other.backend_surfaces?.[0]?.data_entities) {
                for (const entity of other.backend_surfaces?.[0].data_entities) {
                    const name = entity.entity_name || entity.entity_id;
                    if (myEntities.has(name))
                        shared.push(name);
                }
            }
        }
        return [...new Set(shared)];
    }
}
exports.ContextDependencyRetriever = ContextDependencyRetriever;
//# sourceMappingURL=context-dependency-retriever.js.map