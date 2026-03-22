import { ArtifactRegistry } from "../registry";
import type { MetricRecord, StoredRecord } from "../types";
export interface CaptureMetricsOptions {
    period_start?: string;
    period_end?: string;
}
export declare class TelemetryService {
    private readonly registry;
    private readonly now;
    constructor(registry: ArtifactRegistry, now?: () => Date);
    captureBuildMetrics(buildId: string, options?: CaptureMetricsOptions): Promise<StoredRecord<MetricRecord>[]>;
    captureFeatureMetrics(featureId: string, options?: CaptureMetricsOptions): Promise<StoredRecord<MetricRecord>[]>;
}
//# sourceMappingURL=telemetry-service.d.ts.map