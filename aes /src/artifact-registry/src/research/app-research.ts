/**
 * AES Research — App Research Service
 *
 * Stores research findings about comparable products, frontend UX patterns,
 * backend architecture, security, pitfalls, and operator manual steps as
 * ResearchNote artifacts.
 *
 * The actual Perplexity/external call happens at the HTTP layer.
 * This service receives the content and stores it with proper trust gating.
 *
 * Pattern follows: research-gateway.ts
 */

import type { ArtifactRegistry } from "../registry";
import type { HttpResearchGateway } from "./research-gateway";
import type { ResearchNote, StoredRecord } from "../types";
import type {
  StructuredResearchSummary,
  FrontendPatterns,
  BackendArchitecture,
  SecurityResearch,
  PitfallResearch,
  OperatorManualSteps,
  ScreenPattern,
  OnboardingStep,
  UXState,
  StackIntegrationGuide,
  PlainStep,
  SecurityItem,
  Pitfall,
  ManualStep,
} from "../types/research-types";
import {
  EMPTY_STRUCTURED_RESEARCH,
  EMPTY_FRONTEND_PATTERNS,
  EMPTY_BACKEND_ARCHITECTURE,
  EMPTY_SECURITY_RESEARCH,
  EMPTY_PITFALL_RESEARCH,
  EMPTY_OPERATOR_MANUAL_STEPS,
} from "../types/research-types";

// Re-export for downstream consumers
export type { StructuredResearchSummary } from "../types/research-types";

export interface AppResearchInput {
  app_id: string;
  app_summary: string;
  product_type?: string;
  target_users?: string[];
  /** Research content provided by caller (from Perplexity or other source) */
  research_content: string;
  /** Source identifier (e.g. "perplexity", "manual", "gemini") */
  source: string;
}

export interface AppResearchResult {
  research_notes: StoredRecord<ResearchNote>[];
  structured_summary: StructuredResearchSummary;
}

export class AppResearchService {
  constructor(
    readonly registry: ArtifactRegistry,
    private readonly researchGateway: HttpResearchGateway,
    readonly now: () => Date = () => new Date(),
  ) {}

  async research(input: AppResearchInput): Promise<AppResearchResult> {
    // Store the research content as an UNTRUSTED research note
    // Feature ID is the app_id since this is app-level research
    const note = await this.researchGateway.recordNote({
      feature_id: input.app_id,
      source: input.source,
      content: input.research_content,
      trust_status: "UNTRUSTED",
    });

    // Parse structured summary from research content
    const structured = parseResearchSummary(input.research_content);

    return {
      research_notes: [note],
      structured_summary: structured,
    };
  }

  async addResearchNote(
    appId: string,
    source: string,
    content: string,
  ): Promise<StoredRecord<ResearchNote>> {
    return this.researchGateway.recordNote({
      feature_id: appId,
      source,
      content,
      trust_status: "UNTRUSTED",
    });
  }
}

// ─── Parser ──────────────────────────────────────────────────────────────────

/**
 * Best-effort extraction of structured research summary from raw content.
 * If the content is already JSON with the expected shape, parse it.
 * Otherwise return empty defaults (the caller/decomposer handles raw text).
 */
export function parseResearchSummary(content: string): StructuredResearchSummary {
  try {
    const parsed = JSON.parse(content);
    return normalizeResearchSummary(parsed);
  } catch {
    return { ...EMPTY_STRUCTURED_RESEARCH };
  }
}

/**
 * Normalize a parsed JSON object into a full StructuredResearchSummary,
 * applying safe defaults for every missing field.
 */
function normalizeResearchSummary(
  parsed: Record<string, unknown>,
): StructuredResearchSummary {
  return {
    // ── Market intelligence (existing fields) ──
    comparable_products: toStringArray(parsed.comparable_products),
    common_features: toStringArray(parsed.common_features),
    differentiation_opportunities: toStringArray(parsed.differentiation_opportunities),
    technical_patterns: toStringArray(parsed.technical_patterns),
    risk_areas: toStringArray(parsed.risk_areas),

    // ── Expanded domains ──
    frontend_patterns: normalizeFrontendPatterns(parsed.frontend_patterns),
    backend_architecture: normalizeBackendArchitecture(parsed.backend_architecture),
    security: normalizeSecurityResearch(parsed.security),
    pitfalls: normalizePitfallResearch(parsed.pitfalls),
    operator_manual_steps: normalizeOperatorManualSteps(parsed.operator_manual_steps),
  };
}

// ─── Frontend Patterns ───────────────────────────────────────────────────────

function normalizeFrontendPatterns(raw: unknown): FrontendPatterns {
  if (!raw || typeof raw !== "object") return { ...EMPTY_FRONTEND_PATTERNS };
  const obj = raw as Record<string, unknown>;
  return {
    common_screens: toTypedArray(obj.common_screens, normalizeScreenPattern),
    navigation_patterns: toStringArray(obj.navigation_patterns),
    action_placement: toStringArray(obj.action_placement),
    dashboard_layouts: toStringArray(obj.dashboard_layouts),
    onboarding_flows: toTypedArray(obj.onboarding_flows, normalizeOnboardingStep),
    empty_loading_error_states: toTypedArray(obj.empty_loading_error_states, normalizeUXState),
    notification_ux: toStringArray(obj.notification_ux),
    information_hierarchy: toStringArray(obj.information_hierarchy),
    visual_direction: toStringArray(obj.visual_direction),
  };
}

function normalizeScreenPattern(raw: unknown): ScreenPattern | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.screen_name !== "string") return null;
  return {
    screen_name: obj.screen_name,
    purpose: toString(obj.purpose),
    common_sections: toStringArray(obj.common_sections),
    typical_actions: toStringArray(obj.typical_actions),
  };
}

function normalizeOnboardingStep(raw: unknown): OnboardingStep | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return {
    step_number: toNumber(obj.step_number, 0),
    screen_name: toString(obj.screen_name),
    what_user_does: toString(obj.what_user_does),
    why_it_matters: toString(obj.why_it_matters),
  };
}

function normalizeUXState(raw: unknown): UXState | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const validTypes = ["empty", "loading", "error", "partial", "success"];
  const stateType = validTypes.includes(obj.state_type as string)
    ? (obj.state_type as UXState["state_type"])
    : "empty";
  return {
    state_type: stateType,
    screen: toString(obj.screen),
    what_to_show: toString(obj.what_to_show),
    what_not_to_do: toString(obj.what_not_to_do),
  };
}

// ─── Backend Architecture ────────────────────────────────────────────────────

function normalizeBackendArchitecture(raw: unknown): BackendArchitecture {
  if (!raw || typeof raw !== "object") return { ...EMPTY_BACKEND_ARCHITECTURE };
  const obj = raw as Record<string, unknown>;
  return {
    recommended_patterns: toStringArray(obj.recommended_patterns),
    data_model_patterns: toStringArray(obj.data_model_patterns),
    api_design_patterns: toStringArray(obj.api_design_patterns),
    scaling_considerations: toStringArray(obj.scaling_considerations),
    stack_guides: toTypedArray(obj.stack_guides, normalizeStackGuide),
  };
}

function normalizeStackGuide(raw: unknown): StackIntegrationGuide | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.stack !== "string") return null;
  return {
    stack: obj.stack,
    role: toString(obj.role),
    integration_steps: toTypedArray(obj.integration_steps, normalizePlainStep),
    pitfalls: toTypedArray(obj.pitfalls, normalizePitfall),
    verified: obj.verified === true,
  };
}

function normalizePlainStep(raw: unknown): PlainStep | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  return {
    step_number: toNumber(obj.step_number, 0),
    do_this: toString(obj.do_this),
    why: toString(obj.why),
    if_stuck: toString(obj.if_stuck),
  };
}

// ─── Security Research ───────────────────────────────────────────────────────

function normalizeSecurityResearch(raw: unknown): SecurityResearch {
  if (!raw || typeof raw !== "object") return { ...EMPTY_SECURITY_RESEARCH };
  const obj = raw as Record<string, unknown>;
  return {
    frontend_security: toTypedArray(obj.frontend_security, normalizeSecurityItem),
    backend_security: toTypedArray(obj.backend_security, normalizeSecurityItem),
    auth_pitfalls: toTypedArray(obj.auth_pitfalls, normalizeSecurityItem),
    data_exposure_risks: toTypedArray(obj.data_exposure_risks, normalizeSecurityItem),
    common_cve_patterns: toStringArray(obj.common_cve_patterns),
    compliance_notes: toStringArray(obj.compliance_notes),
  };
}

function normalizeSecurityItem(raw: unknown): SecurityItem | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.threat !== "string") return null;
  const validSeverities = ["critical", "high", "medium", "low"];
  const severity = validSeverities.includes(obj.severity as string)
    ? (obj.severity as SecurityItem["severity"])
    : "medium";
  return {
    threat: obj.threat,
    severity,
    what_goes_wrong: toString(obj.what_goes_wrong),
    what_to_do_instead: toString(obj.what_to_do_instead),
    applies_to: toString(obj.applies_to),
  };
}

// ─── Pitfall Research ────────────────────────────────────────────────────────

function normalizePitfallResearch(raw: unknown): PitfallResearch {
  if (!raw || typeof raw !== "object") return { ...EMPTY_PITFALL_RESEARCH };
  const obj = raw as Record<string, unknown>;
  return {
    frontend_pitfalls: toTypedArray(obj.frontend_pitfalls, normalizePitfall),
    backend_pitfalls: toTypedArray(obj.backend_pitfalls, normalizePitfall),
    deployment_pitfalls: toTypedArray(obj.deployment_pitfalls, normalizePitfall),
    integration_pitfalls: toTypedArray(obj.integration_pitfalls, normalizePitfall),
    data_pitfalls: toTypedArray(obj.data_pitfalls, normalizePitfall),
  };
}

function normalizePitfall(raw: unknown): Pitfall | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.mistake !== "string") return null;
  const validFixers = ["claude", "operator", "either"];
  const whoFixesIt = validFixers.includes(obj.who_fixes_it as string)
    ? (obj.who_fixes_it as Pitfall["who_fixes_it"])
    : "either";
  return {
    mistake: obj.mistake,
    consequence: toString(obj.consequence),
    how_to_avoid: toString(obj.how_to_avoid),
    who_fixes_it: whoFixesIt,
  };
}

// ─── Operator Manual Steps ───────────────────────────────────────────────────

function normalizeOperatorManualSteps(raw: unknown): OperatorManualSteps {
  if (!raw || typeof raw !== "object") return { ...EMPTY_OPERATOR_MANUAL_STEPS };
  const obj = raw as Record<string, unknown>;
  return {
    account_setup: toTypedArray(obj.account_setup, normalizeManualStep),
    env_configuration: toTypedArray(obj.env_configuration, normalizeManualStep),
    dns_and_domains: toTypedArray(obj.dns_and_domains, normalizeManualStep),
    third_party_dashboards: toTypedArray(obj.third_party_dashboards, normalizeManualStep),
    compliance_steps: toTypedArray(obj.compliance_steps, normalizeManualStep),
    monitoring_setup: toTypedArray(obj.monitoring_setup, normalizeManualStep),
    deployment_steps: toTypedArray(obj.deployment_steps, normalizeManualStep),
  };
}

function normalizeManualStep(raw: unknown): ManualStep | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.title !== "string") return null;
  return {
    step_number: toNumber(obj.step_number, 0),
    title: obj.title,
    why: toString(obj.why),
    what_to_do: toString(obj.what_to_do),
    where_to_go: toString(obj.where_to_go),
    what_to_copy_back: toString(obj.what_to_copy_back),
    estimated_time: toString(obj.estimated_time),
    ...(typeof obj.screenshot_hint === "string"
      ? { screenshot_hint: obj.screenshot_hint }
      : {}),
  };
}

// ─── Generic Helpers ─────────────────────────────────────────────────────────

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  return [];
}

function toString(value: unknown): string {
  if (typeof value === "string") return value;
  return "";
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  return fallback;
}

/**
 * Parse an array of objects through a normalizer function,
 * dropping any entries that return null (invalid shape).
 */
function toTypedArray<T>(
  value: unknown,
  normalizer: (item: unknown) => T | null,
): T[] {
  if (!Array.isArray(value)) return [];
  const results: T[] = [];
  for (const item of value) {
    const normalized = normalizer(item);
    if (normalized !== null) results.push(normalized);
  }
  return results;
}
