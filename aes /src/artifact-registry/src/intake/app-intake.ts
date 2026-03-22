/**
 * AES Intake — App Intake Service
 *
 * Accepts plain-English app descriptions and creates AppSpec artifacts in DRAFT status.
 * Pattern follows: request-intake.ts
 */

import { ArtifactRegistry, generateArtifactId } from "../registry";
import type { AppPromotionStatus, AppSpec } from "../types/app-spec";
import type { StoredRecord } from "../types";

export interface AppIntakeInput {
  description: string;
  requested_by: string;
  name?: string;
  product_type?: string;
  target_users?: string[];
}

export class InvalidAppTransitionError extends Error {
  constructor(
    appId: string,
    from: AppPromotionStatus,
    to: AppPromotionStatus,
  ) {
    super(`Invalid app transition for ${appId}: ${from} -> ${to}`);
    this.name = "InvalidAppTransitionError";
  }
}

const ALLOWED_APP_TRANSITIONS: Record<
  AppPromotionStatus,
  Set<AppPromotionStatus>
> = {
  DRAFT: new Set(["CANDIDATE", "REJECTED"]),
  CANDIDATE: new Set(["VERIFIED", "REJECTED", "BLOCKED"]),
  VERIFIED: new Set(["PROMOTED", "REJECTED", "BLOCKED"]),
  PROMOTED: new Set([]),
  REJECTED: new Set(["DRAFT"]), // allow retry
  BLOCKED: new Set(["CANDIDATE"]), // allow unblock
};

export class AppIntakeService {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async submitApp(input: AppIntakeInput): Promise<StoredRecord<AppSpec>> {
    const now = this.now().toISOString();
    const app: AppSpec = {
      app_id: generateArtifactId("app_spec"),
      name: input.name?.trim() || deriveAppName(input.description),
      summary: input.description.trim(),
      product_type: input.product_type?.trim() || "general",
      target_users: input.target_users ?? [],
      roles: [],
      core_jobs_to_be_done: [],
      global_constraints: [],
      shared_backend_surfaces: [],
      shared_frontend_surfaces: [],
      feature_ids: [],
      open_questions: [],
      evidence_summary: {
        sources: [],
        research_note_ids: [],
        total_evidence_count: 0,
      },
      confidence_summary: {
        decomposition_confidence: 0,
        research_coverage: 0,
        verification_score: 0,
        overall: 0,
      },
      promotion_status: "DRAFT",
      created_at: now,
      updated_at: now,
    };

    return this.registry.write("app_spec", app);
  }

  async getApp(appId: string): Promise<StoredRecord<AppSpec>> {
    return this.registry.read<AppSpec>("app_spec", appId);
  }

  async updateAppStatus(
    appId: string,
    status: AppPromotionStatus,
  ): Promise<StoredRecord<AppSpec>> {
    const current = await this.registry.read<AppSpec>("app_spec", appId);
    const currentStatus = current.payload.promotion_status;

    if (!ALLOWED_APP_TRANSITIONS[currentStatus].has(status)) {
      throw new InvalidAppTransitionError(appId, currentStatus, status);
    }

    return this.registry.write("app_spec", {
      ...current.payload,
      promotion_status: status,
      updated_at: this.now().toISOString(),
    });
  }

  async updateApp(
    appId: string,
    updates: Partial<
      Pick<
        AppSpec,
        | "name"
        | "roles"
        | "core_jobs_to_be_done"
        | "global_constraints"
        | "shared_backend_surfaces"
        | "shared_frontend_surfaces"
        | "feature_ids"
        | "open_questions"
        | "evidence_summary"
        | "confidence_summary"
      >
    >,
  ): Promise<StoredRecord<AppSpec>> {
    const current = await this.registry.read<AppSpec>("app_spec", appId);
    return this.registry.write("app_spec", {
      ...current.payload,
      ...updates,
      updated_at: this.now().toISOString(),
    });
  }
}

function deriveAppName(description: string): string {
  const words = description.trim().split(/\s+/).slice(0, 5);
  return words.join(" ");
}
