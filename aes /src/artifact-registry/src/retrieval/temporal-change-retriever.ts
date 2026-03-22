/**
 * AES Temporal/Change Retrieval Agent
 *
 * Looks at historical outcomes: success rate, failure patterns,
 * stale bridges, recent regressions, changes in constraints over time.
 */

import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { Bridge, Build } from "../types/artifacts";
import type { StoredRecord } from "../types/common";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TemporalContext {
  context_id: string;
  feature_id: string;
  captured_at: string;
  source: "temporal_change_retriever";
  confidence: number;
  artifact_refs: ArtifactRef[];

  /** Build history for this feature */
  build_history: BuildHistoryEntry[];

  /** Success trend (improving, degrading, stable, unknown) */
  success_trend: "improving" | "degrading" | "stable" | "unknown";

  /** Average build duration */
  avg_duration_s: number;

  /** Number of bridge revisions */
  bridge_revision_count: number;

  /** Whether the latest bridge is stale */
  bridge_stale: boolean;

  /** Recent regressions */
  regressions: Regression[];

  /** Constraint changes over time */
  constraint_changes: ConstraintChange[];

  /** Time since last successful build */
  time_since_last_success_hours: number | null;
}

export interface BuildHistoryEntry {
  build_id: string;
  status: string;
  tests_passed: number;
  tests_failed: number;
  built_at: string;
  duration_s: number;
}

export interface Regression {
  description: string;
  detected_at: string;
  severity: "low" | "medium" | "high";
  affected_build_id: string;
}

export interface ConstraintChange {
  description: string;
  changed_at: string;
  bridge_id: string;
  type: "added" | "removed" | "modified";
}

// ─── Retriever ───────────────────────────────────────────────────────────────

export class TemporalChangeRetriever {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async retrieve(featureId: string): Promise<TemporalContext> {
    const builds = await this.registry.latestByType<Build>("build");
    const bridges = await this.registry.latestByType<Bridge>("bridge");

    // Filter to this feature
    const featureBuilds = builds
      .filter(b => b.payload.feature_id === featureId)
      .sort((a, b) => (a.payload.queued_at || "").localeCompare(b.payload.queued_at || ""));

    const featureBridges = bridges
      .filter(b => b.payload.feature_id === featureId);

    const buildHistory = featureBuilds.map(b => ({
      build_id: b.payload.build_id,
      status: b.payload.status,
      tests_passed: 0,
      tests_failed: 0,
      built_at: b.payload.queued_at || b.written_at,
      duration_s: this.calcDuration(b.payload.started_at ?? undefined, b.payload.ended_at ?? undefined),
    }));

    const successTrend = this.calcTrend(featureBuilds);
    const avgDuration = buildHistory.length > 0
      ? buildHistory.reduce((s, b) => s + b.duration_s, 0) / buildHistory.length
      : 0;

    const regressions = this.detectRegressions(featureBuilds);
    const constraintChanges = this.detectConstraintChanges(featureBridges);

    const lastSuccess = featureBuilds
      .reverse()
      .find(b => b.payload.status === "PASSED");
    const timeSinceLastSuccess = lastSuccess
      ? (this.now().getTime() - new Date(lastSuccess.payload.ended_at || lastSuccess.written_at).getTime()) / 3600000
      : null;

    return {
      context_id: `TEMPORAL-${Date.now()}-${featureId}`,
      feature_id: featureId,
      captured_at: this.now().toISOString(),
      source: "temporal_change_retriever",
      confidence: featureBuilds.length > 3 ? 0.85 : featureBuilds.length > 0 ? 0.5 : 0.2,
      artifact_refs: [],
      build_history: buildHistory,
      success_trend: successTrend,
      avg_duration_s: Math.round(avgDuration),
      bridge_revision_count: featureBridges.length,
      bridge_stale: false,
      regressions,
      constraint_changes: constraintChanges,
      time_since_last_success_hours: timeSinceLastSuccess ? Math.round(timeSinceLastSuccess) : null,
    };
  }

  private calcDuration(start?: string, end?: string): number {
    if (!start || !end) return 0;
    return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  }

  private calcTrend(builds: StoredRecord<Build>[]): TemporalContext["success_trend"] {
    if (builds.length < 3) return "unknown";

    const recent = builds.slice(-3);
    const older = builds.slice(-6, -3);

    if (older.length === 0) return "unknown";

    const recentRate = recent.filter(b => b.payload.status === "PASSED").length / recent.length;
    const olderRate = older.filter(b => b.payload.status === "PASSED").length / older.length;

    if (recentRate > olderRate + 0.1) return "improving";
    if (recentRate < olderRate - 0.1) return "degrading";
    return "stable";
  }

  private detectRegressions(builds: StoredRecord<Build>[]): Regression[] {
    const regressions: Regression[] = [];

    for (let i = 1; i < builds.length; i++) {
      const prev = builds[i - 1]!;
      const curr = builds[i]!;

      if (prev.payload.status === "PASSED" && curr.payload.status === "FAILED") {
        regressions.push({
          description: `Build ${curr.payload.build_id} failed after ${prev.payload.build_id} passed`,
          detected_at: curr.written_at,
          severity: "high",
          affected_build_id: curr.payload.build_id,
        });
      }
    }

    return regressions;
  }

  private detectConstraintChanges(bridges: StoredRecord<Bridge>[]): ConstraintChange[] {
    const changes: ConstraintChange[] = [];

    for (let i = 1; i < bridges.length; i++) {
      const prev = bridges[i - 1]!;
      const curr = bridges[i]!;

      const prevConstraints = new Set(prev.payload.constraints || []);
      const currConstraints = new Set(curr.payload.constraints || []);

      for (const c of currConstraints) {
        if (!prevConstraints.has(c)) {
          changes.push({
            description: `Added constraint: ${c}`,
            changed_at: curr.written_at,
            bridge_id: curr.payload.bridge_id,
            type: "added",
          });
        }
      }

      for (const c of prevConstraints) {
        if (!currConstraints.has(c)) {
          changes.push({
            description: `Removed constraint: ${c}`,
            changed_at: curr.written_at,
            bridge_id: curr.payload.bridge_id,
            type: "removed",
          });
        }
      }
    }

    return changes;
  }
}
