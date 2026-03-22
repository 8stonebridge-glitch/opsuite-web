/**
 * AES Bridge Layer — Bridge Compiler
 *
 * Compiles orchestrator-selected truth and scoped execution intent into the
 * single bridge contract that a builder will later consume.
 */

import { ArtifactRegistry, generateArtifactId } from "../registry";
import type {
  ArtifactRef,
  Bridge,
  ConfidenceBreakdown,
  DependencyType,
  GraphSnapshot,
  StoredRecord,
  AcceptanceCriterion,
  ApiContract,
  ComponentBoundary,
  DbTouch,
  EventDefinition,
  ScopeDefinition,
  TestCase,
  TieredConstraint,
} from "../types";
import { computeConfidence } from "../types";
import { buildSystemContext, serializeContextForBridge } from "./system-context-provider";

export interface CompileBridgeInput {
  build_id: string;
  feature_id: string;
  graph_snapshot: Pick<
    GraphSnapshot,
    "graph_snapshot_id" | "graph_truth_hash" | "feature_id"
  >;
  intent: string;
  scope: ScopeDefinition;
  out_of_scope?: string[];
  constraints?: string[];
  patterns?: string[];
  anti_patterns?: string[];
  data_model?: Record<string, unknown>;
  api_contracts?: ApiContract[];
  events?: EventDefinition[];
  db_touches?: DbTouch[];
  component_boundaries?: ComponentBoundary[];
  read_scope: ScopeDefinition;
  write_scope: ScopeDefinition;
  read_scope_amendments?: string[];
  depends_on_bridge_ids?: string[];
  predecessor_build_ids?: string[];
  dependency_type?: DependencyType;
  acceptance_criteria?: AcceptanceCriterion[];
  test_cases?: TestCase[];
  confidence_breakdown: ConfidenceBreakdown;
  tiered_constraints?: TieredConstraint[];
  artifact_refs: ArtifactRef[];
}

export class BridgeCompiler {
  constructor(
    private readonly registry: ArtifactRegistry,
    private readonly now: () => Date = () => new Date()
  ) {}

  async compile(input: CompileBridgeInput): Promise<StoredRecord<Bridge>> {
    // Inject system context into data_model so the builder knows
    // what database tables, API routes, and types already exist.
    // The feature_type hint (if extractable from intent) produces
    // feature-specific storage and API notes.
    const featureType = input.data_model?.["feature_type"] as string | undefined;
    const systemContext = buildSystemContext(featureType);
    const serializedContext = serializeContextForBridge(systemContext);

    const enrichedDataModel = {
      ...(input.data_model ?? {}),
      system_context: serializedContext,
    };

    const bridge: Bridge = {
      bridge_id: generateArtifactId("bridge"),
      build_id: input.build_id,
      feature_id: input.feature_id,
      generated_at: this.now().toISOString(),
      graph_snapshot_id: input.graph_snapshot.graph_snapshot_id,
      graph_truth_hash: input.graph_snapshot.graph_truth_hash,
      bridge_version: 1,
      intent: input.intent,
      scope: input.scope,
      out_of_scope: input.out_of_scope ?? [],
      constraints: input.constraints ?? [],
      tiered_constraints: input.tiered_constraints,
      patterns: input.patterns ?? [],
      anti_patterns: input.anti_patterns ?? [],
      data_model: enrichedDataModel,
      api_contracts: input.api_contracts ?? [],
      events: input.events ?? [],
      db_touches: input.db_touches ?? [],
      component_boundaries: input.component_boundaries ?? [],
      read_scope: input.read_scope,
      write_scope: input.write_scope,
      read_scope_amendments: input.read_scope_amendments ?? [],
      depends_on_bridge_ids: input.depends_on_bridge_ids ?? [],
      predecessor_build_ids: input.predecessor_build_ids ?? [],
      dependency_type: input.dependency_type ?? "NONE",
      acceptance_criteria: input.acceptance_criteria ?? [],
      test_cases: input.test_cases ?? [],
      confidence: computeConfidence(input.confidence_breakdown),
      confidence_breakdown: input.confidence_breakdown,
      artifact_refs: input.artifact_refs,
      status: "DRAFT",
    };

    return this.registry.write("bridge", bridge);
  }
}
