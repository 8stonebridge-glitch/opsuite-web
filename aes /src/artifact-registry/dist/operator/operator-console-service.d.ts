import { GovernanceGateway } from "../governance";
import { ArtifactRegistry } from "../registry";
import type { Bridge, Build, EscalationRecord, StoredRecord, WriteBackRecord } from "../types";
export interface AttentionQueue {
    pending_escalations: StoredRecord<EscalationRecord>[];
    blocked_builds: StoredRecord<Build>[];
    verified_restricted_write_backs: StoredRecord<WriteBackRecord>[];
    stale_bridges: StoredRecord<Bridge>[];
}
export interface BuildReplay {
    build_record: StoredRecord<Build>;
    bridge_record: StoredRecord<Bridge>;
    timeline: StoredRecord[];
    snapshot_replay: StoredRecord[];
}
export interface FeatureAudit {
    feature_id: string;
    artifacts: StoredRecord[];
    builds: StoredRecord<Build>[];
    bridges: StoredRecord<Bridge>[];
    escalations: StoredRecord<EscalationRecord>[];
}
export declare class OperatorConsoleService {
    private readonly registry;
    private readonly governanceGateway;
    constructor(registry: ArtifactRegistry, options?: {
        governance_gateway?: GovernanceGateway;
    });
    attentionQueue(options?: {
        current_graph_truth_hash?: string;
    }): Promise<AttentionQueue>;
    buildReplay(buildId: string): Promise<BuildReplay>;
    featureAudit(featureId: string): Promise<FeatureAudit>;
}
//# sourceMappingURL=operator-console-service.d.ts.map