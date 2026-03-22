"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryService = void 0;
const registry_1 = require("../registry");
function mergeArtifactRefs(...groups) {
    const seen = new Set();
    const merged = [];
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
class TelemetryService {
    constructor(registry, now = () => new Date()) {
        this.registry = registry;
        this.now = now;
    }
    async captureBuildMetrics(buildId, options = {}) {
        const buildRecord = await this.registry.read("build", buildId);
        const buildArtifacts = await this.registry.byBuild(buildId);
        const validatorRuns = buildArtifacts.filter((record) => record.artifact_type === "validator_run");
        const diffArtifacts = buildArtifacts.filter((record) => record.artifact_type === "diff_artifact");
        const writeBackRecords = buildArtifacts.filter((record) => record.artifact_type === "write_back_record");
        const latestWriteBack = [...writeBackRecords].sort((left, right) => right.internal_id - left.internal_id)[0];
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
        const metrics = [
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
                metric_value: validatorRuns.reduce((sum, record) => sum + record.payload.concerns.length, 0),
                tags: { scope: "build" },
            },
            {
                metric_name: "diff_violation_count",
                metric_value: diffArtifacts.reduce((sum, record) => sum + record.payload.path_violations.length, 0),
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
                metric_value: latestWriteBack?.payload.write_back_status === "VERIFIED_RESTRICTED"
                    ? 1
                    : 0,
                tags: { scope: "build" },
            },
        ];
        return Promise.all(metrics.map((metric) => this.registry.write("metric_record", {
            metric_record_id: (0, registry_1.generateArtifactId)("metric_record"),
            build_id: buildRecord.payload.build_id,
            feature_id: buildRecord.payload.feature_id,
            period_start: periodStart,
            period_end: periodEnd,
            captured_at: capturedAt,
            metric_name: metric.metric_name,
            metric_value: metric.metric_value,
            tags: metric.tags,
            artifact_refs: sharedRefs,
        })));
    }
    async captureFeatureMetrics(featureId, options = {}) {
        const artifacts = await this.registry.byFeature(featureId);
        const builds = artifacts.filter((record) => record.artifact_type === "build");
        const escalations = artifacts.filter((record) => record.artifact_type === "escalation_record" &&
            record.payload.decision !== "APPROVED" &&
            record.payload.decision !== "REJECTED");
        const capturedAt = this.now().toISOString();
        const periodStart = options.period_start ?? capturedAt;
        const periodEnd = options.period_end ?? capturedAt;
        return Promise.all([
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
        ].map((metric) => this.registry.write("metric_record", {
            metric_record_id: (0, registry_1.generateArtifactId)("metric_record"),
            build_id: null,
            feature_id: featureId,
            period_start: periodStart,
            period_end: periodEnd,
            captured_at: capturedAt,
            metric_name: metric.metric_name,
            metric_value: metric.metric_value,
            tags: { scope: "feature" },
            artifact_refs: [],
        })));
    }
}
exports.TelemetryService = TelemetryService;
//# sourceMappingURL=telemetry-service.js.map