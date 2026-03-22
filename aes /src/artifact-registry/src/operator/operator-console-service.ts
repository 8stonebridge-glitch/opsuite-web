import { GovernanceGateway } from "../governance";
import { ArtifactRegistry } from "../registry";
import type {
  Bridge,
  Build,
  EscalationRecord,
  StoredRecord,
  WriteBackRecord,
} from "../types";

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

function sortByInternalId<T extends StoredRecord>(records: T[]): T[] {
  return [...records].sort((left, right) => left.internal_id - right.internal_id);
}

export class OperatorConsoleService {
  private readonly governanceGateway: GovernanceGateway;

  constructor(
    private readonly registry: ArtifactRegistry,
    options: {
      governance_gateway?: GovernanceGateway;
    } = {}
  ) {
    this.governanceGateway =
      options.governance_gateway ?? new GovernanceGateway(registry);
  }

  async attentionQueue(options: {
    current_graph_truth_hash?: string;
  } = {}): Promise<AttentionQueue> {
    const blockedBuilds = (
      await this.registry.latestByType<Build>("build")
    ).filter((record) => record.payload.status === "BLOCKED");

    return {
      pending_escalations: await this.governanceGateway.pendingDecisionQueue(),
      blocked_builds: sortByInternalId(blockedBuilds),
      verified_restricted_write_backs:
        await this.registry.verifiedRestrictedPendingPromotion(),
      stale_bridges: options.current_graph_truth_hash
        ? await this.registry.staleBridges(options.current_graph_truth_hash)
        : [],
    };
  }

  async buildReplay(buildId: string): Promise<BuildReplay> {
    const buildRecord = await this.registry.read<Build>("build", buildId);
    const bridgeRecord = await this.registry.read<Bridge>(
      "bridge",
      buildRecord.payload.bridge_id
    );

    return {
      build_record: buildRecord,
      bridge_record: bridgeRecord,
      timeline: sortByInternalId(await this.registry.traceEvidence(buildId)),
      snapshot_replay: await this.registry.replayBySnapshot(
        bridgeRecord.payload.graph_snapshot_id,
        bridgeRecord.payload.graph_truth_hash
      ),
    };
  }

  async featureAudit(featureId: string): Promise<FeatureAudit> {
    const artifacts = sortByInternalId(await this.registry.byFeature(featureId));

    return {
      feature_id: featureId,
      artifacts,
      builds: artifacts.filter(
        (record): record is StoredRecord<Build> => record.artifact_type === "build"
      ),
      bridges: artifacts.filter(
        (record): record is StoredRecord<Bridge> => record.artifact_type === "bridge"
      ),
      escalations: artifacts.filter(
        (record): record is StoredRecord<EscalationRecord> =>
          record.artifact_type === "escalation_record"
      ),
    };
  }
}
