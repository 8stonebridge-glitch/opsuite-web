/**
 * AES UI Surface Observer Agent
 *
 * Extracts screens, user journeys, layout types, actions,
 * empty/loading/error states from feature specs.
 * Follows ui_extraction_format.md.
 */

import type { ArtifactRegistry } from "../../registry/registry";
import type { ArtifactRef } from "../../types/refs";
import type { FeatureSpec } from "../../types/app-spec";
import type { FrontendPatterns } from "../../types/research-types";

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Observer ────────────────────────────────────────────────────────────────

export class UiSurfaceObserver {
  constructor(
    _registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Observe UI surfaces for a feature.
   * If Perplexity frontend research is available, use it as primary evidence.
   * Otherwise, fall back to inference from feature spec.
   */
  observe(
    feature: FeatureSpec,
    appId?: string,
    researchPatterns?: FrontendPatterns,
  ): UiSurfaceObservation {
    // If research patterns exist, use them as primary source
    const screens = researchPatterns
      ? this.extractScreensFromResearch(feature, researchPatterns)
      : this.extractScreens(feature);

    const states = researchPatterns
      ? this.extractStatesFromResearch(screens, researchPatterns)
      : this.extractStates(screens);

    const journeys = this.extractJourneys(feature, screens);
    const layout = this.inferLayout(feature, screens);

    // Confidence is higher when backed by research
    const hasResearch = researchPatterns && researchPatterns.common_screens.length > 0;
    const hasFrontendSurface = feature.frontend_surfaces?.length > 0;
    const confidence = hasResearch ? 0.85 : hasFrontendSurface ? 0.75 : 0.4;

    return {
      observation_id: `OBS-UI-${Date.now()}-${feature.feature_id}`,
      app_id: appId,
      feature_id: feature.feature_id,
      source: "ui_surface_observer",
      source_type: hasResearch ? "research_backed" : "feature_analysis",
      captured_at: this.now().toISOString(),
      extracted_by: "ui_surface_observer",
      confidence,
      status: "UNTRUSTED",
      domain_tags: ["ui", "frontend", "ux"],
      artifact_refs: [],
      screens,
      journeys,
      states,
      layout,
    };
  }

  // ─── Research-Backed Extraction ──────────────────────────────────────────

  /**
   * Extract screens by matching Perplexity's common_screens to this feature.
   * Falls back to inference if no research matches.
   */
  private extractScreensFromResearch(
    feature: FeatureSpec,
    research: FrontendPatterns,
  ): ScreenSpec[] {
    const featureName = feature.name?.toLowerCase() || "";
    const featureDesc = ((feature as any).description || "").toLowerCase();
    const screens: ScreenSpec[] = [];

    // Match research screens to this feature
    for (const screen of research.common_screens) {
      const screenName = screen.screen_name.toLowerCase();
      const screenPurpose = screen.purpose.toLowerCase();

      const matches =
        featureName.includes(screenName) ||
        screenName.includes(featureName) ||
        featureDesc.includes(screenName) ||
        screenPurpose.includes(featureName);

      if (matches) {
        screens.push({
          screen_id: `screen-${screen.screen_name.replace(/\s+/g, "-").toLowerCase()}`,
          name: screen.screen_name,
          type: "page",
          description: screen.purpose,
          actions: screen.typical_actions.map(action => ({
            label: action,
            type: this.inferActionType(action),
            requires_confirmation: action.toLowerCase().includes("delete"),
            destructive: action.toLowerCase().includes("delete") || action.toLowerCase().includes("remove"),
          })),
          data_requirements: screen.common_sections,
        });
      }
    }

    // Apply navigation patterns from research
    if (screens.length > 0 && research.navigation_patterns.length > 0) {
      // Tag screens with navigation context
      for (const screen of screens) {
        screen.description += ` | Navigation: ${research.navigation_patterns.join(", ")}`;
      }
    }

    // Apply action placement from research
    if (screens.length > 0 && research.action_placement.length > 0) {
      for (const screen of screens) {
        screen.description += ` | Action placement: ${research.action_placement.join(", ")}`;
      }
    }

    // If no research screens matched, fall back to inference
    if (screens.length === 0) {
      return this.extractScreens(feature);
    }

    return screens;
  }

  /**
   * Extract states from research UX patterns instead of generic defaults.
   */
  private extractStatesFromResearch(
    screens: ScreenSpec[],
    research: FrontendPatterns,
  ): UiStateSpec[] {
    const states: UiStateSpec[] = [];

    for (const screen of screens) {
      const screenName = screen.name.toLowerCase();

      // Find matching research UX states
      let hasResearchStates = false;
      for (const uxState of research.empty_loading_error_states) {
        const stateScreen = uxState.screen.toLowerCase();
        if (stateScreen.includes(screenName) || screenName.includes(stateScreen)) {
          states.push({
            state_type: uxState.state_type,
            screen_id: screen.screen_id,
            description: `${uxState.what_to_show} (avoid: ${uxState.what_not_to_do})`,
            user_action: uxState.state_type === "empty" ? "Create first item" : undefined,
          });
          hasResearchStates = true;
        }
      }

      // If no research states matched, add generic ones
      if (!hasResearchStates) {
        states.push(
          { state_type: "loading", screen_id: screen.screen_id, description: `Loading state for ${screen.name}` },
          { state_type: "empty", screen_id: screen.screen_id, description: `No data state for ${screen.name}`, user_action: "Create first item" },
          { state_type: "error", screen_id: screen.screen_id, description: `Error state for ${screen.name}`, user_action: "Retry or go back" },
        );
      }
    }

    // Add onboarding states if research has onboarding flows
    if (research.onboarding_flows.length > 0) {
      states.push({
        state_type: "empty",
        screen_id: "onboarding",
        description: `Onboarding: ${research.onboarding_flows.map(s => s.what_user_does).join(" → ")}`,
        user_action: "Complete onboarding",
      });
    }

    return states;
  }

  private inferActionType(action: string): ScreenAction["type"] {
    const lower = action.toLowerCase();
    if (lower.includes("create") || lower.includes("add") || lower.includes("new")) return "create";
    if (lower.includes("delete") || lower.includes("remove")) return "delete";
    if (lower.includes("edit") || lower.includes("update")) return "edit";
    if (lower.includes("search") || lower.includes("find")) return "search";
    if (lower.includes("filter") || lower.includes("sort")) return "filter";
    if (lower.includes("toggle") || lower.includes("switch")) return "toggle";
    if (lower.includes("submit") || lower.includes("save")) return "submit";
    return "navigate";
  }

  private extractScreens(feature: FeatureSpec): ScreenSpec[] {
    const screens: ScreenSpec[] = [];
    const frontend = (feature as any).frontend_surfaces?.[0];
    const intent = ((feature as any).description || "").toLowerCase();

    if (frontend?.screens) {
      for (const screen of frontend.screens) {
        screens.push({
          screen_id: screen.screen_id || `screen-${screens.length + 1}`,
          name: screen.name || `Screen ${screens.length + 1}`,
          route: screen.route,
          type: screen.type || "page",
          description: screen.description || "",
          actions: (screen.actions || []).map((a: any) => ({
            label: a.label || "Action",
            type: a.type || "navigate",
            target: a.target,
            requires_confirmation: a.destructive || false,
            destructive: a.destructive || false,
          })),
          data_requirements: screen.data_requirements || [],
        });
      }
    }

    // Infer screens from acceptance criteria if none defined
    if (screens.length === 0 && feature.acceptance_criteria) {
      for (const ac of feature.acceptance_criteria) {
        const desc = ac.description.toLowerCase();
        if (desc.includes("view") || desc.includes("display") || desc.includes("show") || desc.includes("page") || desc.includes("screen")) {
          screens.push({
            screen_id: `screen-${ac.id}`,
            name: `${ac.description.slice(0, 50)}`,
            type: "page",
            description: ac.description,
            actions: [],
            data_requirements: [],
          });
        }
      }
    }

    // Infer from intent
    if (screens.length === 0) {
      if (intent.includes("list") || intent.includes("dashboard")) {
        screens.push({
          screen_id: "screen-list",
          name: "List View",
          type: "page",
          description: `List view for ${feature.feature_id}`,
          actions: [
            { label: "Create", type: "create", requires_confirmation: false, destructive: false },
            { label: "Filter", type: "filter", requires_confirmation: false, destructive: false },
          ],
          data_requirements: ["list_data"],
        });
      }
      if (intent.includes("detail") || intent.includes("edit") || intent.includes("update")) {
        screens.push({
          screen_id: "screen-detail",
          name: "Detail View",
          type: "page",
          description: `Detail/edit view for ${feature.feature_id}`,
          actions: [
            { label: "Save", type: "submit", requires_confirmation: false, destructive: false },
            { label: "Delete", type: "delete", requires_confirmation: true, destructive: true },
          ],
          data_requirements: ["item_data"],
        });
      }
      if (intent.includes("create") || intent.includes("new") || intent.includes("add")) {
        screens.push({
          screen_id: "screen-create",
          name: "Create Form",
          type: "modal",
          description: `Create form for ${feature.feature_id}`,
          actions: [
            { label: "Submit", type: "submit", requires_confirmation: false, destructive: false },
            { label: "Cancel", type: "navigate", requires_confirmation: false, destructive: false },
          ],
          data_requirements: [],
        });
      }
      if (intent.includes("settings") || intent.includes("config") || intent.includes("preferences")) {
        screens.push({
          screen_id: "screen-settings",
          name: "Settings",
          type: "page",
          description: `Settings for ${feature.feature_id}`,
          actions: [
            { label: "Save", type: "submit", requires_confirmation: false, destructive: false },
          ],
          data_requirements: ["current_settings"],
        });
      }
    }

    return screens;
  }

  private extractJourneys(feature: FeatureSpec, screens: ScreenSpec[]): UserJourney[] {
    const journeys: UserJourney[] = [];

    if (screens.length > 0) {
      // Happy path: navigate through all screens
      const happyPath: JourneyStep[] = screens.map((screen, i) => ({
        step: i + 1,
        screen: screen.screen_id,
        action: screen.actions[0]?.label || "View",
        expected_result: `${screen.name} displays correctly`,
      }));

      journeys.push({
        journey_id: `journey-happy-${feature.feature_id}`,
        name: "Happy Path",
        steps: happyPath,
        happy_path: true,
      });

      // Error path: try action on empty state
      journeys.push({
        journey_id: `journey-error-${feature.feature_id}`,
        name: "Error / Empty State Path",
        steps: [
          { step: 1, screen: screens[0]!.screen_id, action: "Load with no data", expected_result: "Empty state displayed" },
          { step: 2, screen: screens[0]!.screen_id, action: "Submit invalid input", expected_result: "Validation error shown" },
        ],
        happy_path: false,
      });
    }

    return journeys;
  }

  private extractStates(screens: ScreenSpec[]): UiStateSpec[] {
    const states: UiStateSpec[] = [];

    for (const screen of screens) {
      // Every screen needs these states
      states.push(
        { state_type: "loading", screen_id: screen.screen_id, description: `Loading state for ${screen.name}` },
        { state_type: "empty", screen_id: screen.screen_id, description: `No data state for ${screen.name}`, user_action: "Create first item" },
        { state_type: "error", screen_id: screen.screen_id, description: `Error state for ${screen.name}`, user_action: "Retry or go back" },
      );

      // Delete confirmation
      if (screen.actions.some(a => a.destructive)) {
        states.push({
          state_type: "disabled",
          screen_id: screen.screen_id,
          description: `Confirmation dialog before destructive action on ${screen.name}`,
        });
      }
    }

    return states;
  }

  private inferLayout(feature: FeatureSpec, screens: ScreenSpec[]): LayoutSpec {
    const intent = ((feature as any).description || "").toLowerCase();

    let type: LayoutSpec["type"] = "list";
    let navigation: LayoutSpec["navigation"] = "none";

    if (intent.includes("dashboard")) type = "dashboard";
    else if (intent.includes("wizard") || intent.includes("onboarding")) type = "wizard";
    else if (intent.includes("settings") || intent.includes("config")) type = "settings";
    else if (intent.includes("detail") || intent.includes("profile")) type = "detail";
    else if (intent.includes("form") || intent.includes("create")) type = "form";
    else if (screens.length > 2) type = "split";

    if (screens.length > 3) navigation = "sidebar";
    else if (screens.length > 1) navigation = "tabs";

    return { type, navigation, responsive: true };
  }
}
