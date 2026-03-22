"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperatorConsoleService = void 0;
const governance_1 = require("../governance");
function sortByInternalId(records) {
    return [...records].sort((left, right) => left.internal_id - right.internal_id);
}
class OperatorConsoleService {
    constructor(registry, options = {}) {
        this.registry = registry;
        this.governanceGateway =
            options.governance_gateway ?? new governance_1.GovernanceGateway(registry);
    }
    async attentionQueue(options = {}) {
        const blockedBuilds = (await this.registry.latestByType("build")).filter((record) => record.payload.status === "BLOCKED");
        return {
            pending_escalations: await this.governanceGateway.pendingDecisionQueue(),
            blocked_builds: sortByInternalId(blockedBuilds),
            verified_restricted_write_backs: await this.registry.verifiedRestrictedPendingPromotion(),
            stale_bridges: options.current_graph_truth_hash
                ? await this.registry.staleBridges(options.current_graph_truth_hash)
                : [],
        };
    }
    async buildReplay(buildId) {
        const buildRecord = await this.registry.read("build", buildId);
        const bridgeRecord = await this.registry.read("bridge", buildRecord.payload.bridge_id);
        return {
            build_record: buildRecord,
            bridge_record: bridgeRecord,
            timeline: sortByInternalId(await this.registry.traceEvidence(buildId)),
            snapshot_replay: await this.registry.replayBySnapshot(bridgeRecord.payload.graph_snapshot_id, bridgeRecord.payload.graph_truth_hash),
        };
    }
    async featureAudit(featureId) {
        const artifacts = sortByInternalId(await this.registry.byFeature(featureId));
        return {
            feature_id: featureId,
            artifacts,
            builds: artifacts.filter((record) => record.artifact_type === "build"),
            bridges: artifacts.filter((record) => record.artifact_type === "bridge"),
            escalations: artifacts.filter((record) => record.artifact_type === "escalation_record"),
        };
    }
}
exports.OperatorConsoleService = OperatorConsoleService;
//# sourceMappingURL=operator-console-service.js.map