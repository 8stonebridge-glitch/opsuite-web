"use strict";
/**
 * AES Bridge Layer — Bridge Compiler
 *
 * Compiles orchestrator-selected truth and scoped execution intent into the
 * single bridge contract that a builder will later consume.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BridgeCompiler = void 0;
const registry_1 = require("../registry");
const types_1 = require("../types");
const system_context_provider_1 = require("./system-context-provider");
class BridgeCompiler {
    constructor(registry, now = () => new Date()) {
        this.registry = registry;
        this.now = now;
    }
    async compile(input) {
        // Inject system context into data_model so the builder knows
        // what database tables, API routes, and types already exist.
        // The feature_type hint (if extractable from intent) produces
        // feature-specific storage and API notes.
        const featureType = input.data_model?.["feature_type"];
        const systemContext = (0, system_context_provider_1.buildSystemContext)(featureType);
        const serializedContext = (0, system_context_provider_1.serializeContextForBridge)(systemContext);
        const enrichedDataModel = {
            ...(input.data_model ?? {}),
            system_context: serializedContext,
        };
        const bridge = {
            bridge_id: (0, registry_1.generateArtifactId)("bridge"),
            build_id: input.build_id,
            feature_id: input.feature_id,
            generated_at: this.now().toISOString(),
            graph_snapshot_id: input.graph_snapshot.graph_snapshot_id,
            graph_truth_hash: input.graph_snapshot.graph_truth_hash,
            bridge_version: 1,
            intent: input.intent,
            scope: input.scope,
            out_of_scope: input.out_of_scope ?? [],
            constraints: input.constraints ?? [],
            tiered_constraints: input.tiered_constraints,
            patterns: input.patterns ?? [],
            anti_patterns: input.anti_patterns ?? [],
            data_model: enrichedDataModel,
            api_contracts: input.api_contracts ?? [],
            events: input.events ?? [],
            db_touches: input.db_touches ?? [],
            component_boundaries: input.component_boundaries ?? [],
            read_scope: input.read_scope,
            write_scope: input.write_scope,
            read_scope_amendments: input.read_scope_amendments ?? [],
            depends_on_bridge_ids: input.depends_on_bridge_ids ?? [],
            predecessor_build_ids: input.predecessor_build_ids ?? [],
            dependency_type: input.dependency_type ?? "NONE",
            acceptance_criteria: input.acceptance_criteria ?? [],
            test_cases: input.test_cases ?? [],
            confidence: (0, types_1.computeConfidence)(input.confidence_breakdown),
            confidence_breakdown: input.confidence_breakdown,
            artifact_refs: input.artifact_refs,
            status: "DRAFT",
        };
        return this.registry.write("bridge", bridge);
    }
}
exports.BridgeCompiler = BridgeCompiler;
//# sourceMappingURL=bridge-compiler.js.map