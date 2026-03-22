/**
 * AES UI Surface Observer Agent
 *
 * Extracts screens, user journeys, layout types, actions,
 * empty/loading/error states from feature specs.
 * Follows ui_extraction_format.md.
 */
import type { ArtifactRegistry } from "../registry/registry";
import type { ArtifactRef } from "../types/refs";
import type { FeatureSpec } from "../types/app-spec";
import type { FrontendPatterns } from "../types/research-types";
export interface UiSurfaceObservation {
    observation_id: string;
    app_id?: string;
    feature_id: string;
    source: "ui_surface_observer";
    source_type: "feature_analysis" | "research_backed";
    captured_at: string;
    extracted_by: "ui_surface_observer";
    confidence: number;
    status: "UNTRUSTED";
    domain_tags: string[];
    artifact_refs: ArtifactRef[];
    /** Screens this feature needs */
    screens: ScreenSpec[];
    /** User journeys through this feature */
    journeys: UserJourney[];
    /** UI states to handle */
    states: UiStateSpec[];
    /** Layout requirements */
    layout: LayoutSpec;
}
export interface ScreenSpec {
    screen_id: string;
    name: string;
    route?: string;
    type: "page" | "modal" | "drawer" | "panel" | "tab" | "inline";
    description: string;
    actions: ScreenAction[];
    data_requirements: string[];
}
export interface ScreenAction {
    label: string;
    type: "navigate" | "submit" | "toggle" | "delete" | "create" | "edit" | "filter" | "search";
    target?: string;
    requires_confirmation: boolean;
    destructive: boolean;
}
export interface UserJourney {
    journey_id: string;
    name: string;
    steps: JourneyStep[];
    happy_path: boolean;
}
export interface JourneyStep {
    step: number;
    screen: string;
    action: string;
    expected_result: string;
}
export interface UiStateSpec {
    state_type: "empty" | "loading" | "error" | "success" | "partial" | "readonly" | "disabled";
    screen_id: string;
    description: string;
    user_action?: string;
}
export interface LayoutSpec {
    type: "dashboard" | "list" | "detail" | "form" | "settings" | "wizard" | "split";
    navigation: "sidebar" | "tabs" | "breadcrumb" | "none";
    responsive: boolean;
}
export declare class UiSurfaceObserver {
    private readonly now;
    constructor(_registry: ArtifactRegistry, now?: () => Date);
    /**
     * Observe UI surfaces for a feature.
     * If Perplexity frontend research is available, use it as primary evidence.
     * Otherwise, fall back to inference from feature spec.
     */
    observe(feature: FeatureSpec, appId?: string, researchPatterns?: FrontendPatterns): UiSurfaceObservation;
    /**
     * Extract screens by matching Perplexity's common_screens to this feature.
     * Falls back to inference if no research matches.
     */
    private extractScreensFromResearch;
    /**
     * Extract states from research UX patterns instead of generic defaults.
     */
    private extractStatesFromResearch;
    private inferActionType;
    private extractScreens;
    private extractJourneys;
    private extractStates;
    private inferLayout;
}
//# sourceMappingURL=ui-surface-observer.d.ts.map