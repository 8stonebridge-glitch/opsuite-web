import { ArtifactRegistry, generateArtifactId } from "../registry";
import type {
  ArtifactRef,
  Build,
  DiffArtifact,
  MetricRecord,
  StoredRecord,
  ValidatorRun,
  WriteBackRecord,
} from "../types";

export interface CaptureMetricsOptions {
  period_start?: string;
  period_end?: string;
}

function mergeArtifactRefs(...groups: ArtifactRef[][]): ArtifactRef[] {
  const seen = new Set<string>();
  const merged: ArtifactRef[] = [];

  for (const group of groups) {
    for (const artifactRef of group) {
      const key = `${artifactRef.artifact_type}::${artifactRef.artifact_id}::${artifactRef.role}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(artifactRef);
      }
    }
  }

  return merged;
}

export class TelemetryService {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date()
  ) {}

  async captureBuildMetrics(
    buildId: string,
    options: CaptureMetricsOptions = {}
  ): Promise<StoredRecord<MetricRecord>[]> {
    const buildRecord = await this.registry.read<Build>("build", buildId);
    const buildArtifacts = await this.registry.byBuild(buildId);
    const validatorRuns = buildArtifacts.filter(
      (record): record is StoredRecord<ValidatorRun> =>
        record.artifact_type === "validator_run"
    );
    const diffArtifacts = buildArtifacts.filter(
      (record): record is StoredRecord<DiffArtifact> =>
        record.artifact_type === "diff_artifact"
    );
    const writeBackRecords = buildArtifacts.filter(
      (record): record is StoredRecord<WriteBackRecord> =>
        record.artifact_type === "write_back_record"
    );
    const latestWriteBack = [...writeBackRecords].sort(
      (left, right) => right.internal_id - left.internal_id
    )[0];
    const capturedAt = this.now().toISOString();
    const periodStart = options.period_start ?? capturedAt;
    const periodEnd = options.period_end ?? capturedAt;
    const sharedRefs = mergeArtifactRefs(buildRecord.payload.artifact_refs, [
      {
        artifact_type: "build",
        artifact_id: buildRecord.payload.build_id,
        role: "evidence_source",
      },
    ]);

    const metrics: Array<Pick<MetricRecord, "metric_name" | "metric_value" | "tags">> = [
      {
        metric_name: "validator_run_count",
        metric_value: validatorRuns.length,
        tags: { scope: "build", build_status: buildRecord.payload.status },
      },
      {
        metric_name: "validator_fail_count",
        metric_value: validatorRuns.filter((record) => record.payload.status === "FAIL")
          .length,
        tags: { scope: "build" },
      },
      {
        metric_name: "validator_concern_count",
        metric_value: validatorRuns.reduce(
          (sum, record) => sum + record.payload.concerns.length,
          0
        ),
        tags: { scope: "build" },
      },
      {
        metric_name: "diff_violation_count",
        metric_value: diffArtifacts.reduce(
          (sum, record) => sum + record.payload.path_violations.length,
          0
        ),
        tags: { scope: "build" },
      },
      {
        metric_name: "blocked_reason_count",
        metric_value: buildRecord.payload.blocked_reasons.length,
        tags: { scope: "build" },
      },
      {
        metric_name: "build_terminal_success",
        metric_value: buildRecord.payload.status === "PASSED" ? 1 : 0,
        tags: { scope: "build" },
      },
      {
        metric_name: "write_back_restricted",
        metric_value:
          latestWriteBack?.payload.write_back_status === "VERIFIED_RESTRICTED"
            ? 1
            : 0,
        tags: { scope: "build" },
      },
    ];

    return Promise.all(
      metrics.map((metric) =>
        this.registry.write("metric_record", {
          metric_record_id: generateArtifactId("metric_record"),
          build_id: buildRecord.payload.build_id,
          feature_id: buildRecord.payload.feature_id,
          period_start: periodStart,
          period_end: periodEnd,
          captured_at: capturedAt,
          metric_name: metric.metric_name,
          metric_value: metric.metric_value,
          tags: metric.tags,
          artifact_refs: sharedRefs,
        })
      )
    );
  }

  async captureFeatureMetrics(
    featureId: string,
    options: CaptureMetricsOptions = {}
  ): Promise<StoredRecord<MetricRecord>[]> {
    const artifacts = await this.registry.byFeature(featureId);
    const builds = artifacts.filter(
      (record): record is StoredRecord<Build> => record.artifact_type === "build"
    );
    const escalations = artifacts.filter(
      (record) =>
        record.artifact_type === "escalation_record" &&
        (record.payload as { decision: string | null }).decision !== "APPROVED" &&
        (record.payload as { decision: string | null }).decision !== "REJECTED"
    );
    const capturedAt = this.now().toISOString();
    const periodStart = options.period_start ?? capturedAt;
    const periodEnd = options.period_end ?? capturedAt;

    return Promise.all(
      [
        {
          metric_name: "feature_build_count",
          metric_value: builds.length,
        },
        {
          metric_name: "feature_blocked_build_count",
          metric_value: builds.filter((record) => record.payload.status === "BLOCKED")
            .length,
        },
        {
          metric_name: "feature_pending_escalation_count",
          metric_value: escalations.length,
        },
      ].map((metric) =>
        this.registry.write("metric_record", {
          metric_record_id: generateArtifactId("metric_record"),
          build_id: null,
          feature_id: featureId,
          period_start: periodStart,
          period_end: periodEnd,
          captured_at: capturedAt,
          metric_name: metric.metric_name,
          metric_value: metric.metric_value,
          tags: { scope: "feature" },
          artifact_refs: [],
        })
      )
    );
  }
}
