/**
 * AES Planning — Spec Verifier
 *
 * Processes verification results (from Gemini or another independent reviewer)
 * into a structured VerificationReport. Stores the verification as a ResearchNote.
 *
 * The actual Gemini call happens at the HTTP layer.
 * This service receives the structured or raw result and normalizes it.
 */

import type { ArtifactRegistry } from "../registry";
import type { HttpResearchGateway } from "../research/research-gateway";
import type { AppSpec, FeatureSpec } from "../types/app-spec";
import type { VerificationReport } from "../types/promotion-types";
import type { ResearchNote, StoredRecord } from "../types";

// ─── Input / Output ────────────────────────────────────────────────────────────

export interface VerifySpecInput {
  app: AppSpec;
  features: FeatureSpec[];
  /** Verification content from Gemini (JSON or prose) */
  verification_content: string;
  /** Source identifier */
  source?: string;
}

export interface VerifySpecResult {
  report: VerificationReport;
  research_note: StoredRecord<ResearchNote>;
}

// ─── Verifier ──────────────────────────────────────────────────────────────────

export class SpecVerifier {
  constructor(
    readonly registry: ArtifactRegistry,
    private readonly researchGateway: HttpResearchGateway,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async verify(input: VerifySpecInput): Promise<VerifySpecResult> {
    const report = this.buildReport(
      input.app.app_id,
      input.verification_content,
      input.features,
    );

    // Store the verification as a FILTERED research note (it passed through a reviewer)
    const note = await this.researchGateway.recordNote({
      feature_id: input.app.app_id,
      source: input.source ?? "gemini-verification",
      content: input.verification_content,
      trust_status: "FILTERED",
      filtered_by: input.source ?? "gemini",
    });

    return {
      report,
      research_note: note,
    };
  }

  buildReport(
    appId: string,
    rawVerification: string,
    features: FeatureSpec[],
  ): VerificationReport {
    const nowStr = this.now().toISOString();

    // Try to parse as structured JSON first
    try {
      const parsed = JSON.parse(rawVerification);
      return normalizeReport(appId, parsed, features, nowStr);
    } catch {
      // Fall back to heuristic extraction from prose
      return buildReportFromProse(appId, rawVerification, features, nowStr);
    }
  }
}

// ─── Report Normalization ──────────────────────────────────────────────────────

function normalizeReport(
  appId: string,
  parsed: Record<string, unknown>,
  features: FeatureSpec[],
  nowStr: string,
): VerificationReport {
  const backendCount = features.reduce(
    (sum, f) => sum + f.backend_surfaces.length,
    0,
  );
  const frontendCount = features.reduce(
    (sum, f) => sum + f.frontend_surfaces.length,
    0,
  );
  const total = backendCount + frontendCount || 1;

  return {
    verification_id: generateVerificationId(),
    app_id: appId,
    verified_at: nowStr,
    completeness_score: toNumber(parsed.completeness_score, 0.5),
    missing_flows: toStringArray(parsed.missing_flows),
    dependency_issues: toStringArray(parsed.dependency_issues),
    backend_frontend_balance: {
      backend_coverage: backendCount / total,
      frontend_coverage: frontendCount / total,
      gaps: toStringArray(
        (parsed.backend_frontend_balance as Record<string, unknown>)?.gaps,
      ),
    },
    contradictions: toStringArray(parsed.contradictions),
    overall_score: toNumber(parsed.overall_score, 0.5),
    recommendation: toRecommendation(parsed.recommendation),
    notes: toStringArray(parsed.notes),
  };
}

function buildReportFromProse(
  appId: string,
  prose: string,
  features: FeatureSpec[],
  nowStr: string,
): VerificationReport {
  const lower = prose.toLowerCase();
  const backendCount = features.reduce(
    (sum, f) => sum + f.backend_surfaces.length,
    0,
  );
  const frontendCount = features.reduce(
    (sum, f) => sum + f.frontend_surfaces.length,
    0,
  );
  const total = backendCount + frontendCount || 1;

  // Heuristic recommendation
  let recommendation: VerificationReport["recommendation"] = "NEEDS_WORK";
  if (
    lower.includes("approve") ||
    lower.includes("looks good") ||
    lower.includes("complete")
  ) {
    recommendation = "APPROVE";
  } else if (
    lower.includes("reject") ||
    lower.includes("not ready") ||
    lower.includes("major gaps")
  ) {
    recommendation = "REJECT";
  }

  // Heuristic score
  let score = 0.5;
  if (recommendation === "APPROVE") score = 0.8;
  if (recommendation === "REJECT") score = 0.3;

  return {
    verification_id: generateVerificationId(),
    app_id: appId,
    verified_at: nowStr,
    completeness_score: score,
    missing_flows: [],
    dependency_issues: [],
    backend_frontend_balance: {
      backend_coverage: backendCount / total,
      frontend_coverage: frontendCount / total,
      gaps: [],
    },
    contradictions: [],
    overall_score: score,
    recommendation,
    notes: [prose.slice(0, 500)],
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

let verifyCounter = 0;
function generateVerificationId(): string {
  const ts = Date.now().toString(36);
  const seq = (++verifyCounter).toString(36).padStart(4, "0");
  return `VRPT-${ts}-${seq}`;
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  return fallback;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  return [];
}

function toRecommendation(
  value: unknown,
): VerificationReport["recommendation"] {
  if (value === "APPROVE" || value === "NEEDS_WORK" || value === "REJECT") {
    return value;
  }
  return "NEEDS_WORK";
}
